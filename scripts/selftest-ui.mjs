// 设备矩阵 UI 自测: 在多分辨率下逐面板截图 + 断言 (越界/遮挡/安全区/运行时错误)。
// 替代人工逐 bug 复测的「画面层」关。运行: node scripts/selftest-ui.mjs
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, cpSync, readdirSync } from 'node:fs';

const URL = 'file://' + process.cwd() + '/dist/web/index.html';
const OUT = process.cwd() + '/.selftest';
mkdirSync(OUT, { recursive: true });

// 复刻部署布局: vite 把 public/assets 拷到 dist/assets, 但 html 在 dist/web/。
// 部署时 workflow 会把 assets/ 与 index.html 同级; 本地测试同样把 assets 拷到 dist/web 下, 让真图按 key 加载。
if (existsSync(process.cwd() + '/dist/assets')) {
  cpSync(process.cwd() + '/dist/assets', process.cwd() + '/dist/web/assets', { recursive: true });
}
// 已交付的美术 key (按 public/assets 实际存在者校验加载, 不臆测)。
function deliveredKeys() {
  const root = process.cwd() + '/public/assets';
  const keys = [];
  if (!existsSync(root)) return keys;
  for (const cat of readdirSync(root)) {
    const dir = `${root}/${cat}`;
    try { for (const f of readdirSync(dir)) if (f.endsWith('.png')) keys.push(`${cat}/${f.slice(0, -4)}`); } catch { /* not a dir */ }
  }
  return keys;
}

// 设备 profile: 含模拟刘海 (insets) 用于横屏安全区校验。
const DEVICES = [
  { name: 'iphone-portrait', w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  { name: 'iphone-landscape', w: 844, h: 390, insets: { top: 0, bottom: 21, left: 47, right: 47 } },
  { name: 'android-small', w: 360, h: 640, insets: { top: 24, bottom: 0, left: 0, right: 0 } },
  { name: 'tablet', w: 1024, h: 768, insets: { top: 24, bottom: 0, left: 0, right: 0 } },
];

const findings = [];
function flag(dev, panel, msg) { findings.push(`[${dev}] ${panel}: ${msg}`); }

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const dev of DEVICES) {
  const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e)));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  // 尝试用 CDP 注入真实安全区 (Chromium 较新版本支持); 失败则忽略。
  try {
    const client = await ctx.newCDPSession(pg);
    await client.send('Emulation.setSafeAreaInsetsOverride', { insets: dev.insets });
  } catch { /* 不支持则跳过, 仍做越界/遮挡检查 */ }

  await pg.goto(URL);
  await pg.waitForTimeout(2200);
  // 游戏内按钮监听 pointerdown, 故用派发 pointerdown 模拟真实点击 (Playwright .click 对 emoji div 不可靠)。
  const click = async (t) => {
    const ok = await pg.evaluate((txt) => {
      const el = [...document.querySelectorAll('div,button,span')].find((e) => e.textContent.trim() === txt && e.offsetParent !== null);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      for (const type of ['pointerdown', 'mousedown', 'click']) el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
      return true;
    }, t);
    await pg.waitForTimeout(400);
    return ok;
  };
  await click('法师'); await click('踏入暗黑之地'); await pg.waitForTimeout(1500);
  for (const t of ['跳过引导', '跳过', '知道了', '开始游戏', '开始']) await click(t);
  await pg.waitForTimeout(300);

  // 通用断言: 给定面板根选择器, 检查可交互元素是否越出视口 / 落在安全区内
  async function audit(panel, sel) {
    const data = await pg.evaluate(({ sel, insets }) => {
      const root = document.querySelector(sel);
      if (!root || getComputedStyle(root).display === 'none') return { missing: true };
      const vw = window.innerWidth, vh = window.innerHeight;
      const out = { over: [], inset: [] };
      const els = root.querySelectorAll('button, .x, .close, .plus, .wear, .off, .chip, .sk, .slot, .equipbest, .tab, .inv');
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // 仅判横向越界 (面板可纵向滚动, 下方元素 bottom>vh 属正常)。
        if (r.left < -1 || r.right > vw + 1) out.over.push((el.textContent || el.className).slice(0, 14));
        // 安全区(刘海)只在横向 + 顶部判: 仅当元素实际在首屏可视范围内才算被刘海压住。
        if (r.bottom > 0 && r.top < vh) {
          if (r.left < insets.left - 1 || r.right > vw - insets.right + 1) out.inset.push((el.textContent || el.className).slice(0, 14));
        }
      }
      return out;
    }, { sel, insets: dev.insets });
    if (data.missing) return;
    if (data.over?.length) flag(dev.name, panel, `元素越出视口: ${[...new Set(data.over)].slice(0, 5).join(', ')}`);
    if (data.inset?.length) flag(dev.name, panel, `元素压到安全区(刘海): ${[...new Set(data.inset)].slice(0, 5).join(', ')}`);
  }

  // 逐面板打开 → 截图 → 审计
  const panels = [
    { key: '📖', sel: '#skt', name: '技能树' },
    { key: '🎒', sel: '#inv', name: '背包装备' },
    { key: '🧍', sel: '#charp', name: '角色' },
  ];
  // HUD 常驻先审一次 + 截图
  await pg.screenshot({ path: `${OUT}/${dev.name}-hud.png` });
  await audit('HUD', '#hud');
  for (const p of panels) {
    if (await click(p.key)) {
      await pg.waitForTimeout(600);
      await pg.screenshot({ path: `${OUT}/${dev.name}-${p.name}.png` });
      await audit(p.name, p.sel);
      // 关闭
      await pg.evaluate((sel) => { const x = document.querySelector(`${sel} .x, ${sel} .close`); if (x) x.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, p.sel);
      await pg.waitForTimeout(300);
    } else flag(dev.name, p.name, `按钮 ${p.key} 打不开`);
  }
  // 视口/缩放策略校验 (仅一次)
  if (dev.name === 'iphone-portrait') {
    const meta = await pg.evaluate(() => document.querySelector('meta[name=viewport]')?.getAttribute('content') || '');
    if (!/user-scalable=no/.test(meta) || !/viewport-fit=cover/.test(meta)) flag(dev.name, 'viewport', `meta 缺少 user-scalable=no/viewport-fit=cover: ${meta}`);
  }
  if (errs.length) flag(dev.name, 'runtime', `控制台/页面错误 ${errs.length}: ${errs.slice(0, 2).join(' | ')}`);
  await ctx.close();
}

// ── 美术加载回归关: 已交付的每个 key 必须能从 assets/<key>.png 加载 (防资产丢失/路径回归) ──
{
  const keys = deliveredKeys();
  if (keys.length) {
    const ctx = await b.newContext({ viewport: { width: 400, height: 400 } });
    const pg = await ctx.newPage();
    await pg.goto(URL);
    // 用 Image 加载校验 (file:// 下 fetch 被拦, 但 <img> 与 Pixi 的纹理加载一致可用)。
    const bad = await pg.evaluate((keys) => Promise.all(keys.map((k) => new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img.naturalWidth > 0 ? null : `${k}(0w)`);
      img.onerror = () => res(`${k}(err)`);
      img.src = `assets/${k}.png`;
    }))).then((r) => r.filter(Boolean)), keys);
    if (bad.length) findings.push(`[art] 美术 key 加载失败: ${bad.join(', ')}`);
    else console.log(`美术加载关通过: ${keys.length} 个 key 全部可加载 (assets/<key>.png)。`);
    await ctx.close();
  }
}

await b.close();
if (findings.length) {
  console.log('UI 自测发现问题:\n' + findings.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
} else {
  console.log('UI 自测通过: 设备矩阵下无越界/遮挡/运行时错误。截图见 .selftest/');
}
