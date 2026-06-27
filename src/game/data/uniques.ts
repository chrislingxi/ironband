import type { StatKey } from '@game/systems/items/types.ts';

// 暗金 (Unique) 物品表 —— 每件绑定一个基础物品, 携带一组固定强力词缀与专名。
// 名称全部原创 (不照搬原版暗金), 但走 D2 暗金"固定词缀+辨识度"设计。
// 掉落时由 generate.ts 按等级抽取; 数值明显强于同级稀有, 给"金了!"的追求。

export interface UniqueDef {
  id: string;
  name: string; // 原创暗金专名
  baseId: string; // 关联基础物品 id (须存在于 ITEM_BASES)
  affixes: { stat: StatKey; value: number; label: string }[];
}

export const UNIQUES: UniqueDef[] = [
  {
    id: 'blooddrinker', name: '噬血者', baseId: 'hand_axe',
    affixes: [
      { stat: 'maxdam', value: 18, label: '+18 最大伤害' },
      { stat: 'dmg_perc', value: 60, label: '+60% 增强伤害' },
      { stat: 'lifeleech', value: 6, label: '6% 生命偷取' },
    ],
  },
  {
    id: 'frostfang', name: '霜牙', baseId: 'short_sword',
    affixes: [
      { stat: 'maxdam', value: 14, label: '+14 最大伤害' },
      { stat: 'dex', value: 15, label: '+15 敏捷' },
      { stat: 'res_cold', value: 30, label: '+30% 冰抗' },
    ],
  },
  {
    id: 'thunderfist', name: '雷拳', baseId: 'leather_gloves',
    affixes: [
      { stat: 'tohit', value: 80, label: '+80 命中' },
      { stat: 'dmg_perc', value: 30, label: '+30% 增强伤害' },
      { stat: 'res_lght', value: 25, label: '+25% 电抗' },
    ],
  },
  {
    id: 'oakenheart', name: '橡心甲', baseId: 'leather',
    affixes: [
      { stat: 'maxhp', value: 60, label: '+60 生命' },
      { stat: 'defense_perc', value: 80, label: '+80% 防御' },
      { stat: 'res_all', value: 15, label: '+15% 全抗' },
    ],
  },
  {
    id: 'ironward', name: '铁壁守卫', baseId: 'buckler',
    affixes: [
      { stat: 'defense_perc', value: 90, label: '+90% 防御' },
      { stat: 'res_all', value: 20, label: '+20% 全抗' },
      { stat: 'maxhp', value: 30, label: '+30 生命' },
    ],
  },
  {
    id: 'stormcrown', name: '雷冠', baseId: 'skull_cap',
    affixes: [
      { stat: 'res_lght', value: 40, label: '+40% 电抗' },
      { stat: 'energy', value: 20, label: '+20 精力' },
      { stat: 'maxhp', value: 25, label: '+25 生命' },
    ],
  },
  {
    id: 'dawnstrider', name: '曙光行者', baseId: 'leather_boots',
    affixes: [
      { stat: 'defense', value: 30, label: '+30 防御' },
      { stat: 'dex', value: 12, label: '+12 敏捷' },
      { stat: 'res_all', value: 12, label: '+12% 全抗' },
    ],
  },
  {
    id: 'vipercoil', name: '蝮蛇缠绕', baseId: 'sash',
    affixes: [
      { stat: 'res_pois', value: 45, label: '+45% 毒抗' },
      { stat: 'vit', value: 15, label: '+15 体能' },
      { stat: 'maxhp', value: 25, label: '+25 生命' },
    ],
  },
  {
    id: 'emberband', name: '余烬之戒', baseId: 'ring',
    affixes: [
      { stat: 'res_fire', value: 30, label: '+30% 火抗' },
      { stat: 'dmg_perc', value: 20, label: '+20% 增强伤害' },
      { stat: 'str', value: 12, label: '+12 力量' },
    ],
  },
  {
    id: 'soulward', name: '守魂符', baseId: 'amulet',
    affixes: [
      { stat: 'res_all', value: 25, label: '+25% 全抗' },
      { stat: 'maxhp', value: 40, label: '+40 生命' },
      { stat: 'energy', value: 15, label: '+15 精力' },
    ],
  },
];
