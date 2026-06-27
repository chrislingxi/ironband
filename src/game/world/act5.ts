import type { LevelDef, PerDifficulty } from '@game/data/schema.ts';

// 第五幕区域数据 (哈洛加斯 / 雪山). 怪物复用现有 id, monLevel 接续第四幕至全游戏最高,
// 终点世界石要塞为终极 Boss 巴尔。

const ml = (n: number, nm: number, h: number): PerDifficulty<number> => ({ normal: n, nightmare: nm, hell: h });

export const ACT5_AREAS: Record<string, LevelDef> = {
  // 哈洛加斯 — 第五幕城镇, 雪山要塞
  harrogath: {
    id: 'harrogath',
    name: '哈洛加斯',
    act: 5,
    monLevel: ml(43, 75, 107),
    monsters: [],
    size: [58, 58],
    waypoint: true,
    isTown: true,
    connects: ['bloody_foothills'],
  },

  bloody_foothills: {
    id: 'bloody_foothills',
    name: '血色山麓',
    act: 5,
    monLevel: ml(44, 76, 108),
    monsters: ['hound', 'fallen', 'archer', 'brute'],
    size: [115, 115],
    connects: ['harrogath', 'frigid_highlands'],
  },

  frigid_highlands: {
    id: 'frigid_highlands',
    name: '冰封高地',
    act: 5,
    monLevel: ml(46, 77, 109),
    monsters: ['skeleton', 'shaman', 'archer', 'brute'],
    size: [120, 120],
    waypoint: true,
    connects: ['bloody_foothills', 'arreat_plateau'],
  },

  arreat_plateau: {
    id: 'arreat_plateau',
    name: '亚瑞特高原',
    act: 5,
    monLevel: ml(48, 78, 110),
    monsters: ['skeleton', 'brute', 'spitter', 'shaman'],
    size: [120, 120],
    waypoint: true,
    connects: ['frigid_highlands', 'crystalline_passage'],
  },

  crystalline_passage: {
    id: 'crystalline_passage',
    name: '水晶通道',
    act: 5,
    monLevel: ml(50, 79, 111),
    monsters: ['skeleton', 'shaman', 'brute'],
    size: [110, 110],
    waypoint: true,
    connects: ['arreat_plateau', 'ancients_way'],
  },

  ancients_way: {
    id: 'ancients_way',
    name: '远古之路',
    act: 5,
    monLevel: ml(52, 80, 112),
    monsters: ['brute', 'hound', 'shaman'],
    size: [108, 108],
    connects: ['crystalline_passage', 'worldstone_keep'],
  },

  // 世界石要塞 — 终极 Boss 巴尔, 全游戏终点
  worldstone_keep: {
    id: 'worldstone_keep',
    name: '世界石要塞',
    act: 5,
    monLevel: ml(55, 82, 115),
    monsters: ['brute', 'skeleton'],
    size: [78, 78],
    connects: ['ancients_way'],
  },
};
