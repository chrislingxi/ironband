import type { LevelDef, PerDifficulty } from '@game/data/schema.ts';

// 第四幕区域数据 (混沌避难所 / 地狱). 怪物复用现有 id, monLevel 接续第三幕,
// 终点混沌避难所为暗黑破坏神 Boss 区。

const ml = (n: number, nm: number, h: number): PerDifficulty<number> => ({ normal: n, nightmare: nm, hell: h });

export const ACT4_AREAS: Record<string, LevelDef> = {
  // 万神殿要塞 — 第四幕城镇
  pandemonium_fortress: {
    id: 'pandemonium_fortress',
    name: '万神殿要塞',
    act: 4,
    monLevel: ml(37, 69, 101),
    monsters: [],
    size: [58, 58],
    waypoint: true,
    isTown: true,
    connects: ['outer_steppes'],
  },

  outer_steppes: {
    id: 'outer_steppes',
    name: '外围草原',
    act: 4,
    monLevel: ml(38, 70, 102),
    monsters: ['hound', 'brute', 'fallen', 'shaman'],
    size: [115, 115],
    connects: ['pandemonium_fortress', 'plains_of_despair'],
  },

  plains_of_despair: {
    id: 'plains_of_despair',
    name: '绝望平原',
    act: 4,
    monLevel: ml(40, 71, 103),
    monsters: ['skeleton', 'shaman', 'spitter', 'brute'],
    size: [120, 120],
    waypoint: true,
    connects: ['outer_steppes', 'city_of_the_damned'],
  },

  city_of_the_damned: {
    id: 'city_of_the_damned',
    name: '诅咒之城',
    act: 4,
    monLevel: ml(42, 72, 104),
    monsters: ['skeleton', 'brute', 'hound', 'shaman'],
    size: [115, 115],
    waypoint: true,
    connects: ['plains_of_despair', 'river_of_flame'],
  },

  river_of_flame: {
    id: 'river_of_flame',
    name: '烈焰之河',
    act: 4,
    monLevel: ml(44, 73, 105),
    monsters: ['brute', 'spitter', 'shaman'],
    size: [110, 110],
    connects: ['city_of_the_damned', 'chaos_sanctuary'],
  },

  // 混沌避难所 — 暗黑破坏神 Boss 区, 第四幕终点
  chaos_sanctuary: {
    id: 'chaos_sanctuary',
    name: '混沌避难所',
    act: 4,
    monLevel: ml(46, 74, 106),
    monsters: ['brute', 'shaman'],
    size: [76, 76],
    // 击败暗黑破坏神后, 经红门前往第五幕哈洛加斯。
    connects: ['river_of_flame', 'harrogath'],
  },
};
