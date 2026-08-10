// =============================================================================
// Fetch Product Page Edge Function
// CORS proxy for Smart Paste URL import — fetches a product page and extracts
// text content suitable for the spec parser.
// =============================================================================

import { corsHeaders, jsonResponse, errorResponse } from '../_shared/utils.ts';

// Allowed domains (optional safety measure — remove to allow any URL)
const ALLOWED_DOMAINS = [
  'bhphotovideo.com', 'adorama.com', 'usa.canon.com', 'sony.com',
  'nikon.com', 'panasonic.com', 'blackmagicdesign.com', 'dji.com',
  'sennheiser.com', 'rode.com', 'aputure.com', 'godox.com',
  'manfrotto.com', 'atomos.com', 'smallhd.com', 'teradek.com',
  'smallrig.com', 'tilta.com', 'profoto.com',
  'amazon.com', 'www.amazon.com',
  'bhphoto.com',
];

// Max page size to prevent abuse (5MB)
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;

// Timeout for fetch (10s)
const FETCH_TIMEOUT_MS = 10_000;

// Max redirects to follow (each hop is re-validated against the allowlist)
const MAX_REDIRECTS = 5;

/**
 * Validate a URL against protocol, allowlist, and private-address rules.
 * Returns an error message, or null if the URL is acceptable.
 * Applied to the initial URL AND every redirect hop — `redirect: 'follow'`
 * would otherwise let an allowlisted page redirect the fetch to internal
 * addresses (cloud metadata, private services) and return the body (SSRF).
 */
function validateTargetUrl(parsedUrl: URL): string | null {
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return 'Only HTTP/HTTPS URLs are supported';
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Reject IP literals and internal-looking hostnames outright
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const isIpv6 = hostname.includes(':') || hostname.startsWith('[');
  if (
    isIpv4 ||
    isIpv6 ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return 'Direct IP and internal addresses are not allowed';
  }

  if (ALLOWED_DOMAINS.length > 0) {
    const bare = hostname.replace(/^www\./, '');
    const isAllowed = ALLOWED_DOMAINS.some((d) => bare === d || bare.endsWith('.' + d));
    if (!isAllowed) {
      return (
        `Domain "${parsedUrl.hostname}" is not in the allowed list. ` +
        `Contact your admin to add it, or paste the page content manually.`
      );
    }
  }

  return null;
}

/**
 * Fetch with manual redirect handling: every hop is validated before it is
 * followed, so a redirect cannot escape the allowlist.
 */
async function fetchWithValidatedRedirects(
  startUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(currentUrl, {
      signal,
      headers,
      redirect: 'manual',
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      return response;
    }

    // Discard the redirect body before following
    await response.body?.cancel();

    const nextUrl = new URL(location, currentUrl);
    const validationError = validateTargetUrl(nextUrl);
    if (validationError) {
      throw new Error(`Blocked redirect to ${nextUrl.hostname}: ${validationError}`);
    }
    currentUrl = nextUrl.toString();
  }

  throw new Error(`Too many redirects (limit ${MAX_REDIRECTS})`);
}

/**
 * Strip HTML tags and extract readable text from an HTML document.
 * Preserves table structure as tab-separated values for the parser.
 */
function htmlToText(html: string): string {
  let text = html;

  // Remove script, style, nav, footer, header tags and their content
  text = text.replace(/<(script|style|nav|footer|header|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Convert table cells to tab-separated
  text = text.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, (_, content) => {
    return content.replace(/<[^>]+>/g, '').trim() + '\t';
  });

  // Convert table rows to newlines
  text = text.replace(/<\/tr>/gi, '\n');

  // Convert <br>, <p>, <div>, <li>, headings to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');

  // Convert <dt>/<dd> to key: value format
  text = text.replace(/<dt[^>]*>([\s\S]*?)<\/dt>/gi, (_, content) => {
    return content.replace(/<[^>]+>/g, '').trim() + ': ';
  });
  text = text.replace(/<dd[^>]*>([\s\S]*?)<\/dd>/gi, (_, content) => {
    return content.replace(/<[^>]+>/g, '').trim() + '\n';
  });

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  text = text.replace(/&[a-z]+;/gi, ' ');

  // Collapse whitespace but preserve newlines and tabs
  text = text.replace(/[^\S\n\t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\s+|\s+$/gm, '');

  return text.trim();
}

/**
 * Try to extract structured spec data from common product page patterns.
 * Looks for JSON-LD, Open Graph, and common spec table structures.
 */
function extractStructuredData(html: string): string {
  const chunks: string[] = [];

  // Extract JSON-LD product data
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const product = data['@type'] === 'Product' ? data : data['@graph']?.find((n: any) => n['@type'] === 'Product');
      if (product) {
        if (product.name) chunks.push(`Product Name: ${product.name}`);
        if (product.brand?.name) chunks.push(`Brand: ${product.brand.name}`);
        if (product.description) chunks.push(`Description: ${product.description}`);
        if (product.sku) chunks.push(`SKU: ${product.sku}`);
        if (product.model) chunks.push(`Model: ${product.model}`);
        if (product.weight?.value) chunks.push(`Weight: ${product.weight.value} ${product.weight.unitText || ''}`);
        if (product.offers?.price) chunks.push(`Price: $${product.offers.price}`);
        // Extract additionalProperty specs
        if (Array.isArray(product.additionalProperty)) {
          for (const prop of product.additionalProperty) {
            if (prop.name && prop.value) {
              chunks.push(`${prop.name}: ${prop.value}`);
            }
          }
        }
      }
    } catch { /* not valid JSON-LD */ }
  }

  // Extract Open Graph meta tags
  const ogMatches = html.matchAll(/<meta[^>]*property="og:([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi);
  for (const match of ogMatches) {
    const [, prop, content] = match;
    if (prop === 'title' && content) chunks.push(`Product Name: ${content}`);
    if (prop === 'description' && content) chunks.push(`Description: ${content}`);
  }

  if (chunks.length > 0) {
    return chunks.join('\n') + '\n\n---\n\n';
  }
  return '';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return errorResponse('Missing or invalid "url" parameter');
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return errorResponse('Invalid URL format');
    }

    // Validate protocol, allowlist, and private-address rules
    const validationError = validateTargetUrl(parsedUrl);
    if (validationError) {
      return errorResponse(validationError, 403);
    }

    // Header strategies — try progressively simpler headers if blocked
    const headerStrategies = [
      // Strategy 1: Full modern browser headers
      {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      // Strategy 2: Minimal headers with Googlebot-compatible UA
      {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // Strategy 3: Bare-minimum fetch (some sites whitelist simple requests)
      {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
        'Accept': '*/*',
      },
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;
    let lastStatus = 0;

    for (const headers of headerStrategies) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        response = await fetchWithValidatedRedirects(url, headers, controller.signal);
      } catch (err) {
        lastError = err;
        continue;
      } finally {
        clearTimeout(timeout);
      }

      // If we got a successful response, break out
      if (response.ok) break;

      // If blocked (403/429), try the next strategy
      lastStatus = response.status;
      if (response.status === 403 || response.status === 429) {
        response = null;
        continue;
      }

      // For other error statuses, don't retry
      break;
    }

    // Handle cases where all strategies failed
    if (!response) {
      if (lastError) {
        if (lastError.name === 'AbortError') {
          return errorResponse('Request timed out (10s limit)', 504);
        }
        return errorResponse(`Failed to connect to ${parsedUrl.hostname}: ${lastError.message}`, 502);
      }
      if (lastStatus === 403 || lastStatus === 429) {
        const hostname = parsedUrl.hostname;
        return errorResponse(
          `${hostname} blocked the request (HTTP ${lastStatus}). ` +
          `This site has bot protection that prevents server-side fetching. ` +
          `Try copying the page content and using the Paste tab instead.`,
          422
        );
      }
      return errorResponse('All fetch strategies failed', 502);
    }

    if (!response.ok) {
      // Return 422 for client-actionable remote errors, 502 for true proxy failures
      const remoteStatus = response.status;
      if (remoteStatus >= 400 && remoteStatus < 500) {
        return errorResponse(
          `${parsedUrl.hostname} returned ${remoteStatus} ${response.statusText}. ` +
          `Try copying the page content and using the Paste tab instead.`,
          422
        );
      }
      return errorResponse(
        `${parsedUrl.hostname} returned ${remoteStatus} ${response.statusText}`,
        502
      );
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return errorResponse(`Expected HTML but got ${contentType}`, 415);
    }

    // Check content length
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > MAX_CONTENT_LENGTH) {
      return errorResponse(`Page too large (${(contentLength / 1024 / 1024).toFixed(1)}MB, max 5MB)`, 413);
    }

    const html = await response.text();
    if (html.length > MAX_CONTENT_LENGTH) {
      return errorResponse('Page content exceeds 5MB limit', 413);
    }

    // Extract structured data first, then fall back to full text
    const structured = extractStructuredData(html);
    const plainText = htmlToText(html);

    return jsonResponse({
      text: structured + plainText,
      html: html.slice(0, 500_000), // Truncate raw HTML to 500KB
      sourceUrl: url,
      structured: structured.length > 0,
      textLength: plainText.length,
    });
  } catch (err) {
    console.error('fetch-product-page error:', err);
    return errorResponse(`Internal error: ${err.message}`, 500);
  }
});
