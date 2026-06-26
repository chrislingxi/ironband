import type { LevelDef, PerDifficulty } from '@game/data/schema.ts';

// 第一幕主线区域数据 (Levels.txt 风格). 结构忠实对标 D2 第一幕,
// 但所有数值/连接为本作设定. monLevel 按三难度分段, 营地最低, 安达莉尔巢穴最高.
// monsters 仅从现有 4 种怪 id (skeleton/zombie/fallen/shaman) 中搭配.

// 三难度等级辅助
const ml = (n: number, nm: number, h: number): PerDifficulty<number> => ({
  normal: n,
  nightmare: nm,
  hell: h,
});

export const AREAS: Record<string, LevelDef> = {
  // 罗格营地 — 城镇, 无刷怪, 含传送点
  rogue_encampment: {
    id: 'rogue_encampment',
    name: '罗格营地',
    act: 1,
    monLevel: ml(1, 36, 67),
    monsters: [],
    size: [60, 60],
    waypoint: true,
    isTown: true,
    connects: ['blood_moor'],
  },

  // 血腥旷野 — 出营地第一片野外
  blood_moor: {
    id: 'blood_moor',
    name: '血腥旷野',
    act: 1,
    monLevel: ml(2, 37, 68),
    monsters: ['fallen', 'zombie', 'hound'],
    size: [90, 90],
    connects: ['rogue_encampment', 'cold_plains', 'den_of_evil'],
  },

  // 寒冷平原 — 含传送点
  cold_plains: {
    id: 'cold_plains',
    name: '寒冷平原',
    act: 1,
    monLevel: ml(3, 38, 69),
    monsters: ['fallen', 'shaman', 'zombie', 'archer'],
    size: [110, 110],
    waypoint: true,
    connects: ['blood_moor', 'stony_field'],
  },

  // 邪恶巢穴 — 血腥旷野的支线洞窟 (任务一目标)
  den_of_evil: {
    id: 'den_of_evil',
    name: '邪恶巢穴',
    act: 1,
    monLevel: ml(2, 37, 68),
    monsters: ['fallen', 'shaman', 'zombie'],
    size: [55, 55],
    connects: ['blood_moor'],
  },

  // 石旷野 — 含传送点
  stony_field: {
    id: 'stony_field',
    name: '石旷野',
    act: 1,
    monLevel: ml(4, 39, 70),
    monsters: ['skeleton', 'fallen', 'shaman', 'brute'],
    size: [120, 120],
    waypoint: true,
    connects: ['cold_plains', 'dark_wood'],
  },

  // 黑暗森林 — 含传送点
  dark_wood: {
    id: 'dark_wood',
    name: '黑暗森林',
    act: 1,
    monLevel: ml(5, 40, 71),
    monsters: ['skeleton', 'zombie', 'shaman', 'spitter'],
    size: [115, 115],
    waypoint: true,
    connects: ['stony_field', 'burial_grounds'],
  },

  // 墓园 — 通往地下墓穴 (任务二: 姐妹安息之地)
  burial_grounds: {
    id: 'burial_grounds',
    name: '墓园',
    act: 1,
    monLevel: ml(6, 41, 72),
    monsters: ['skeleton', 'zombie', 'archer', 'hound'],
    size: [100, 100],
    connects: ['dark_wood', 'catacombs'],
  },

  // 地下墓穴 — 通往安达莉尔巢穴 (含传送点)
  catacombs: {
    id: 'catacombs',
    name: '地下墓穴',
    act: 1,
    monLevel: ml(8, 43, 74),
    monsters: ['skeleton', 'shaman', 'zombie', 'brute'],
    size: [90, 90],
    waypoint: true,
    connects: ['burial_grounds', 'andariel_lair'],
  },

  // 安达莉尔巢穴 — Boss 区域, 等级最高
  andariel_lair: {
    id: 'andariel_lair',
    name: '安达莉尔巢穴',
    act: 1,
    monLevel: ml(12, 46, 77),
    monsters: ['skeleton', 'shaman'],
    size: [70, 70],
    connects: ['catacombs'],
  },
};
