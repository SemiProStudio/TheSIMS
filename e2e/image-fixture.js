// =============================================================================
// E2E image fixture — a real PNG of any size, generated in Node
// Lets specs feed the image pipeline a genuinely large photo (e.g. 2400×1600)
// through setInputFiles without checking binary fixtures into the repo.
// =============================================================================

import { deflateSync } from 'node:zlib';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

/**
 * Build an RGBA PNG with a diagonal gradient and a contrasting block, so a
 * downscaled copy is visibly "the same picture" and compresses to a realistic
 * size rather than a flat colour.
 * @returns {Buffer}
 */
export function makeTestPng(width, height, { alpha = 255 } = {}) {
  const row = width * 4 + 1;
  const raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) {
    raw[y * row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const o = y * row + 1 + x * 4;
      const inBlock = x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7;
      raw[o] = inBlock ? 220 : (x * 255) / width;
      raw[o + 1] = inBlock ? 60 : (y * 255) / height;
      raw[o + 2] = inBlock ? 40 : 128;
      raw[o + 3] = alpha;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A setInputFiles payload for makeTestPng */
export function testPngFile(name, width, height, opts) {
  return { name, mimeType: 'image/png', buffer: makeTestPng(width, height, opts) };
}
