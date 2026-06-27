import { Container, Graphics } from 'pixi.js';
import { gridToScreen, TILE_W, TILE_H } from '../math/iso.ts';

// ── 程序化等距地砖 ──
// 替代 IsoScene.buildPlaceholderGround 的纯棋盘色: 每格菱形带噪声色扰动 + 描边,
// 零星撒石块/草点, 营造草地/泥土质感. theme 决定色调.
// 真实 FLARE/原版 DT1 瓦片接入后可整体替换本函数.

export type GroundTheme = 'wilderness' | 'town';

interface Palette {
  base: number[];   // 主色候选 (随机挑一个再扰动)
  edge: number;     // 菱形描边色
  speck: number[];  // 草点/石块色
}

const PALETTES: Record<GroundTheme, Palette> = {
  // 荒野: 暗森林绿褐 (D2 风格, 饱和度+20%)
  wilderness: {
    base: [0x1f2d1a, 0x263521, 0x2c3d25, 0x1a2814, 0x32422a],
    edge: 0x121c0e,
    speck: [0x4a5c2e, 0x5e7038, 0x3e3826, 0x24201a],
  },
  // 城镇: 暖石灰/营地砖石 (比荒野更暖)
  town: {
    base: [0x3d2b1f, 0x4a3526, 0x52402e, 0x35261a, 0x5a4a38],
    edge: 0x221510,
    speck: [0x6a5040, 0x7a6050, 0x4a3830, 0x2e2420],
  },
};

// 按 amount 调整亮度 (整数 -40..+40 之类), 通道分别加减并夹紧.
function jitterColor(color: number, amount: number): number {
  const r = clampByte(((color >> 16) & 0xff) + amount);
  const g = clampByte(((color >> 8) & 0xff) + amount);
  const b = clampByte((color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

// 在 container 内构建 cols x rows 的等距地砖. rng() 返回 [0,1), 保证可复现.
export function buildGround(
  container: Container,
  cols: number,
  rows: number,
  rng: () => number,
  theme: GroundTheme = 'wilderness',
): void {
  container.removeChildren();
  const pal = PALETTES[theme];
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const s = gridToScreen({ x: gx, y: gy });
      const tile = new Graphics();

      // 基色: 候选挑一 + 亮度噪声扰动 (棋盘暗化叠加, 保留等距体积感)
      const baseCol = pal.base[Math.floor(rng() * pal.base.length)];
      const checker = (gx + gy) % 2 === 0 ? -8 : 4;
      const jitter = Math.floor((rng() - 0.5) * 22) + checker;
      const fillCol = jitterColor(baseCol, jitter);

      tile
        .moveTo(0, -hh)
        .lineTo(hw, 0)
        .lineTo(0, hh)
        .lineTo(-hw, 0)
        .closePath()
        .fill({ color: fillCol })
        .stroke({ color: pal.edge, width: 1, alpha: 0.6 });

      // 零星点缀: 约 18% 的格子撒一个草点/小石块.
      if (rng() < 0.18) {
        const speckCol = pal.speck[Math.floor(rng() * pal.speck.length)];
        // 限制在菱形内部的随机偏移
        const ox = (rng() - 0.5) * hw * 0.9;
        const oy = (rng() - 0.5) * hh * 0.9;
        const r = 1.2 + rng() * 2.2;
        tile.circle(ox, oy, r).fill({ color: speckCol, alpha: 0.75 });
      }

      tile.position.set(s.x, s.y);
      container.addChild(tile);
    }
  }
}
