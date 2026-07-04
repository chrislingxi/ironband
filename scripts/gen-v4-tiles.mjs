import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const W = 256;
const H = 128;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function inDiamond(x, y) {
  const dx = Math.abs(x - W / 2) / (W / 2);
  const dy = Math.abs(y - H / 2) / (H / 2);
  return dx + dy <= 1;
}

function distToEdge(x, y) {
  const dx = Math.abs(x - W / 2) / (W / 2);
  const dy = Math.abs(y - H / 2) / (H / 2);
  return 1 - (dx + dy);
}

function lineDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, c1 / c2));
  const x = ax + t * vx;
  const y = ay + t * vy;
  return Math.hypot(px - x, py - y);
}

function tile(theme) {
  const rng = mulberry32(theme.seed);
  const pixels = Buffer.alloc(W * H * 4);
  const cracks = theme.cracks;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!inDiamond(x + 0.5, y + 0.5)) {
        pixels[i + 3] = 0;
        continue;
      }
      const edge = Math.max(0, distToEdge(x, y));
      const shade = 0.72 + edge * 0.28 + (rng() - 0.5) * 0.1;
      const grain = Math.sin(x * 0.19 + y * 0.37) * 0.06 + Math.sin(x * 0.07 - y * 0.23) * 0.05;
      const base = theme.base;
      let r = mix(base[0], theme.light[0], Math.max(0, grain + 0.12)) * shade;
      let g = mix(base[1], theme.light[1], Math.max(0, grain + 0.12)) * shade;
      let b = mix(base[2], theme.light[2], Math.max(0, grain + 0.12)) * shade;
      for (const c of cracks) {
        const d = lineDistance(x, y, c[0], c[1], c[2], c[3]);
        if (d < c[4]) {
          const t = 1 - d / c[4];
          r = mix(r, c[5][0], t * c[6]);
          g = mix(g, c[5][1], t * c[6]);
          b = mix(b, c[5][2], t * c[6]);
        }
      }
      if (edge < 0.035) {
        r = mix(r, theme.edge[0], 0.75);
        g = mix(g, theme.edge[1], 0.75);
        b = mix(b, theme.edge[2], 0.75);
      }
      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
      pixels[i + 3] = 255;
    }
  }
  return png(W, H, pixels);
}

const themes = {
  hell: {
    seed: 0x1badf00d,
    base: [44, 17, 13],
    light: [112, 35, 20],
    edge: [16, 5, 4],
    cracks: [
      [38, 79, 212, 48, 3.8, [232, 72, 28], 0.82],
      [72, 93, 182, 83, 2.8, [155, 26, 14], 0.78],
      [88, 38, 162, 61, 2.2, [255, 111, 46], 0.52],
      [128, 64, 198, 95, 2.4, [94, 15, 11], 0.7],
    ],
  },
  snow: {
    seed: 0x5a09c01d,
    base: [79, 95, 106],
    light: [164, 186, 198],
    edge: [48, 58, 68],
    cracks: [
      [34, 82, 212, 56, 2.8, [222, 247, 255], 0.58],
      [72, 49, 168, 42, 2.2, [38, 50, 62], 0.5],
      [96, 92, 190, 83, 2.4, [196, 228, 240], 0.48],
      [117, 28, 138, 100, 1.8, [41, 57, 68], 0.46],
    ],
  },
};

for (const [name, theme] of Object.entries(themes)) {
  const data = tile(theme);
  for (const prefix of ['public/assets/tile', 'assets/tile']) {
    const out = join(ROOT, prefix, `${name}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
  }
}

console.log('Generated V4 tiles: hell.png, snow.png');
