import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1); raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function canvas(size) {
  const data = Buffer.alloc(size * size * 4);
  return { size, data };
}
function blend(c, x, y, color) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.size || y >= c.size || color[3] <= 0) return;
  const i = (y * c.size + x) * 4;
  const sa = color[3] / 255, da = c.data[i + 3] / 255, oa = sa + da * (1 - sa);
  if (!oa) return;
  for (let k = 0; k < 3; k++) c.data[i + k] = Math.round((color[k] * sa + c.data[i + k] * da * (1 - sa)) / oa);
  c.data[i + 3] = Math.round(oa * 255);
}
function rect(c, x0, y0, x1, y1, color) {
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) blend(c, x, y, color);
}
function ellipse(c, cx, cy, rx, ry, color, soft = 0.08) {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 + soft) blend(c, x, y, [...color.slice(0, 3), color[3] * Math.max(0, Math.min(1, (1 + soft - d) / soft))]);
    }
  }
}
function line(c, ax, ay, bx, by, width, color) {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ellipse(c, ax + (bx - ax) * t, ay + (by - ay) * t, width, width, color, 0.18);
  }
}
function polygon(c, points, color) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) blend(c, x, y, color);
    }
  }
}
function ring(c, cx, cy, r, width, color) {
  for (let a = 0; a < Math.PI * 2; a += 0.008) ellipse(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, width, width, color, 0.2);
}
function metalSlot(accent, equipped = false) {
  const c = canvas(128);
  rect(c, 7, 7, 120, 120, [7, 6, 6, 238]);
  rect(c, 12, 12, 115, 115, [24, 20, 17, 246]);
  ellipse(c, 52, 42, 54, 42, [70, 50, 30, 42], 0.3);
  rect(c, 18, 18, 109, 109, [6, 7, 9, 176]);
  for (let i = 0; i < 4; i++) {
    const inset = 7 + i * 3;
    line(c, inset, inset, 127 - inset, inset, 1.1, [...accent, 225 - i * 38]);
    line(c, inset, 127 - inset, 127 - inset, 127 - inset, 1.1, [...accent, 116 - i * 18]);
  }
  const corners = [[11,11],[117,11],[11,117],[117,117]];
  for (const [x,y] of corners) ellipse(c, x, y, equipped ? 6 : 4, equipped ? 6 : 4, [...accent, 238], 0.12);
  if (equipped) ring(c, 64, 64, 49, 2.2, [...accent, 150]);
  return c;
}
function cooldownMask() {
  const c = canvas(256);
  ellipse(c, 128, 128, 116, 116, [2, 3, 5, 204], 0.02);
  polygon(c, [[128,128],[128,8],[220,45],[128,128]], [3, 4, 7, 224]);
  ring(c, 128, 128, 114, 3, [118, 94, 55, 180]);
  ring(c, 128, 128, 105, 1.2, [218, 186, 119, 72]);
  return c;
}
function statusBase(accent) {
  const c = canvas(128);
  ellipse(c, 64, 64, 57, 57, [5, 6, 7, 246], 0.03);
  ellipse(c, 64, 64, 49, 49, [...accent, 42], 0.16);
  ring(c, 64, 64, 55, 2.2, [94, 74, 44, 235]);
  ring(c, 64, 64, 49, 1, [...accent, 128]);
  return c;
}
function status(kind) {
  const palette = { burn:[232,93,35], freeze:[100,202,242], poison:[118,183,72], bleed:[185,37,31] };
  const a = palette[kind], c = statusBase(a);
  if (kind === 'burn') {
    polygon(c, [[64,101],[40,75],[50,47],[62,62],[69,24],[88,53],[84,82]], [...a,245]);
    polygon(c, [[65,91],[55,74],[65,53],[75,72]], [255,205,93,245]);
    for (let i = 0; i < 6; i++) ellipse(c, 36 + i * 11, 37 - (i % 2) * 7, 5, 3, [45,39,37,150], 0.3);
  } else if (kind === 'freeze') {
    for (let i = 0; i < 6; i++) { const a0 = i * Math.PI / 3; line(c,64,64,64+Math.cos(a0)*38,64+Math.sin(a0)*38,2.5,[198,242,255,245]); }
    for (let i = 0; i < 5; i++) line(c,29+i*15,96-i*12,54+i*11,71-i*8,1.4,[77,145,201,210]);
    ellipse(c, 64, 64, 10, 10, [235,252,255,245], 0.1);
  } else if (kind === 'poison') {
    ellipse(c, 64, 70, 27, 34, [...a,225], 0.12);
    ellipse(c, 54, 60, 8, 9, [199,238,103,225], 0.14);
    ellipse(c, 76, 78, 6, 7, [52,92,39,220], 0.14);
    for (let i = 0; i < 5; i++) ellipse(c, 39+i*13, 34+(i%2)*9, 5+i%2, 5+i%2, [175,226,91,190], 0.18);
  } else {
    polygon(c, [[64,101],[42,70],[48,43],[64,22],[80,43],[86,70]], [...a,242]);
    line(c, 29, 93, 96, 34, 4, [239,186,139,240]);
    line(c, 33, 98, 100, 39, 1.5, [85,16,14,245]);
  }
  return c;
}
function writeAsset(path, c) {
  const data = png(c.size, c.size, c.data);
  for (const root of ['assets', 'public/assets']) {
    const out = join(ROOT, root, path); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, data);
  }
}

writeAsset('ui/item_slot.png', metalSlot([91,78,61]));
writeAsset('ui/item_slot_equipped.png', metalSlot([204,157,68], true));
for (const [name, color] of Object.entries({ common:[105,105,101], magic:[74,124,194], rare:[220,179,63], unique:[190,102,48] })) writeAsset(`ui/rarity_${name}.png`, metalSlot(color, name !== 'common'));
writeAsset('ui/cooldown_mask.png', cooldownMask());
for (const name of ['burn','freeze','poison','bleed']) writeAsset(`icon/status_${name}.png`, status(name));

console.log('Generated V4 UI kit: slots, rarity frames, cooldown mask, status icons');
