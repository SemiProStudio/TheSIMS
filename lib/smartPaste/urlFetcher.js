// ============================================================================
// Smart Paste — URL Fetcher
// Fetch product page content via CORS proxy
// ============================================================================

/**
 * Fetch product page content via a CORS proxy.
 * @param {string} url - The product page URL
 * @param {string} proxyUrl - The Supabase Edge Function URL
 * @returns {Promise<{text: string, html: string, sourceUrl: string}>}
 */
export async function fetchProductPage(url, proxyUrl) {
  if (!proxyUrl) {
    throw new Error(
      'URL import requires a CORS proxy. Set up the fetch-product-page Edge Function and provide its URL.'
    );
  }
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return {
    text: data.text || '',
    html: data.html || '',
    sourceUrl: url,
  };
}
