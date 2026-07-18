#!/usr/bin/env node
// Generates the PWA icons (PNG) without any native image dependency:
// pixels are drawn in a buffer and encoded as PNG via node:zlib.
// Design: dark navy rounded square, emerald ascending bars + trend dot.

import { writeFile, mkdir } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(root, "public", "icons");

/* ------------------------------------------------------------- PNG enc -- */

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines, each prefixed with filter byte 0
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------- drawing -- */

function drawIcon(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4);
  const put = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };

  const bgTop = [17, 24, 39];    // slate-900
  const bgBot = [11, 15, 26];    // app background
  const emerald = [16, 185, 129];
  const emeraldDim = [5, 150, 105];
  const sky = [56, 189, 248];

  const radius = maskable ? 0 : Math.round(size * 0.18);
  const inCorner = (x, y) => {
    if (radius === 0) return false;
    const cx = x < radius ? radius : x >= size - radius ? size - radius - 1 : -1;
    const cy = y < radius ? radius : y >= size - radius ? size - radius - 1 : -1;
    if (cx === -1 || cy === -1) return false;
    return (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2;
  };

  // Background with vertical gradient; transparent outside rounded corners.
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const col = bgTop.map((c, i) => Math.round(c + (bgBot[i] - c) * t));
    for (let x = 0; x < size; x++) {
      if (!inCorner(x, y)) put(x, y, col);
    }
  }

  // Ascending bars. Maskable icons need ~20% safe-zone padding.
  const pad = maskable ? 0.26 : 0.2;
  const left = size * pad;
  const right = size * (1 - pad);
  const bottom = size * (1 - pad);
  const top = size * pad;
  const nBars = 4;
  const gap = (right - left) * 0.12;
  const barW = ((right - left) - gap * (nBars - 1)) / nBars;
  const heights = [0.35, 0.55, 0.45, 0.9];

  heights.forEach((h, i) => {
    const x0 = Math.round(left + i * (barW + gap));
    const x1 = Math.round(x0 + barW);
    const y0 = Math.round(bottom - (bottom - top) * h);
    const col = i === nBars - 1 ? emerald : emeraldDim;
    for (let y = y0; y <= bottom; y++) {
      for (let x = x0; x < x1; x++) {
        if (!inCorner(x, y)) put(x, y, col);
      }
    }
  });

  // Trend dot above the tallest bar (the "bottleneck found" marker).
  const dotR = Math.max(3, Math.round(size * 0.045));
  const dotX = Math.round(left + 3 * (barW + gap) + barW / 2);
  const dotY = Math.round(bottom - (bottom - top) * 0.9 - dotR * 2.2);
  for (let y = dotY - dotR; y <= dotY + dotR; y++) {
    for (let x = dotX - dotR; x <= dotX + dotR; x++) {
      if ((x - dotX) ** 2 + (y - dotY) ** 2 <= dotR ** 2) put(x, y, sky);
    }
  }

  return encodePNG(size, size, px);
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#111827"/>
  <rect x="13" y="36" width="7" height="15" fill="#059669"/>
  <rect x="23" y="30" width="7" height="21" fill="#059669"/>
  <rect x="33" y="33" width="7" height="18" fill="#059669"/>
  <rect x="43" y="19" width="7" height="32" fill="#10b981"/>
  <circle cx="46.5" cy="14" r="3.5" fill="#38bdf8"/>
</svg>
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, "icon-192.png"), drawIcon(192, { maskable: false }));
await writeFile(path.join(OUT_DIR, "icon-512.png"), drawIcon(512, { maskable: false }));
await writeFile(path.join(OUT_DIR, "maskable-512.png"), drawIcon(512, { maskable: true }));
await writeFile(path.join(OUT_DIR, "favicon.svg"), FAVICON_SVG);
console.log(`Icons written to ${OUT_DIR}`);
