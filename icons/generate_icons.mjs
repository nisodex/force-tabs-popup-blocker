import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    let c = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      c ^= body[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function drawTabIcon(x, y, w, h) {
  const cx = x / w;
  const cy = y / h;

  // Blue background with rounded corners
  const radius = 0.2;
  const inBox = (cx >= 0.05 && cx <= 0.95 && cy >= 0.05 && cy <= 0.95);
  
  // Icon shape: browser tab + arrow
  // Tab frame: top rect + main body
  const inTab = (cx >= 0.15 && cx <= 0.85 && cy >= 0.2 && cy <= 0.8);
  const inTabHeader = (cx >= 0.15 && cx <= 0.55 && cy >= 0.2 && cy <= 0.35);
  const inTabBody = (cx >= 0.15 && cx <= 0.85 && cy >= 0.35 && cy <= 0.8);

  // Plus sign / Arrow pointing up-right into tab
  const inArrowDiag = (Math.abs(cx - cy) < 0.08 && cx >= 0.35 && cx <= 0.65 && cy >= 0.45 && cy <= 0.7);
  const inArrowHeadH = (cy >= 0.43 && cy <= 0.51 && cx >= 0.52 && cx <= 0.68);
  const inArrowHeadV = (cx >= 0.60 && cx <= 0.68 && cy >= 0.43 && cy <= 0.59);

  if (inTabHeader || inTabBody) {
    if (inArrowDiag || inArrowHeadH || inArrowHeadV) {
      return [37, 99, 235, 255]; // Primary Blue arrow
    }
    return [255, 255, 255, 255]; // White tab
  }

  if (inBox) {
    return [37, 99, 235, 255]; // Primary Blue icon background
  }

  return [0, 0, 0, 0];
}

const iconsDir = path.resolve('icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const buf = createPng(size, size, drawTabIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`Generated icon${size}.png`);
}
