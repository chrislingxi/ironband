import type { MonStat } from './schema.ts';

// 第一幕怪物 (代表性 D2 量级数值, normal 为主; nm/hell 粗略缩放, 后续 MonLvl 任务精调).
// 数值对照 Arreat Summit 量级, 可调.
const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

export const MONSTERS: Record<string, MonStat> = {
  skeleton: {
    id: 'skeleton', name: '骷髅', sprite: 'skeleton', ai: 'skeleton',
    level: pd(2, 38, 70), hp: pd([10, 14], [60, 80], [200, 260]),
    attackRating: pd(40, 600, 2400), defense: pd(8, 400, 1400),
    damage: pd([1, 3], [10, 20], [40, 70]),
    resist: {}, exp: pd(6, 380, 3000), speed: 3, radius: 0.45,
  },
  zombie: {
    id: 'zombie', name: '行尸', sprite: 'zombie', ai: 'zombie',
    level: pd(1, 37, 69), hp: pd([13, 18], [70, 95], [230, 300]),
    attackRating: pd(30, 520, 2200), defense: pd(0, 360, 1300),
    damage: pd([1, 4], [12, 24], [44, 78]),
    resist: { poison: pd(50, 50, 50) }, exp: pd(5, 360, 2900), speed: 1.6, radius: 0.5,
  },
  fallen: {
    id: 'fallen', name: '堕落者', sprite: 'fallen', ai: 'fallen',
    level: pd(1, 36, 68), hp: pd([4, 6], [40, 55], [160, 210]),
    attackRating: pd(25, 480, 2000), defense: pd(2, 320, 1200),
    damage: pd([1, 2], [8, 16], [36, 64]),
    resist: {}, exp: pd(4, 320, 2600), speed: 4.2, radius: 0.4,
  },
  shaman: {
    id: 'shaman', name: '堕落萨满', sprite: 'shaman', ai: 'shaman',
    level: pd(3, 39, 71), hp: pd([9, 13], [55, 75], [190, 250]),
    attackRating: pd(35, 560, 2300), defense: pd(5, 380, 1350),
    damage: pd([2, 4], [14, 26], [48, 82]), // 火球
    resist: { fire: pd(50, 50, 75) }, exp: pd(10, 500, 3600), speed: 3, radius: 0.45,
    flags: { ranged: true },
  },
};
