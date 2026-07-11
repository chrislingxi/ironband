import { chromium } from 'playwright-core';
import { existsSync, cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';

if (existsSync(process.cwd() + '/dist/assets')) {
  mkdirSync(process.cwd() + '/dist/web', { recursive: true });
  rmSync(process.cwd() + '/dist/web/assets', { recursive: true, force: true });
  cpSync(process.cwd() + '/dist/assets', process.cwd() + '/dist/web/assets', { recursive: true });
}
const WEB_ROOT = resolve(process.cwd(), 'dist/web');
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = resolve(WEB_ROOT, requested === '/' ? 'index.html' : requested.replace(/^\/+/, ''));
  if (!file.startsWith(WEB_ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start mobile selftest server');
const URL = `http://127.0.0.1:${address.port}/`;

const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => existsSync(p));
const browser = await chromium.launch(executablePath ? { executablePath } : undefined);
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const findings = [];

page.on('pageerror', (e) => findings.push(`runtime: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') findings.push(`console: ${m.text()}`); });

await page.goto(URL);
await page.waitForTimeout(1500);

const guardReport = await page.evaluate(() => {
  const dbl = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
  document.dispatchEvent(dbl);

  const touchEnd1 = new Event('touchend', { bubbles: true, cancelable: true });
  const touchEnd2 = new Event('touchend', { bubbles: true, cancelable: true });
  document.dispatchEvent(touchEnd1);
  document.dispatchEvent(touchEnd2);

  const meta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '';
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return {
    dblPrevented: dbl.defaultPrevented,
    rapidTouchPrevented: touchEnd2.defaultPrevented,
    meta,
    htmlTouchAction: root.touchAction,
    bodyPosition: body.position,
    appHeight: root.getPropertyValue('--app-height').trim(),
    appWidth: root.getPropertyValue('--app-width').trim(),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    visualScale: window.visualViewport?.scale ?? 1,
  };
});

if (!guardReport.dblPrevented) findings.push('dblclick was not prevented');
if (!guardReport.rapidTouchPrevented) findings.push('rapid touchend was not prevented');
if (!/user-scalable=no/.test(guardReport.meta) || !/maximum-scale=1/.test(guardReport.meta)) findings.push(`viewport meta is incomplete: ${guardReport.meta}`);
if (guardReport.htmlTouchAction !== 'none') findings.push(`html touch-action is ${guardReport.htmlTouchAction}`);
if (guardReport.bodyPosition !== 'fixed') findings.push(`body position is ${guardReport.bodyPosition}`);
if (!guardReport.appHeight || !guardReport.appWidth) findings.push('app viewport CSS vars were not set');
if (guardReport.scrollX !== 0 || guardReport.scrollY !== 0) findings.push(`page scrolled to ${guardReport.scrollX},${guardReport.scrollY}`);
if (guardReport.visualScale !== 1) findings.push(`visualViewport scale is ${guardReport.visualScale}`);

await browser.close();
await new Promise((resolveClose) => server.close(resolveClose));

if (findings.length) {
  console.log('移动端防缩放自测失败:\n' + findings.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}

console.log('移动端防缩放自测通过:', JSON.stringify(guardReport));
