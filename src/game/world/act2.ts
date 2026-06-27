import type { LevelDef, PerDifficulty } from '@game/data/schema.ts';

// 第二幕区域数据 (沙漠主题, 鲁高因). 结构对标 D2 第二幕主线, 数值/连接为本作设定。
// 怪物复用现有 id (skeleton/zombie/fallen/shaman/hound/brute/spitter/archer),
// monLevel 接续第一幕继续抬升, 终点塔拉夏古墓为督瑞尔 Boss 区。

const ml = (n: number, nm: number, h: number): PerDifficulty<number> => ({
  normal: n,
  nightmare: nm,
  hell: h,
});

export const ACT2_AREAS: Record<string, LevelDef> = {
  // 鲁高因 — 第二幕城镇, 海港集市
  lut_gholein: {
    id: 'lut_gholein',
    name: '鲁高因',
    act: 2,
    monLevel: ml(13, 48, 79),
    monsters: [],
    size: [62, 62],
    waypoint: true,
    isTown: true,
    connects: ['rocky_waste'],
  },

  // 石块荒地 — 出城第一片沙漠
  rocky_waste: {
    id: 'rocky_waste',
    name: '石块荒地',
    act: 2,
    monLevel: ml(14, 49, 80),
    monsters: ['fallen', 'hound', 'skeleton', 'archer'],
    size: [120, 120],
    connects: ['lut_gholein', 'dry_hills'],
  },

  // 干燥高地 — 含传送点
  dry_hills: {
    id: 'dry_hills',
    name: '干燥高地',
    act: 2,
    monLevel: ml(15, 50, 81),
    monsters: ['skeleton', 'shaman', 'brute', 'hound'],
    size: [115, 115],
    waypoint: true,
    connects: ['rocky_waste', 'far_oasis'],
  },

  // 遥远绿洲 — 含传送点
  far_oasis: {
    id: 'far_oasis',
    name: '遥远绿洲',
    act: 2,
    monLevel: ml(16, 51, 82),
    monsters: ['zombie', 'spitter', 'shaman', 'archer'],
    size: [120, 120],
    waypoint: true,
    connects: ['dry_hills', 'canyon_of_magi'],
  },

  // 魔法峡谷 — 含传送点, 通往奥术圣殿
  canyon_of_magi: {
    id: 'canyon_of_magi',
    name: '魔法峡谷',
    act: 2,
    monLevel: ml(18, 53, 84),
    monsters: ['skeleton', 'brute', 'spitter', 'shaman'],
    size: [110, 110],
    waypoint: true,
    connects: ['far_oasis', 'arcane_sanctuary'],
  },

  // 奥术圣殿 — 通往塔拉夏古墓
  arcane_sanctuary: {
    id: 'arcane_sanctuary',
    name: '奥术圣殿',
    act: 2,
    monLevel: ml(20, 55, 86),
    monsters: ['skeleton', 'shaman', 'spitter'],
    size: [100, 100],
    connects: ['canyon_of_magi', 'tal_rasha_tomb'],
  },

  // 塔拉夏古墓 — 督瑞尔 Boss 区, 第二幕终点
  tal_rasha_tomb: {
    id: 'tal_rasha_tomb',
    name: '塔拉夏古墓',
    act: 2,
    monLevel: ml(24, 58, 89),
    monsters: ['skeleton', 'brute'],
    size: [72, 72],
    connects: ['arcane_sanctuary'],
  },
};
