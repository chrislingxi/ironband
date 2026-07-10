import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

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

function encodePng(width, height, rgba) {
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

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodeRgbPng(path) {
  const data = readFileSync(path);
  const signature = data.subarray(0, 8);
  if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`Unsupported texture source: ${path}`);
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  for (let offset = 8; offset < data.length;) {
    const size = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const body = data.subarray(offset + 8, offset + 8 + size);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    offset += size + 12;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Expected 8-bit RGB/RGBA PNG source at ${path}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const packed = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * channels);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = packed[src++];
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const raw = packed[src++];
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y > 0 ? pixels[row + x - stride] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[row + x - stride - channels] : 0;
      if (filter === 0) pixels[row + x] = raw;
      else if (filter === 1) pixels[row + x] = (raw + left) & 255;
      else if (filter === 2) pixels[row + x] = (raw + up) & 255;
      else if (filter === 3) pixels[row + x] = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) pixels[row + x] = (raw + paeth(left, up, upperLeft)) & 255;
      else throw new Error(`Unsupported PNG filter ${filter} in ${path}`);
    }
  }
  return { width, height, channels, pixels };
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function sample(texture, u, v) {
  const x = clamp(u) * (texture.width - 1);
  const y = clamp(v) * (texture.height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(texture.width - 1, x0 + 1);
  const y1 = Math.min(texture.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const color = [0, 0, 0];
  for (let channel = 0; channel < 3; channel++) {
    const a = texture.pixels[(y0 * texture.width + x0) * texture.channels + channel];
    const b = texture.pixels[(y0 * texture.width + x1) * texture.channels + channel];
    const c = texture.pixels[(y1 * texture.width + x0) * texture.channels + channel];
    const d = texture.pixels[(y1 * texture.width + x1) * texture.channels + channel];
    color[channel] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  }
  return color;
}

function seamSamples(value, feather = 0.075) {
  if (value < feather) {
    const blend = 0.5 * (1 - value / feather);
    return [[value, 1 - blend], [1 - value, blend]];
  }
  if (value > 1 - feather) {
    const blend = 0.5 * (1 - (1 - value) / feather);
    return [[value, 1 - blend], [1 - value, blend]];
  }
  return [[value, 1]];
}

function sampleSeamless(texture, u, v) {
  const xs = seamSamples(u);
  const ys = seamSamples(v);
  const color = [0, 0, 0];
  for (const [sx, wx] of xs) {
    for (const [sy, wy] of ys) {
      const sampled = sample(texture, sx, sy);
      for (let channel = 0; channel < 3; channel++) color[channel] += sampled[channel] * wx * wy;
    }
  }
  return color;
}

function grade(color, settings) {
  const luma = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  return color.map((value) => {
    const saturated = luma + (value - luma) * settings.saturation;
    const contrasted = 128 + (saturated - 128) * settings.contrast;
    return Math.round(clamp(contrasted * settings.exposure, 0, 255));
  });
}

function renderTile(sourcePath, settings) {
  const texture = decodeRgbPng(sourcePath);
  const pixels = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const offset = (y * W + x) * 4;
      const nx = (x + 0.5 - W / 2) / (W / 2);
      const ny = (y + 0.5 - H / 2) / (H / 2);
      const edge = 1 - Math.abs(nx) - Math.abs(ny);
      if (edge <= -0.012) continue;

      const u = (nx + ny + 1) / 2;
      const v = (ny - nx + 1) / 2;
      const color = grade(sampleSeamless(texture, u, v), settings);
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = Math.round(clamp(edge * H / 2 + 0.65) * 255);
    }
  }
  return encodePng(W, H, pixels);
}

const themes = {
  wilderness: { exposure: 1.12, contrast: 1.04, saturation: 0.9 },
  town: { exposure: 1.08, contrast: 1.04, saturation: 0.85 },
  desert: { exposure: 0.96, contrast: 1.02, saturation: 0.84 },
  hell: { exposure: 1.18, contrast: 1.08, saturation: 0.9 },
  snow: { exposure: 0.88, contrast: 1.02, saturation: 0.75 },
};

for (const [name, settings] of Object.entries(themes)) {
  const source = join(ROOT, 'art_source/v4/tiles', `${name}_source.png`);
  const data = renderTile(source, settings);
  for (const prefix of ['public/assets/tile', 'assets/tile']) {
    const out = join(ROOT, prefix, `${name}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
  }
}

console.log(`Generated V4 painted tiles: ${Object.keys(themes).join(', ')}`);
