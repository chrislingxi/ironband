import { Assets, type Texture } from 'pixi.js';

// ── 资产覆盖式加载器 ──
// 按 docs/ASSET_PIPELINE.md 的加载契约解析顺序:
//   1) assets/extracted/<key>.png  (玩家本地从自有 D2 安装提取的原版瓦片/精灵, 不入库)
//   2) assets/<key>.png            (入库的 FLARE/CC0 开箱占位素材)
//   3) 都不存在 → 返回 null, 调用方回退到程序化 Graphics 绘制.
// 即: 真实 FLARE/原版精灵 PNG 一旦放入对应目录, 即自动覆盖程序化绘制.
//
// hasRealArt: 占位常量. 当前仓库不含真实美术, 恒为 false; 接入图集后可切真值,
// 让 main/渲染层选择"加载纹理优先"而非默认程序化.
export const hasRealArt = false;

// 候选路径生成 (覆盖式回退). 相对站点根, Vite 会从 /public 或同源静态目录解析.
function candidatePaths(key: string): string[] {
  return [`assets/extracted/${key}.png`, `assets/${key}.png`];
}

// 尝试按契约顺序加载某 key 的纹理; 全部缺失则返回 null (不抛错).
export async function tryLoadTexture(key: string): Promise<Texture | null> {
  for (const url of candidatePaths(key)) {
    try {
      // Assets.load 命中缓存或成功加载即返回纹理.
      const tex = (await Assets.load(url)) as Texture;
      if (tex) return tex;
    } catch {
      // 该候选不存在/加载失败, 静默尝试下一个.
    }
  }
  return null;
}
