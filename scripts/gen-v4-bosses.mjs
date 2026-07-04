import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const W = 768;
const H = 768;

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

function ellipse(buf, cx, cy, rx, ry, color, soft = 0.05) {
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
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      ellipse(buf, ax + (bx - ax) * t, ay + (by - ay) * t, width, width, color, 0.22);
    }
  }
}

function glow(buf, cx, cy, rx, ry, color) {
  for (let k = 7; k >= 1; k--) {
    ellipse(buf, cx, cy, rx * k * 0.14, ry * k * 0.14, [color[0], color[1], color[2], Math.floor(color[3] / (k * 7.5))], 0.34);
  }
}

function claws(buf, x, y, dir, color) {
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * 18;
    poly(buf, [[x, y + off], [x + dir * 86, y + off - 10], [x + dir * 34, y + off + 24]], color);
  }
}

function makeMephisto() {
  const b = Buffer.alloc(W * H * 4);
  glow(b, 384, 348, 185, 205, [120, 72, 255, 70]);
  ellipse(b, 384, 510, 190, 82, [0, 0, 0, 90], 0.2);
  stroke(b, [[222, 520], [155, 420], [138, 300], [186, 190]], 24, [71, 45, 135, 230]);
  stroke(b, [[546, 520], [614, 420], [630, 300], [582, 190]], 24, [71, 45, 135, 230]);
  poly(b, [[384, 160], [500, 300], [475, 540], [384, 640], [293, 540], [268, 300]], [53, 35, 86, 255]);
  ellipse(b, 384, 288, 118, 92, [93, 66, 156, 255], 0.08);
  poly(b, [[286, 206], [160, 78], [330, 166]], [34, 22, 55, 240]);
  poly(b, [[482, 206], [608, 78], [438, 166]], [34, 22, 55, 240]);
  ellipse(b, 340, 286, 20, 12, [197, 165, 255, 255], 0.1);
  ellipse(b, 428, 286, 20, 12, [197, 165, 255, 255], 0.1);
  stroke(b, [[384, 344], [336, 420], [302, 520]], 9, [178, 139, 255, 160]);
  stroke(b, [[384, 344], [430, 420], [466, 520]], 9, [178, 139, 255, 160]);
  claws(b, 162, 418, -1, [178, 139, 255, 220]);
  claws(b, 606, 418, 1, [178, 139, 255, 220]);
  return b;
}

function makeDiablo() {
  const b = Buffer.alloc(W * H * 4);
  glow(b, 384, 368, 198, 220, [255, 64, 28, 74]);
  ellipse(b, 384, 536, 210, 88, [0, 0, 0, 95], 0.2);
  stroke(b, [[246, 470], [162, 358], [150, 245]], 32, [103, 18, 15, 255]);
  stroke(b, [[522, 470], [606, 358], [618, 245]], 32, [103, 18, 15, 255]);
  poly(b, [[384, 126], [505, 282], [490, 566], [384, 666], [278, 566], [263, 282]], [91, 15, 12, 255]);
  ellipse(b, 384, 294, 126, 104, [151, 32, 22, 255], 0.08);
  poly(b, [[307, 205], [195, 54], [345, 155]], [35, 9, 7, 255]);
  poly(b, [[461, 205], [573, 54], [423, 155]], [35, 9, 7, 255]);
  poly(b, [[254, 340], [126, 280], [228, 438]], [73, 14, 12, 230]);
  poly(b, [[514, 340], [642, 280], [540, 438]], [73, 14, 12, 230]);
  ellipse(b, 338, 294, 22, 13, [255, 213, 90, 255], 0.1);
  ellipse(b, 430, 294, 22, 13, [255, 213, 90, 255], 0.1);
  stroke(b, [[384, 356], [326, 430], [292, 534]], 11, [255, 91, 35, 170]);
  stroke(b, [[384, 356], [444, 430], [482, 534]], 11, [255, 91, 35, 170]);
  stroke(b, [[310, 598], [232, 682], [190, 722]], 18, [103, 18, 15, 240]);
  stroke(b, [[458, 598], [536, 682], [578, 722]], 18, [103, 18, 15, 240]);
  claws(b, 120, 360, -1, [255, 194, 100, 235]);
  claws(b, 648, 360, 1, [255, 194, 100, 235]);
  return b;
}

function makeBaal() {
  const b = Buffer.alloc(W * H * 4);
  glow(b, 384, 370, 205, 230, [104, 220, 111, 72]);
  ellipse(b, 384, 548, 225, 86, [0, 0, 0, 95], 0.2);
  stroke(b, [[220, 512], [146, 390], [170, 260], [232, 188]], 26, [47, 83, 48, 240]);
  stroke(b, [[548, 512], [622, 390], [598, 260], [536, 188]], 26, [47, 83, 48, 240]);
  poly(b, [[384, 120], [524, 286], [500, 572], [384, 692], [268, 572], [244, 286]], [43, 63, 41, 255]);
  ellipse(b, 384, 292, 126, 98, [80, 115, 68, 255], 0.08);
  poly(b, [[282, 210], [260, 82], [352, 170]], [162, 195, 116, 220]);
  poly(b, [[486, 210], [508, 82], [416, 170]], [162, 195, 116, 220]);
  poly(b, [[334, 150], [384, 56], [434, 150]], [120, 164, 91, 230]);
  ellipse(b, 340, 292, 19, 12, [202, 255, 142, 255], 0.1);
  ellipse(b, 428, 292, 19, 12, [202, 255, 142, 255], 0.1);
  stroke(b, [[384, 350], [308, 442], [244, 528]], 10, [162, 255, 135, 165]);
  stroke(b, [[384, 350], [462, 442], [526, 528]], 10, [162, 255, 135, 165]);
  stroke(b, [[292, 604], [210, 666], [162, 712]], 15, [47, 83, 48, 230]);
  stroke(b, [[476, 604], [558, 666], [606, 712]], 15, [47, 83, 48, 230]);
  claws(b, 146, 404, -1, [196, 238, 152, 220]);
  claws(b, 622, 404, 1, [196, 238, 152, 220]);
  return b;
}

const bosses = {
  mephisto: makeMephisto,
  diablo: makeDiablo,
  baal: makeBaal,
};

for (const [name, render] of Object.entries(bosses)) {
  const data = png(W, H, render());
  for (const prefix of ['public/assets/mon', 'assets/mon']) {
    const out = join(ROOT, prefix, `${name}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
  }
}

console.log('Generated V4 bosses: mephisto.png, diablo.png, baal.png');
