import type { LevelDef, PerDifficulty } from '@game/data/schema.ts';

// 第三幕区域数据 (库拉斯特丛林). 结构对标 D2 第三幕主线, 数值/连接为本作设定。
// 怪物复用现有 id, monLevel 接续第二幕继续抬升, 终点仇恨监狱为梅菲斯特 Boss 区。

const ml = (n: number, nm: number, h: number): PerDifficulty<number> => ({
  normal: n,
  nightmare: nm,
  hell: h,
});

export const ACT3_AREAS: Record<string, LevelDef> = {
  // 卡纳镇 — 第三幕城镇, 丛林海港
  kurast_docks: {
    id: 'kurast_docks',
    name: '卡纳镇',
    act: 3,
    monLevel: ml(25, 60, 92),
    monsters: [],
    size: [62, 62],
    waypoint: true,
    isTown: true,
    connects: ['spider_forest'],
  },

  spider_forest: {
    id: 'spider_forest',
    name: '蜘蛛森林',
    act: 3,
    monLevel: ml(26, 61, 93),
    monsters: ['spitter', 'fallen', 'hound', 'shaman'],
    size: [120, 120],
    connects: ['kurast_docks', 'great_marsh'],
  },

  great_marsh: {
    id: 'great_marsh',
    name: '大沼泽',
    act: 3,
    monLevel: ml(27, 62, 94),
    monsters: ['zombie', 'spitter', 'archer', 'brute'],
    size: [125, 125],
    waypoint: true,
    connects: ['spider_forest', 'flayer_jungle'],
  },

  flayer_jungle: {
    id: 'flayer_jungle',
    name: '剥皮丛林',
    act: 3,
    monLevel: ml(28, 63, 95),
    monsters: ['fallen', 'shaman', 'hound', 'spitter'],
    size: [120, 120],
    connects: ['great_marsh', 'kurast_bazaar'],
  },

  kurast_bazaar: {
    id: 'kurast_bazaar',
    name: '库拉斯特集市',
    act: 3,
    monLevel: ml(30, 64, 96),
    monsters: ['skeleton', 'brute', 'shaman', 'archer'],
    size: [115, 115],
    waypoint: true,
    connects: ['flayer_jungle', 'travincal'],
  },

  travincal: {
    id: 'travincal',
    name: '崔凡克',
    act: 3,
    monLevel: ml(32, 66, 98),
    monsters: ['brute', 'skeleton', 'shaman'],
    size: [105, 105],
    connects: ['kurast_bazaar', 'durance_of_hate'],
  },

  // 仇恨监狱 — 梅菲斯特 Boss 区, 第三幕终点
  durance_of_hate: {
    id: 'durance_of_hate',
    name: '仇恨监狱',
    act: 3,
    monLevel: ml(36, 68, 100),
    monsters: ['skeleton', 'shaman'],
    size: [74, 74],
    connects: ['travincal'],
  },
};
