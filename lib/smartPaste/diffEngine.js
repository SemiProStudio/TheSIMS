// ============================================================================
// Smart Paste — Diff Engine
// Compare new parse results against existing item specs
// ============================================================================

/**
 * Compare new parse results against existing item specs.
 * Returns a diff summary for each field.
 * @param {Object} existingSpecs - Current spec values { specName: value }
 * @param {Map} newFields - New parse result fields Map
 * @returns {Array<{specName, status, oldValue, newValue, confidence}>}
 */
export function diffSpecs(existingSpecs, newFields) {
  const diff = [];
  const allKeys = new Set([
    ...Object.keys(existingSpecs || {}),
    ...(newFields ? [...newFields.keys()] : []),
  ]);

  for (const specName of allKeys) {
    const oldVal = existingSpecs?.[specName] || '';
    const newField = newFields?.get(specName);
    const newVal = newField?.value || '';
    const confidence = newField?.confidence || 0;

    if (!oldVal && newVal) {
      diff.push({ specName, status: 'added', oldValue: '', newValue: newVal, confidence });
    } else if (oldVal && !newVal) {
      diff.push({ specName, status: 'removed', oldValue: oldVal, newValue: '', confidence });
    } else if (oldVal && newVal && oldVal.toLowerCase().trim() !== newVal.toLowerCase().trim()) {
      diff.push({ specName, status: 'changed', oldValue: oldVal, newValue: newVal, confidence });
    } else if (oldVal && newVal) {
      diff.push({ specName, status: 'unchanged', oldValue: oldVal, newValue: newVal, confidence });
    }
  }

  // Sort: changed first, then added, then unchanged, then removed
  const statusOrder = { changed: 0, added: 1, unchanged: 2, removed: 3 };
  diff.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

  return diff;
}
