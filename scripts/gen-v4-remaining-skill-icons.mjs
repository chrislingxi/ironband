import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const W = 256;
const H = 256;

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

function blend(buf, x, y, color, alpha = color[3]) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H || alpha <= 0) return;
  const i = (y * W + x) * 4;
  const sa = Math.max(0, Math.min(255, alpha)) / 255;
  const da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  buf[i] = Math.round((color[0] * sa + buf[i] * da * (1 - sa)) / oa);
  buf[i + 1] = Math.round((color[1] * sa + buf[i + 1] * da * (1 - sa)) / oa);
  buf[i + 2] = Math.round((color[2] * sa + buf[i + 2] * da * (1 - sa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

function ellipse(buf, cx, cy, rx, ry, color, soft = 0.08) {
  const minX = Math.floor(cx - rx * 1.1), maxX = Math.ceil(cx + rx * 1.1);
  const minY = Math.floor(cy - ry * 1.1), maxY = Math.ceil(cy + ry * 1.1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 + soft) blend(buf, x, y, color, color[3] * Math.max(0, Math.min(1, (1 + soft - d) / soft)));
    }
  }
}

function poly(buf, points, color) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs)), maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0], yi = points[i][1], xj = points[j][0], yj = points[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) blend(buf, x, y, color, color[3]);
    }
  }
}

function stroke(buf, points, width, color) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.1));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      ellipse(buf, ax + (bx - ax) * t, ay + (by - ay) * t, width, width, color, 0.22);
    }
  }
}

function arc(buf, cx, cy, r, a0, a1, width, color) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const t = a0 + (a1 - a0) * (i / 80);
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  stroke(buf, pts, width, color);
}

function base(accent = [70, 150, 210]) {
  const b = Buffer.alloc(W * H * 4);
  ellipse(b, 128, 132, 112, 112, [6, 6, 9, 238], 0.05);
  ellipse(b, 128, 132, 101, 101, [22, 20, 19, 255], 0.04);
  ellipse(b, 91, 75, 58, 36, [92, 70, 43, 72], 0.22);
  ellipse(b, 128, 132, 85, 85, [accent[0], accent[1], accent[2], 32], 0.2);
  arc(b, 128, 132, 109, Math.PI * 0.06, Math.PI * 1.94, 4, [199, 147, 61, 230]);
  arc(b, 128, 132, 92, Math.PI * 0.12, Math.PI * 1.88, 2, [73, 49, 23, 210]);
  return b;
}

function arrow(buf, x, y, len, angle, color, head = color) {
  const dx = Math.cos(angle), dy = Math.sin(angle), px = -dy, py = dx;
  stroke(buf, [[x - dx * len * 0.48, y - dy * len * 0.48], [x + dx * len * 0.36, y + dy * len * 0.36]], 5, color);
  const tx = x + dx * len * 0.52, ty = y + dy * len * 0.52;
  poly(buf, [[tx, ty], [tx - dx * 34 + px * 12, ty - dy * 34 + py * 12], [tx - dx * 21, ty - dy * 21], [tx - dx * 34 - px * 12, ty - dy * 34 - py * 12]], head);
}

function spear(buf, x, y, len, angle, color) {
  const dx = Math.cos(angle), dy = Math.sin(angle), px = -dy, py = dx;
  stroke(buf, [[x - dx * len * 0.42, y - dy * len * 0.42], [x + dx * len * 0.35, y + dy * len * 0.35]], 7, [93, 57, 29, 255]);
  const tx = x + dx * len * 0.53, ty = y + dy * len * 0.53;
  poly(buf, [[tx, ty], [tx - dx * 42 + px * 15, ty - dy * 42 + py * 15], [tx - dx * 18, ty - dy * 18], [tx - dx * 42 - px * 15, ty - dy * 42 - py * 15]], color);
}

function rune(buf, cx, cy, color) {
  stroke(buf, [[cx - 18, cy - 43], [cx + 17, cy - 8], [cx - 9, cy + 9], [cx + 24, cy + 43]], 5, color);
  stroke(buf, [[cx - 34, cy - 2], [cx + 29, cy - 2]], 4, color);
}

function bolt(buf, cx, cy, color) {
  poly(buf, [[cx - 2, cy - 68], [cx + 28, cy - 18], [cx + 5, cy - 18], [cx + 27, cy + 60], [cx - 31, cy - 4], [cx - 9, cy - 3]], color);
}

function wall(buf, cx, cy) {
  for (let i = 0; i < 5; i++) {
    const x = cx - 66 + i * 33;
    poly(buf, [[x, cy - 52], [x + 30, cy - 44], [x + 28, cy + 54], [x - 6, cy + 47]], [111, 42, 21, 235]);
    ellipse(buf, x + 15, cy - 45, 22, 28, [236, 91, 29, 125], 0.22);
  }
}

function eye(buf, cx, cy, color) {
  ellipse(buf, cx, cy, 58, 31, [16, 15, 18, 245], 0.06);
  ellipse(buf, cx, cy, 52, 22, [220, 198, 140, 210], 0.12);
  ellipse(buf, cx, cy, 20, 20, color, 0.12);
  ellipse(buf, cx, cy, 8, 8, [5, 5, 8, 245], 0.12);
}

function wing(buf, cx, cy, flip, color) {
  poly(buf, [[cx, cy], [cx + flip * 52, cy - 54], [cx + flip * 72, cy - 10], [cx + flip * 28, cy + 54]], color);
  stroke(buf, [[cx, cy], [cx + flip * 52, cy - 54]], 4, [235, 220, 164, 130]);
}

function draw(spec) {
  const b = base(spec.accent);
  const gold = [226, 170, 66, 255];
  const steel = [213, 208, 184, 255];
  const blue = [90, 187, 255, 225];
  const green = [105, 218, 94, 220];
  const red = [224, 70, 34, 230];
  switch (spec.id) {
    case 'inner_sight': eye(b, 128, 126, [117, 214, 255, 235]); rune(b, 128, 139, [111, 211, 255, 160]); break;
    case 'critical_strike': arrow(b, 126, 137, 124, -Math.PI / 6, steel, gold); ellipse(b, 170, 87, 22, 22, red, 0.1); break;
    case 'dodge': wing(b, 111, 128, -1, [162, 174, 180, 215]); wing(b, 142, 128, 1, [210, 202, 160, 210]); stroke(b, [[87, 175], [129, 144], [170, 178]], 8, gold); break;
    case 'slow_missiles': arrow(b, 132, 126, 111, -Math.PI / 8, [152, 176, 180, 205], [115, 212, 255, 220]); for (let i = 0; i < 4; i++) ellipse(b, 70 + i * 35, 173 - i * 4, 9, 9, blue, 0.2); break;
    case 'penetrate': arrow(b, 125, 132, 130, -Math.PI / 7, steel, gold); stroke(b, [[73, 114], [181, 141]], 5, [94, 71, 40, 230]); stroke(b, [[77, 151], [187, 112]], 5, [94, 71, 40, 230]); break;
    case 'evade': stroke(b, [[80, 169], [119, 121], [157, 171]], 8, [218, 200, 146, 225]); for (let i = 0; i < 3; i++) arc(b, 128, 130, 39 + i * 20, Math.PI * 1.1, Math.PI * 1.72, 4, [102, 202, 255, 115]); break;
    case 'jab': spear(b, 126, 130, 142, -Math.PI / 5, steel); stroke(b, [[82, 161], [118, 144], [154, 126]], 4, gold); break;
    case 'power_strike': spear(b, 124, 133, 138, -Math.PI / 5, steel); bolt(b, 153, 126, [242, 220, 80, 205]); break;
    case 'poison_javelin': spear(b, 124, 134, 136, -Math.PI / 5, [183, 235, 136, 255]); for (let i = 0; i < 8; i++) ellipse(b, 80 + i * 13, 94 + (i % 3) * 13, 8, 8, green, 0.22); break;
    case 'lightning_bolt': spear(b, 120, 135, 128, -Math.PI / 4, steel); bolt(b, 145, 124, [101, 206, 255, 230]); bolt(b, 107, 149, [240, 221, 75, 180]); break;
    case 'charged_strike': spear(b, 125, 136, 132, -Math.PI / 5, steel); for (let i = 0; i < 5; i++) ellipse(b, 92 + i * 18, 91 + (i % 2) * 25, 11, 11, blue, 0.15); break;
    case 'plague_javelin': spear(b, 124, 134, 136, -Math.PI / 5, [187, 228, 112, 255]); ellipse(b, 130, 126, 61, 44, [76, 170, 69, 105], 0.26); for (let i = 0; i < 7; i++) ellipse(b, 86 + i * 15, 155 + (i % 2) * 13, 8, 8, [170, 245, 99, 190], 0.2); break;
    case 'lightning_fury': spear(b, 123, 134, 138, -Math.PI / 5, steel); for (let i = 0; i < 5; i++) bolt(b, 80 + i * 24, 112 + (i % 2) * 22, [111, 215, 255, 165]); break;
    case 'fire_wall': wall(b, 128, 134); arc(b, 128, 142, 70, Math.PI * 1.08, Math.PI * 1.92, 7, [255, 125, 42, 170]); break;
    case 'enchant': arrow(b, 125, 139, 108, -Math.PI / 5, steel, [255, 196, 82, 255]); rune(b, 126, 121, [255, 117, 44, 200]); break;
    case 'nova': for (let i = 0; i < 10; i++) { const a = i * Math.PI * 0.2; bolt(b, 128 + Math.cos(a) * 50, 132 + Math.sin(a) * 50, [119, 211, 255, 145]); } ellipse(b, 128, 132, 22, 22, blue, 0.12); break;
    case 'lightning': bolt(b, 128, 132, [106, 207, 255, 245]); bolt(b, 95, 146, [238, 221, 88, 180]); bolt(b, 162, 113, [238, 221, 88, 160]); break;
    case 'chain_lightning': for (let i = 0; i < 4; i++) ellipse(b, 72 + i * 38, 153 - (i % 2) * 48, 15, 15, blue, 0.15); stroke(b, [[72, 153], [110, 105], [148, 153], [186, 105]], 6, [121, 218, 255, 220]); break;
    case 'teleport': ellipse(b, 128, 132, 58, 73, [68, 52, 146, 135], 0.22); arc(b, 128, 132, 70, Math.PI * 0.14, Math.PI * 1.86, 7, [144, 111, 255, 195]); rune(b, 128, 131, [204, 179, 255, 210]); break;
    case 'thunder_storm': arc(b, 128, 132, 70, Math.PI * 0.1, Math.PI * 1.96, 8, [115, 216, 255, 200]); bolt(b, 128, 122, [244, 225, 86, 225]); for (let i = 0; i < 5; i++) ellipse(b, 77 + i * 25, 82 + (i % 2) * 7, 21, 10, [55, 69, 85, 225], 0.2); break;
  }
  ellipse(b, 128, 128, 111, 111, [0, 0, 0, 36], 0.02);
  return b;
}

const icons = [
  { id: 'inner_sight', accent: [83, 188, 220] },
  { id: 'critical_strike', accent: [214, 68, 42] },
  { id: 'dodge', accent: [192, 170, 101] },
  { id: 'slow_missiles', accent: [84, 166, 188] },
  { id: 'penetrate', accent: [210, 158, 64] },
  { id: 'evade', accent: [104, 178, 210] },
  { id: 'jab', accent: [185, 160, 86] },
  { id: 'power_strike', accent: [225, 205, 70] },
  { id: 'poison_javelin', accent: [93, 184, 75] },
  { id: 'lightning_bolt', accent: [92, 190, 238] },
  { id: 'charged_strike', accent: [102, 200, 255] },
  { id: 'plague_javelin', accent: [105, 190, 72] },
  { id: 'lightning_fury', accent: [115, 211, 255] },
  { id: 'fire_wall', accent: [232, 77, 29] },
  { id: 'enchant', accent: [237, 100, 42] },
  { id: 'nova', accent: [102, 203, 255] },
  { id: 'lightning', accent: [100, 207, 255] },
  { id: 'chain_lightning', accent: [116, 216, 255] },
  { id: 'teleport', accent: [135, 98, 246] },
  { id: 'thunder_storm', accent: [90, 182, 218] },
];

for (const spec of icons) {
  const data = png(W, H, draw(spec));
  for (const prefix of ['public/assets/icon', 'assets/icon']) {
    const out = join(ROOT, prefix, `skill-${spec.id.replaceAll('_', '-')}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
  }
}

console.log(`Generated V4 remaining skill icons: ${icons.map((i) => i.id).join(', ')}`);
