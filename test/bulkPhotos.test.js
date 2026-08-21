// =============================================================================
// Bulk Photos — filename → item matching
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  fileStem,
  stripSequenceSuffix,
  matchPhotosToItems,
  planForRow,
  runWithConcurrency,
} from '../lib/bulkPhotos.js';

const f = (name, size = 1000) => ({ name, size });

const items = [
  { id: 'CAM-00012', name: 'Sony FX6', serialNumber: 'SN-FX6-001', image: null },
  { id: 'CAM-00013', name: 'Sony A7S III', serialNumber: '  sn-a7s-77 ', image: 'https://x/old.jpg' },
  { id: 'LE1001', name: 'Sony 24-70', serialNumber: '', image: null },
];

describe('fileStem', () => {
  it('drops the extension, path and case', () => {
    expect(fileStem('CAM-00012.JPG')).toBe('cam-00012');
    expect(fileStem('photos/CAM-00012.heic')).toBe('cam-00012');
    expect(fileStem('C:\\shoot\\LE1001.png')).toBe('le1001');
  });

  it('collapses whitespace but keeps inner punctuation', () => {
    expect(fileStem('  SN-FX6-001   copy.jpg ')).toBe('sn-fx6-001 copy');
    expect(fileStem('no-extension')).toBe('no-extension');
  });
});

describe('stripSequenceSuffix', () => {
  it('removes one trailing copy/sequence marker', () => {
    expect(stripSequenceSuffix('cam-00012-2')).toBe('cam-00012');
    expect(stripSequenceSuffix('cam-00012_2')).toBe('cam-00012');
    expect(stripSequenceSuffix('cam-00012 (2)')).toBe('cam-00012');
    expect(stripSequenceSuffix('cam-00012 2')).toBe('cam-00012');
  });
});

describe('matchPhotosToItems', () => {
  it('matches by item ID (case-insensitive) and by serial number', () => {
    const rows = matchPhotosToItems([f('cam-00012.jpg'), f('SN-A7S-77.png')], items);
    const byName = Object.fromEntries(rows.map((r) => [r.file.name, r]));
    expect(byName['cam-00012.jpg']).toMatchObject({ item: { id: 'CAM-00012' }, matchedBy: 'id' });
    expect(byName['SN-A7S-77.png']).toMatchObject({ item: { id: 'CAM-00013' }, matchedBy: 'serial' });
  });

  it('orders rows by filename with numeric awareness', () => {
    const rows = matchPhotosToItems([f('LE1001.jpg'), f('CAM-00013.jpg'), f('CAM-00012.jpg')], items);
    expect(rows.map((r) => r.file.name)).toEqual(['CAM-00012.jpg', 'CAM-00013.jpg', 'LE1001.jpg']);
  });

  it('marks unmatched files', () => {
    const [row] = matchPhotosToItems([f('IMG_4021.jpg')], items);
    expect(row).toMatchObject({ item: null, matchedBy: null, duplicateOf: null });
  });

  it('the exact-stem file claims the item; suffixed copies become duplicates', () => {
    const rows = matchPhotosToItems(
      [f('CAM-00012-2.jpg'), f('CAM-00012.jpg'), f('cam-00012 (3).jpg')],
      items,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.file.name, r]));
    expect(byName['CAM-00012.jpg']).toMatchObject({ item: { id: 'CAM-00012' }, duplicateOf: null });
    expect(byName['CAM-00012-2.jpg']).toMatchObject({
      item: { id: 'CAM-00012' },
      duplicateOf: 'CAM-00012.jpg',
    });
    expect(byName['cam-00012 (3).jpg']).toMatchObject({
      item: { id: 'CAM-00012' },
      duplicateOf: 'CAM-00012.jpg',
    });
  });

  it('with only suffixed copies, the first by filename claims the item', () => {
    const rows = matchPhotosToItems([f('CAM-00012-2.jpg'), f('CAM-00012-1.jpg')], items);
    expect(rows[0].file.name).toBe('CAM-00012-1.jpg');
    expect(rows[0].duplicateOf).toBeNull();
    expect(rows[1].duplicateOf).toBe('CAM-00012-1.jpg');
  });

  it('only strips a sequence suffix when the full stem matched nothing', () => {
    // An ID that itself ends in "-2" style digits must match directly
    const withDashId = [...items, { id: 'KIT-2', name: 'Kit two', image: null }];
    const [row] = matchPhotosToItems([f('KIT-2.jpg')], withDashId);
    expect(row.item.id).toBe('KIT-2');
  });

  it('ignores empty serial numbers', () => {
    const [row] = matchPhotosToItems([f('.jpg')], items);
    expect(row.item).toBeNull();
  });
});

describe('planForRow', () => {
  const matched = (image) => ({ item: { id: 'X', image }, duplicateOf: null });

  it('uploads to items without a photo', () => {
    expect(planForRow(matched(null), { replaceExisting: false })).toBe('upload');
  });

  it('replaces or skips existing photos per the option', () => {
    expect(planForRow(matched('https://x/a.jpg'), { replaceExisting: true })).toBe('replace');
    expect(planForRow(matched('https://x/a.jpg'), { replaceExisting: false })).toBe('skip-existing');
  });

  it('flags duplicates and unmatched rows', () => {
    expect(planForRow({ item: { id: 'X' }, duplicateOf: 'a.jpg' }, { replaceExisting: true })).toBe(
      'duplicate',
    );
    expect(planForRow({ item: null }, { replaceExisting: true })).toBe('unmatched');
  });
});

describe('runWithConcurrency', () => {
  it('processes every row with at most N in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const worker = vi.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], worker, { concurrency: 3 });
    expect(worker).toHaveBeenCalledTimes(7);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it('stops starting new rows once shouldStop reports true', async () => {
    let started = 0;
    const worker = vi.fn(async () => {
      started++;
      await new Promise((r) => setTimeout(r, 1));
    });
    await runWithConcurrency([1, 2, 3, 4, 5, 6], worker, {
      concurrency: 1,
      shouldStop: () => started >= 2,
    });
    expect(worker).toHaveBeenCalledTimes(2);
  });
});
