// =============================================================================
// Bulk Photos — filename → item matching
// Pure helpers for the Bulk Photos admin flow: a dropped folder of photos is
// matched to inventory items by filename stem (item ID first, then serial
// number). DOM-free so it unit-tests directly.
// =============================================================================

/** "CAM-00012.JPG" → "cam-00012"; " My Photo (1).heic " → "my photo (1)" */
export function fileStem(name) {
  const base = String(name || '')
    .split(/[\\/]/)
    .pop();
  const stem = base.replace(/\.[^.]+$/, '');
  return stem.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Drop one trailing copy/sequence suffix: "cam-00012-2", "cam-00012_2",
 * "cam-00012 (2)", "cam-00012 2" → "cam-00012". Only used when the full stem
 * matched nothing, and the result must itself match — IDs contain digits
 * after dashes, so this is never applied blindly.
 */
export function stripSequenceSuffix(stem) {
  return stem.replace(/(?:[\s_-]+|\s*)\(?\d{1,3}\)?$/, '').trim();
}

/**
 * Match files to items.
 * @param {File[]} files
 * @param {Array<{id: string, serialNumber?: string, image?: string|null}>} items
 * @returns {Array<{file: File, stem: string, item: object|null, matchedBy: 'id'|'serial'|null, duplicateOf: string|null}>}
 *   Rows are ordered by filename. When several files match the same item, the
 *   first keeps it and later ones carry `duplicateOf` = that filename.
 */
export function matchPhotosToItems(files, items) {
  const byId = new Map();
  const bySerial = new Map();
  for (const item of items || []) {
    if (item?.id) byId.set(String(item.id).toLowerCase(), item);
    const serial = item?.serialNumber && String(item.serialNumber).trim().toLowerCase();
    if (serial) bySerial.set(serial, item);
  }

  const lookup = (stem) => {
    if (byId.has(stem)) return { item: byId.get(stem), matchedBy: 'id' };
    if (bySerial.has(stem)) return { item: bySerial.get(stem), matchedBy: 'serial' };
    return null;
  };

  const sorted = [...(files || [])].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), undefined, { numeric: true }),
  );

  // Resolve every file first, remembering whether it matched on its exact
  // stem or only after dropping a copy suffix
  const resolved = sorted.map((file) => {
    const stem = fileStem(file.name);
    let hit = lookup(stem);
    let exact = true;
    if (!hit) {
      const stripped = stripSequenceSuffix(stem);
      if (stripped && stripped !== stem) {
        hit = lookup(stripped);
        exact = false;
      }
    }
    return { file, stem, hit, exact };
  });

  // Exact-stem files claim their item first, so "CAM-00012.jpg" always beats
  // "CAM-00012-2.jpg" no matter how the filenames sort
  const claimed = new Map(); // item id → filename that claimed it
  for (const pass of [true, false]) {
    for (const r of resolved) {
      if (r.hit && r.exact === pass && !claimed.has(r.hit.item.id)) {
        claimed.set(r.hit.item.id, r.file.name);
      }
    }
  }

  return resolved.map(({ file, stem, hit }) => {
    if (!hit) return { file, stem, item: null, matchedBy: null, duplicateOf: null };
    const owner = claimed.get(hit.item.id);
    return {
      file,
      stem,
      item: hit.item,
      matchedBy: hit.matchedBy,
      duplicateOf: owner === file.name ? null : owner,
    };
  });
}

/**
 * Decide what each matched row will do.
 * @returns {'upload'|'replace'|'skip-existing'|'duplicate'|'unmatched'}
 */
export function planForRow(row, { replaceExisting }) {
  if (!row.item) return 'unmatched';
  if (row.duplicateOf) return 'duplicate';
  if (row.item.image) return replaceExisting ? 'replace' : 'skip-existing';
  return 'upload';
}

/**
 * Run `worker(row)` over rows with at most `concurrency` in flight.
 * `shouldStop()` is consulted before each start so a cancel drains quickly.
 */
export async function runWithConcurrency(rows, worker, { concurrency = 3, shouldStop } = {}) {
  let next = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < rows.length) {
      if (shouldStop?.()) return;
      const row = rows[next++];
      await worker(row);
    }
  });
  await Promise.all(runners);
}
