import { Container, Graphics } from 'pixi.js';
import { gridToScreen, TILE_W, TILE_H } from '../math/iso.ts';

// ── 程序化等距地砖 ──
// 替代 IsoScene.buildPlaceholderGround 的纯棋盘色: 每格菱形带噪声色扰动 + 描边,
// 零星撒石块/草点, 营造草地/泥土质感. theme 决定色调.
// 真实 FLARE/原版 DT1 瓦片接入后可整体替换本函数.

export type GroundTheme = 'wilderness' | 'town' | 'desert';

interface Palette {
  base: number[];   // 主色候选 (随机挑一个再扰动)
  edge: number;     // 菱形描边色
  speck: number[];  // 草点/石块色
  decor: 'grass' | 'rock' | 'cobble'; // 主装饰类型
}

const PALETTES: Record<GroundTheme, Palette> = {
  // 荒野: 暗森林绿褐 (D2 风格, 饱和度+20%)
  wilderness: {
    base: [0x1f2d1a, 0x263521, 0x2c3d25, 0x1a2814, 0x32422a],
    edge: 0x121c0e,
    speck: [0x4a5c2e, 0x5e7038, 0x3e3826, 0x24201a],
    decor: 'grass',
  },
  // 城镇: 暖石灰/营地砖石 (比荒野更暖)
  town: {
    base: [0x3d2b1f, 0x4a3526, 0x52402e, 0x35261a, 0x5a4a38],
    edge: 0x221510,
    speck: [0x6a5040, 0x7a6050, 0x4a3830, 0x2e2420],
    decor: 'cobble',
  },
  // 沙漠 (第二幕鲁高因): 暖沙黄褐
  desert: {
    base: [0x6e5836, 0x7d6740, 0x8a7448, 0x5e4a2e, 0x95804f],
    edge: 0x3a2c18,
    speck: [0xa8915a, 0x6a5436, 0x837049, 0xb6a268],
    decor: 'rock',
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

// 主题装饰: 在格内画一簇草/碎石/石缝, 比单点圆更有质感。
function drawDecor(
  g: Graphics,
  kind: Palette['decor'],
  ox: number,
  oy: number,
  col: number,
  rng: () => number,
): void {
  if (kind === 'grass') {
    // 草丛: 3~4 根上挑的细叶
    const n = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const bx = ox + (i - n / 2) * 1.6;
      const lean = (rng() - 0.5) * 2;
      g.moveTo(bx, oy).lineTo(bx + lean, oy - 3 - rng() * 3).stroke({ color: col, width: 1.4, alpha: 0.85 });
    }
  } else if (kind === 'rock') {
    // 碎石: 1~2 块多边小石 + 投影
    const r = 2 + rng() * 2.4;
    g.ellipse(ox, oy + r * 0.5, r * 1.1, r * 0.5).fill({ color: 0x000000, alpha: 0.22 });
    g.poly([ox - r, oy, ox - r * 0.3, oy - r, ox + r * 0.6, oy - r * 0.7, ox + r, oy + r * 0.2, ox, oy + r * 0.5])
      .fill({ color: col, alpha: 0.9 });
    if (rng() < 0.5) g.circle(ox + r * 1.4, oy + r * 0.2, r * 0.5).fill({ color: col, alpha: 0.7 });
  } else {
    // 石缝/卵石: 短裂纹 + 小点
    g.moveTo(ox - 3, oy).lineTo(ox + 2, oy - 1.5).lineTo(ox + 4, oy + 1).stroke({ color: col, width: 1.2, alpha: 0.6 });
    g.circle(ox, oy, 1.4 + rng() * 1.4).fill({ color: col, alpha: 0.7 });
  }
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

      // 零星点缀: 约 24% 的格子按主题撒装饰 (草丛/碎石/石缝).
      if (rng() < 0.24) {
        const speckCol = pal.speck[Math.floor(rng() * pal.speck.length)];
        const ox = (rng() - 0.5) * hw * 0.8;
        const oy = (rng() - 0.5) * hh * 0.8;
        drawDecor(tile, pal.decor, ox, oy, speckCol, rng);
      }

      tile.position.set(s.x, s.y);
      container.addChild(tile);
    }
  }
}
