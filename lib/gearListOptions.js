// =============================================================================
// Gear list filter/sort configuration. Lives outside GearList.jsx so the
// view file exports only the component (React fast refresh requirement).
// =============================================================================

// Sentinel for the Kits entry in the category filter — kits are excluded from
// normal browsing (their contents are the individual items) but must stay
// discoverable somewhere. Underscored so a real category can't collide.
export const KITS_FILTER = '__kits__';

export const SORT_OPTIONS = [
  { value: 'default', label: 'Category (default)' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'id-asc', label: 'ID' },
  { value: 'brand-asc', label: 'Brand' },
  { value: 'value-desc', label: 'Value: high to low' },
  { value: 'value-asc', label: 'Value: low to high' },
];

export function sortItems(items, sortBy) {
  if (!sortBy || sortBy === 'default') return items;
  const sorted = [...items];
  const val = (i) => i.currentValue || i.purchasePrice || 0;
  switch (sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'name-desc':
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'id-asc':
      sorted.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      break;
    case 'brand-asc':
      sorted.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
      break;
    case 'value-desc':
      sorted.sort((a, b) => val(b) - val(a));
      break;
    case 'value-asc':
      sorted.sort((a, b) => val(a) - val(b));
      break;
    default:
      break;
  }
  return sorted;
}
