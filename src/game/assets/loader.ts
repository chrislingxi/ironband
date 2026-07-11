import { Texture, type Texture as PixiTexture } from 'pixi.js';
import { assetUrl } from '@engine/assets/url.ts';

// ── 资产覆盖式加载器 ──
// 线上优先加载入库素材, 避免 GitHub Pages/iOS 对缺失覆盖目录的探测拖住开局。
// 不存在时再按 docs/ASSET_PIPELINE.md 的覆盖目录查找:
//   1) assets/<key>.png            (入库的可替换开箱占位素材)
//   2) assets/extracted/<key>.png  (玩家本地从自有安装提取的授权瓦片/精灵, 不入库)
//   3) assets/v4-dark/<key>.png    (V4 暗黑高质感主题包)
//   4) 都不存在 → 返回 null, 调用方回退到程序化 Graphics 绘制.
// 即: 真实 FLARE/原版精灵 PNG 一旦放入对应目录, 即自动覆盖程序化绘制.
//
// hasRealArt: 占位常量. 当前仓库不含真实美术, 恒为 false; 接入图集后可切真值,
// 让 main/渲染层选择"加载纹理优先"而非默认程序化.
export const hasRealArt = false;

// 候选路径生成 (覆盖式回退). 相对站点根, Vite 会从 /public 或同源静态目录解析.
function candidatePaths(key: string): string[] {
  return [
    assetUrl(`assets/${key}.png`),
    assetUrl(`assets/extracted/${key}.png`),
    assetUrl(`assets/v4-dark/${key}.png`),
  ];
}

// 尝试按契约顺序加载某 key 的纹理; 全部缺失则返回 null (不抛错).
// 按 key 记忆加载结果 (含"缺失"=null), 避免每个实体生成都重复发起 404 请求。
const _texCache = new Map<string, Promise<Texture | null>>();

const PRIMARY_ASSET_TIMEOUT_MS = 6_500;
const OPTIONAL_OVERRIDE_TIMEOUT_MS = 1_200;

async function loadTextureCandidate(url: string): Promise<PixiTexture | null> {
  let effectiveUrl = url;
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    if (url.includes('/extracted/') || url.includes('/v4-dark/') || !url.startsWith('assets/')) return null;
    // Chromium file loading treats a cache query as part of the filename.
    // HTTP needs the revision token; deterministic local QA needs the real path.
    effectiveUrl = url.split('?')[0];
  }
  if (typeof Image === 'undefined') return Promise.resolve(null);
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const isOptionalOverride = url.includes('/extracted/') || url.includes('/v4-dark/');
    const timeoutMs = isOptionalOverride ? OPTIONAL_OVERRIDE_TIMEOUT_MS : PRIMARY_ASSET_TIMEOUT_MS;
    const timer = globalThis.setTimeout(() => resolve(null), timeoutMs);
    const img = new Image();
    img.onload = () => {
      globalThis.clearTimeout(timer);
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null);
    };
    img.onerror = () => {
      globalThis.clearTimeout(timer);
      resolve(null);
    };
    img.src = effectiveUrl;
  });
  return img ? Texture.from(img, true) : null;
}

export function tryLoadTexture(key: string): Promise<Texture | null> {
  const cached = _texCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    for (const url of candidatePaths(key)) {
      try {
        const tex = await loadTextureCandidate(url);
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
