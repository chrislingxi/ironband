import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), process.env.NIGHTFALL_WEB_ROOT || 'unity/Builds/Web');
const OUT = resolve(process.cwd(), '.selftest/unity-web');
const indexPath = resolve(ROOT, 'index.html');

if (!existsSync(indexPath)) {
  throw new Error(`Unity Web build is missing: ${indexPath}`);
}
mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.unityweb': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
};

const server = createServer((req, res) => {
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = resolve(ROOT, requested === '/' ? 'index.html' : requested.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start Unity Web QA server');
const url = `http://127.0.0.1:${address.port}/`;

const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch(executablePath ? { executablePath } : undefined);

const devices = [
  { name: 'desktop', width: 1440, height: 900, mobile: false, rotate: false },
  { name: 'iphone-landscape', width: 844, height: 390, mobile: true, rotate: false },
  { name: 'iphone-portrait', width: 390, height: 844, mobile: true, rotate: true },
];
const findings = [];

for (const device of devices) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.mobile ? 2 : 1,
    isMobile: device.mobile,
    hasTouch: device.mobile,
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('requestfailed', (request) => runtimeErrors.push(`${request.url()}: ${request.failure()?.errorText || 'request failed'}`));

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (!device.rotate) {
    await page.waitForFunction(() => !document.querySelector('#loading'), null, { timeout: 240_000 });
    await page.waitForTimeout(2500);
  } else {
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#rotate')).display === 'grid');
  }

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('#unity-canvas');
    const shell = document.querySelector('#game-shell');
    const rotate = document.querySelector('#rotate');
    const canvasRect = canvas?.getBoundingClientRect();
    const shellRect = shell?.getBoundingClientRect();
    return {
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      canvasRect: canvasRect && { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
      shellRect: shellRect && { x: shellRect.x, y: shellRect.y, width: shellRect.width, height: shellRect.height },
      rotateVisible: rotate ? getComputedStyle(rotate).display !== 'none' : false,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overflowY: document.documentElement.scrollHeight - window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  });

  if (layout.overflowX > 1 || layout.overflowY > 1 || layout.scrollX !== 0 || layout.scrollY !== 0) {
    findings.push(`[${device.name}] page overflow/scroll: ${JSON.stringify(layout)}`);
  }
  if (!layout.shellRect || layout.shellRect.width !== device.width || layout.shellRect.height !== device.height) {
    findings.push(`[${device.name}] game shell does not fill the viewport: ${JSON.stringify(layout.shellRect)}`);
  }
  if (layout.rotateVisible !== device.rotate) {
    findings.push(`[${device.name}] rotation guard mismatch: ${layout.rotateVisible}`);
  }

  if (!device.rotate) {
    if (!layout.canvasRect || layout.canvasRect.width < device.width - 1 || layout.canvasRect.height < device.height - 1) {
      findings.push(`[${device.name}] canvas is not full bleed: ${JSON.stringify(layout.canvasRect)}`);
    }
    if (layout.canvasWidth < 640 || layout.canvasHeight < 360) {
      findings.push(`[${device.name}] Unity render target is unexpectedly small: ${layout.canvasWidth}x${layout.canvasHeight}`);
    }
    await page.locator('#unity-canvas').tap({ position: { x: device.width / 2, y: device.height / 2 } });
    await page.waitForTimeout(1200);
  }

  const screenshot = await page.screenshot({ path: resolve(OUT, `${device.name}.png`) });
  if (!device.rotate && screenshot.byteLength < 50_000) {
    findings.push(`[${device.name}] screenshot is suspiciously blank (${screenshot.byteLength} bytes)`);
  }
  if (runtimeErrors.length) {
    findings.push(`[${device.name}] runtime errors: ${runtimeErrors.slice(0, 4).join(' | ')}`);
  }
  await context.close();
}

await browser.close();
await new Promise((done) => server.close(done));

if (findings.length) {
  console.error(`Unity Web QA failed:\n${findings.map((finding) => ` - ${finding}`).join('\n')}`);
  process.exit(1);
}
console.log(`Unity Web QA passed for ${devices.length} viewports. Screenshots: ${OUT}`);
