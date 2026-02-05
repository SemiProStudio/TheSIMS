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
];

// Max page size to prevent abuse (5MB)
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;

// Timeout for fetch (10s)
const FETCH_TIMEOUT_MS = 10_000;

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

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return errorResponse('Only HTTP/HTTPS URLs are supported');
    }

    // Check domain allowlist (if configured)
    if (ALLOWED_DOMAINS.length > 0) {
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
      if (!isAllowed) {
        return errorResponse(
          `Domain "${parsedUrl.hostname}" is not in the allowed list. ` +
          `Contact your admin to add it, or paste the page content manually.`,
          403
        );
      }
    }

    // Fetch the page with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SIMS-SmartPaste/1.0 (Product Spec Importer)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        return errorResponse('Request timed out (10s limit)', 504);
      }
      return errorResponse(`Failed to fetch URL: ${err.message}`, 502);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return errorResponse(`Remote server returned ${response.status} ${response.statusText}`, 502);
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
