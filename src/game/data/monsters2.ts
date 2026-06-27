import type { MonStat } from './schema.ts';

// 第一幕怪物扩充包 (4 种新怪, 与 monsters.ts 同量级数值).
// normal 为主, nm/hell 粗略递增缩放, 后续 MonLvl 任务精调.
// 数值对照 monsters.ts 现有 4 种, 保持同一量级. pd() 风格与原文件一致.
const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

export const MONSTERS_EXT: Record<string, MonStat> = {
  // 弓箭手: 远程物理, 中血中速. 复用 archer AI (后续 behaviors 实现: 拉开距离放箭).
  archer: {
    id: 'archer', name: '腐弓手', sprite: 'archer', ai: 'archer',
    level: pd(3, 39, 71), hp: pd([8, 12], [50, 70], [180, 240]),
    attackRating: pd(45, 620, 2500), defense: pd(6, 400, 1400),
    damage: pd([2, 4], [12, 22], [44, 76]), // 远程物理箭矢
    resist: {}, exp: pd(8, 440, 3200), speed: 3, radius: 0.42,
    flags: { ranged: true },
  },
  // 督军: 高血高伤近战, 慢速, 体型大 (radius 偏大). brute AI: 缓慢逼近重击.
  brute: {
    id: 'brute', name: '血肉督军', sprite: 'brute', ai: 'brute',
    level: pd(4, 40, 72), hp: pd([24, 32], [120, 160], [380, 480]),
    attackRating: pd(50, 640, 2600), defense: pd(10, 420, 1450),
    damage: pd([4, 8], [20, 36], [70, 120]), // 高伤近战重击
    resist: { physical: pd(0, 0, 10), cold: pd(0, 40, 100) }, exp: pd(14, 620, 4200), speed: 1.4, radius: 0.7, // 地狱: 冰免疫
  },
  // 吐毒虫: 远程毒, 低血. 复用 archer 远程框架, 伤害归为毒系 (damageType 由技能/behaviors 处理).
  spitter: {
    id: 'spitter', name: '吐毒虫', sprite: 'spitter', ai: 'archer',
    level: pd(2, 38, 70), hp: pd([5, 8], [38, 52], [150, 200]),
    attackRating: pd(40, 580, 2350), defense: pd(3, 360, 1250),
    damage: pd([1, 3], [9, 18], [38, 66]), // 远程毒液 (持续伤害量级偏低)
    resist: { poison: pd(75, 75, 90) }, exp: pd(7, 400, 3000), speed: 2.4, radius: 0.4,
    rangedType: 'poison', // 吐酸怪打毒伤 (视觉绿毒一致), 不再误为火伤
    flags: { ranged: true },
  },
  // 恶犬: 低血群冲, 高速直扑. 用 skeleton 直扑近战 AI 但 speed 拉高.
  hound: {
    id: 'hound', name: '尸群恶犬', sprite: 'hound', ai: 'skeleton',
    level: pd(2, 38, 70), hp: pd([4, 7], [36, 50], [150, 195]),
    attackRating: pd(38, 560, 2300), defense: pd(4, 340, 1200),
    damage: pd([1, 3], [9, 18], [38, 68]), // 快速撕咬
    resist: {}, exp: pd(5, 360, 2900), speed: 5.5, radius: 0.4,
  },
};
