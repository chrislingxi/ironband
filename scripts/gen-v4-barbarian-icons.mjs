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
  x = Math.round(x);
  y = Math.round(y);
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
  const minX = Math.floor(cx - rx * 1.1);
  const maxX = Math.ceil(cx + rx * 1.1);
  const minY = Math.floor(cy - ry * 1.1);
  const maxY = Math.ceil(cy + ry * 1.1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 + soft) {
        const a = color[3] * Math.max(0, Math.min(1, (1 + soft - d) / soft));
        blend(buf, x, y, color, a);
      }
    }
  }
}

function poly(buf, points, color) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
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
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      ellipse(buf, ax + (bx - ax) * t, ay + (by - ay) * t, width, width, color, 0.22);
    }
  }
}

function arc(buf, cx, cy, r, a0, a1, width, color) {
  const steps = 72;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = a0 + (a1 - a0) * (i / steps);
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  stroke(buf, pts, width, color);
}

function iconBase(accent = [196, 58, 28]) {
  const b = Buffer.alloc(W * H * 4);
  ellipse(b, 128, 132, 112, 112, [7, 6, 8, 235], 0.05);
  ellipse(b, 128, 132, 101, 101, [28, 22, 18, 255], 0.04);
  ellipse(b, 94, 76, 55, 36, [90, 72, 44, 70], 0.22);
  ellipse(b, 128, 132, 86, 86, [accent[0], accent[1], accent[2], 26], 0.2);
  arc(b, 128, 132, 109, Math.PI * 0.06, Math.PI * 1.94, 4, [199, 147, 61, 230]);
  arc(b, 128, 132, 92, Math.PI * 0.12, Math.PI * 1.88, 2, [73, 49, 23, 210]);
  return b;
}

function blade(buf, x, y, len, angle, color = [218, 205, 170, 255]) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const px = -dy, py = dx;
  const tip = [x + dx * len, y + dy * len];
  const base = [x - dx * len * 0.25, y - dy * len * 0.25];
  poly(buf, [
    [base[0] + px * 9, base[1] + py * 9],
    [tip[0], tip[1]],
    [base[0] - px * 9, base[1] - py * 9],
    [x + px * 3, y + py * 3],
  ], color);
  stroke(buf, [[base[0], base[1]], [tip[0], tip[1]]], 2, [255, 241, 190, 150]);
}

function handle(buf, x, y, len, angle) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  stroke(buf, [[x - dx * len * 0.55, y - dy * len * 0.55], [x + dx * len * 0.55, y + dy * len * 0.55]], 7, [82, 42, 24, 255]);
  stroke(buf, [[x - dx * len * 0.15, y - dy * len * 0.15], [x + dx * len * 0.15, y + dy * len * 0.15]], 8, [180, 126, 54, 210]);
}

function shield(buf, cx, cy, color) {
  poly(buf, [[cx, cy - 64], [cx + 52, cy - 38], [cx + 42, cy + 40], [cx, cy + 78], [cx - 42, cy + 40], [cx - 52, cy - 38]], [26, 24, 25, 255]);
  poly(buf, [[cx, cy - 52], [cx + 39, cy - 31], [cx + 31, cy + 31], [cx, cy + 62], [cx - 31, cy + 31], [cx - 39, cy - 31]], color);
  stroke(buf, [[cx, cy - 47], [cx, cy + 55]], 4, [255, 220, 125, 125]);
}

function rune(buf, cx, cy, color) {
  stroke(buf, [[cx - 18, cy - 42], [cx + 16, cy - 9], [cx - 8, cy + 8], [cx + 24, cy + 44]], 6, color);
  stroke(buf, [[cx - 34, cy - 2], [cx + 28, cy - 2]], 4, color);
}

function shock(buf, cx, cy, color) {
  poly(buf, [[cx - 5, cy - 66], [cx + 24, cy - 15], [cx + 5, cy - 15], [cx + 24, cy + 56], [cx - 32, cy - 3], [cx - 10, cy - 2]], color);
}

function icon(kind) {
  const b = iconBase(kind.accent);
  const gold = [222, 166, 65, 255];
  const steel = [205, 199, 178, 255];
  const red = [219, 47, 28, 230];
  switch (kind.id) {
    case 'concentrate':
      shield(b, 128, 128, [62, 55, 47, 255]);
      blade(b, 108, 154, 70, -Math.PI / 3, steel);
      shock(b, 147, 112, [239, 184, 69, 210]);
      break;
    case 'frenzy':
      blade(b, 92, 160, 76, -Math.PI / 4, steel);
      blade(b, 164, 160, 76, -Math.PI * 0.75, steel);
      arc(b, 128, 132, 74, Math.PI * 0.08, Math.PI * 1.68, 6, red);
      break;
    case 'whirlwind':
      arc(b, 128, 128, 72, Math.PI * 0.2, Math.PI * 1.82, 9, [184, 199, 202, 210]);
      arc(b, 128, 128, 46, Math.PI * 1.25, Math.PI * 2.42, 7, [235, 167, 64, 210]);
      blade(b, 128, 128, 64, -Math.PI / 5, steel);
      break;
    case 'berserk':
      ellipse(b, 128, 118, 38, 45, [95, 24, 19, 255], 0.08);
      poly(b, [[93, 92], [58, 44], [111, 72]], [198, 184, 136, 235]);
      poly(b, [[163, 92], [198, 44], [145, 72]], [198, 184, 136, 235]);
      ellipse(b, 112, 116, 8, 5, [255, 218, 80, 255], 0.08);
      ellipse(b, 144, 116, 8, 5, [255, 218, 80, 255], 0.08);
      stroke(b, [[102, 154], [128, 170], [154, 154]], 4, [255, 120, 74, 210]);
      break;
    case 'mace_mastery':
      handle(b, 124, 138, 130, -Math.PI / 4);
      ellipse(b, 82, 82, 31, 24, [146, 136, 120, 255], 0.05);
      ellipse(b, 82, 82, 20, 14, [219, 198, 138, 145], 0.08);
      break;
    case 'increased_stamina':
      shock(b, 112, 124, gold);
      stroke(b, [[70, 176], [109, 147], [142, 170], [188, 134]], 8, [219, 203, 156, 220]);
      ellipse(b, 88, 188, 13, 7, [190, 63, 29, 220], 0.15);
      ellipse(b, 180, 146, 13, 7, [190, 63, 29, 220], 0.15);
      break;
    case 'increased_speed':
      for (let i = 0; i < 4; i++) stroke(b, [[70, 88 + i * 24], [166, 70 + i * 12]], 5, [222, 205, 151, 160]);
      stroke(b, [[90, 174], [128, 134], [170, 174]], 9, [221, 161, 67, 230]);
      break;
    case 'iron_skin':
      shield(b, 128, 126, [80, 74, 68, 255]);
      stroke(b, [[85, 112], [171, 112]], 6, [193, 182, 156, 180]);
      stroke(b, [[92, 142], [164, 142]], 6, [193, 182, 156, 150]);
      break;
    case 'natural_resistance':
      shield(b, 128, 128, [48, 67, 61, 255]);
      for (let i = 0; i < 4; i++) rune(b, 94 + i * 23, 123 + (i % 2) * 12, [[98, 215, 149, 180], [219, 88, 56, 180], [105, 178, 255, 180], [236, 218, 116, 180]][i]);
      break;
    case 'weapon_block':
      blade(b, 91, 160, 86, -Math.PI / 4, steel);
      blade(b, 165, 160, 86, -Math.PI * 0.75, steel);
      shield(b, 128, 130, [56, 48, 43, 220]);
      break;
    case 'taunt':
      ellipse(b, 128, 116, 43, 48, [104, 31, 22, 255], 0.08);
      ellipse(b, 110, 115, 8, 6, [255, 196, 67, 255], 0.08);
      ellipse(b, 146, 115, 8, 6, [255, 196, 67, 255], 0.08);
      stroke(b, [[94, 70], [112, 88], [128, 68], [146, 88], [166, 70]], 5, [216, 182, 101, 210]);
      stroke(b, [[88, 158], [64, 174], [82, 190]], 5, red);
      break;
    case 'battle_cry':
      shock(b, 104, 132, [225, 69, 42, 220]);
      arc(b, 142, 128, 42, -Math.PI / 3, Math.PI / 3, 6, gold);
      arc(b, 154, 128, 66, -Math.PI / 3, Math.PI / 3, 5, [223, 188, 111, 170]);
      ellipse(b, 92, 128, 25, 31, [88, 39, 25, 250], 0.06);
      break;
    case 'battle_orders':
      handle(b, 126, 147, 110, Math.PI / 2);
      poly(b, [[126, 60], [176, 82], [126, 104]], [129, 34, 28, 255]);
      stroke(b, [[83, 170], [173, 170]], 6, gold);
      rune(b, 126, 120, [244, 214, 109, 210]);
      break;
    case 'battle_command':
      poly(b, [[128, 58], [150, 103], [198, 104], [160, 133], [175, 178], [128, 151], [81, 178], [96, 133], [58, 104], [106, 103]], gold);
      rune(b, 128, 130, [255, 240, 160, 190]);
      break;
  }
  ellipse(b, 128, 128, 111, 111, [0, 0, 0, 38], 0.02);
  return b;
}

const icons = [
  { id: 'concentrate', accent: [180, 128, 48] },
  { id: 'frenzy', accent: [220, 50, 28] },
  { id: 'whirlwind', accent: [160, 185, 190] },
  { id: 'berserk', accent: [222, 42, 26] },
  { id: 'mace_mastery', accent: [190, 144, 66] },
  { id: 'increased_stamina', accent: [195, 120, 42] },
  { id: 'increased_speed', accent: [190, 170, 92] },
  { id: 'iron_skin', accent: [132, 132, 126] },
  { id: 'natural_resistance', accent: [83, 157, 111] },
  { id: 'weapon_block', accent: [175, 150, 89] },
  { id: 'taunt', accent: [216, 60, 34] },
  { id: 'battle_cry', accent: [219, 58, 35] },
  { id: 'battle_orders', accent: [202, 142, 49] },
  { id: 'battle_command', accent: [224, 174, 58] },
];

for (const spec of icons) {
  const data = png(W, H, icon(spec));
  for (const prefix of ['public/assets/icon', 'assets/icon']) {
    const out = join(ROOT, prefix, `skill-${spec.id.replaceAll('_', '-')}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
  }
}

console.log(`Generated V4 barbarian skill icons: ${icons.map((i) => i.id).join(', ')}`);
