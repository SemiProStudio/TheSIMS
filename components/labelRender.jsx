// ============================================================================
// Label print/export HTML rendering. Kept out of ItemLabel.jsx so that file
// exports only the component (React fast refresh requirement).
// ============================================================================

import { ItemLabel } from './ItemLabel.jsx';

/**
 * Render print/export HTML for a set of labels. React escapes all item data,
 * so this path is XSS-safe by construction (the print window shares the app
 * origin). The server renderer is imported lazily to keep it out of the
 * initial Labels chunk.
 */
export async function renderLabelsHTML({
  items,
  format,
  user,
  isKit = false,
  isPackage = false,
  getContainedItems = () => [],
  qrDataURLs = [],
}) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  return items
    .map((item, idx) =>
      renderToStaticMarkup(
        <ItemLabel
          item={item}
          format={format}
          user={user}
          isKit={isKit}
          isPackage={isPackage}
          containedItems={isKit || isPackage ? getContainedItems(item, isPackage) : []}
          ppi={96}
          qrDataURL={qrDataURLs[idx]}
        />,
      ),
    )
    .join('');
}
