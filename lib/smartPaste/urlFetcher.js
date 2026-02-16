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

  let response;
  try {
    response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (networkErr) {
    throw new Error(
      'Network error connecting to proxy. Check your internet connection and Supabase configuration.'
    );
  }

  if (!response.ok) {
    // Try to extract a meaningful error message from the response body
    let detail = '';
    try {
      const errBody = await response.json();
      detail = errBody.error || errBody.message || '';
    } catch { /* response isn't JSON */ }

    if (response.status === 404) {
      throw new Error(
        'URL import proxy not found. The fetch-product-page Edge Function may not be deployed.'
      );
    }
    if (response.status === 403 && detail) {
      throw new Error(detail);
    }
    throw new Error(detail || `Proxy returned ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.text || '',
    html: data.html || '',
    sourceUrl: url,
  };
}
