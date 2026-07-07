import { Assets, type Texture } from 'pixi.js';

// ── 资产覆盖式加载器 ──
// 按 docs/ASSET_PIPELINE.md 的加载契约解析顺序:
//   1) assets/extracted/<key>.png  (玩家本地从自有安装提取的授权瓦片/精灵, 不入库)
//   2) assets/v4-dark/<key>.png    (V4 暗黑高质感主题包)
//   3) assets/<key>.png            (入库的可替换开箱占位素材)
//   4) 都不存在 → 返回 null, 调用方回退到程序化 Graphics 绘制.
// 即: 真实 FLARE/原版精灵 PNG 一旦放入对应目录, 即自动覆盖程序化绘制.
//
// hasRealArt: 占位常量. 当前仓库不含真实美术, 恒为 false; 接入图集后可切真值,
// 让 main/渲染层选择"加载纹理优先"而非默认程序化.
export const hasRealArt = false;

// 候选路径生成 (覆盖式回退). 相对站点根, Vite 会从 /public 或同源静态目录解析.
function candidatePaths(key: string): string[] {
  return [`assets/extracted/${key}.png`, `assets/v4-dark/${key}.png`, `assets/${key}.png`];
}

// 尝试按契约顺序加载某 key 的纹理; 全部缺失则返回 null (不抛错).
// 按 key 记忆加载结果 (含"缺失"=null), 避免每个实体生成都重复发起 404 请求。
const _texCache = new Map<string, Promise<Texture | null>>();

const PROBE_TIMEOUT_MS = 900;
const TEXTURE_TIMEOUT_MS = 2600;

function timeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = globalThis.setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      () => {
        globalThis.clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

async function probeImage(url: string): Promise<boolean> {
  if (typeof location !== 'undefined' && location.protocol !== 'file:' && typeof fetch !== 'undefined') {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? globalThis.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, { method: 'HEAD', signal: controller?.signal });
      return res.ok;
    } catch {
      // Some mobile browsers/CDNs never settle HEAD reliably. Fall through to an
      // actual Image probe so startup can still continue instead of hanging.
    } finally {
      if (timer) globalThis.clearTimeout(timer);
    }
  }
  if (typeof location !== 'undefined' && location.protocol === 'file:' && (url.includes('/extracted/') || url.includes('/v4-dark/') || !url.startsWith('assets/'))) return false;
  if (typeof Image === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = globalThis.setTimeout(() => resolve(false), PROBE_TIMEOUT_MS);
    img.onload = () => {
      globalThis.clearTimeout(timer);
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    };
    img.onerror = () => {
      globalThis.clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export function tryLoadTexture(key: string): Promise<Texture | null> {
  const cached = _texCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    for (const url of candidatePaths(key)) {
      try {
        if (!(await probeImage(url))) continue;
        const tex = (await timeout(Assets.load(url) as Promise<Texture>, TEXTURE_TIMEOUT_MS)) as Texture | null;
        if (tex) return tex;
      } catch {
        // 该候选不存在/加载失败, 静默尝试下一个。
      }
    }
    return null;
  })();
  _texCache.set(key, p);
  return p;
}
