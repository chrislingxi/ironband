import type { StatKey } from '@game/systems/items/types.ts';

// 套装 (Set) 系统 —— 成套穿戴触发递进加成 (穿得越多越强), 对标 D2 套装。
// 名称全部原创。每件套装物品绑定一个基础物品 + 自带固定词缀; 另有"套装加成"按已穿件数生效。

export interface SetItemDef {
  id: string;
  name: string;       // 套装件专名
  setId: string;      // 所属套装
  baseId: string;     // 关联基础物品 id
  affixes: { stat: StatKey; value: number; label: string }[]; // 单件固定词缀
}

export interface SetDef {
  id: string;
  name: string;       // 套装名
  // 套装加成: 已穿 count 件(含)时额外生效的属性 (递进; 各档独立叠加)。
  bonuses: { count: number; mods: { stat: StatKey; value: number }[] }[];
}

// 两套入门套装 (各 3 件)。
export const SETS: SetDef[] = [
  {
    id: 'set_warden', name: '守誓者',
    bonuses: [
      { count: 2, mods: [{ stat: 'res_all', value: 12 }] },
      { count: 3, mods: [{ stat: 'defense_perc', value: 40 }, { stat: 'maxhp', value: 50 }] },
    ],
  },
  {
    id: 'set_hunter', name: '逐影猎手',
    bonuses: [
      { count: 2, mods: [{ stat: 'dmg_perc', value: 30 }] },
      { count: 3, mods: [{ stat: 'tohit', value: 120 }, { stat: 'lifeleech', value: 4 }] },
    ],
  },
];

export const SET_ITEMS: SetItemDef[] = [
  // 守誓者 (头/甲/盾)
  {
    id: 'warden_helm', name: '守誓者·铁面', setId: 'set_warden', baseId: 'skull_cap',
    affixes: [{ stat: 'defense', value: 30, label: '+30 防御' }, { stat: 'res_all', value: 8, label: '+8% 全抗' }],
  },
  {
    id: 'warden_armor', name: '守誓者·胸甲', setId: 'set_warden', baseId: 'chain',
    affixes: [{ stat: 'defense', value: 60, label: '+60 防御' }, { stat: 'maxhp', value: 30, label: '+30 生命' }],
  },
  {
    id: 'warden_shield', name: '守誓者·壁盾', setId: 'set_warden', baseId: 'small_shield',
    affixes: [{ stat: 'defense', value: 40, label: '+40 防御' }, { stat: 'res_all', value: 8, label: '+8% 全抗' }],
  },
  // 逐影猎手 (武/手/脚)
  {
    id: 'hunter_weapon', name: '逐影·裂爪', setId: 'set_hunter', baseId: 'mace',
    affixes: [{ stat: 'maxdam', value: 16, label: '+16 最大伤害' }, { stat: 'tohit', value: 60, label: '+60 命中' }],
  },
  {
    id: 'hunter_gloves', name: '逐影·捷手', setId: 'set_hunter', baseId: 'leather_gloves',
    affixes: [{ stat: 'dex', value: 12, label: '+12 敏捷' }, { stat: 'tohit', value: 40, label: '+40 命中' }],
  },
  {
    id: 'hunter_boots', name: '逐影·疾行', setId: 'set_hunter', baseId: 'leather_boots',
    affixes: [{ stat: 'dex', value: 10, label: '+10 敏捷' }, { stat: 'res_all', value: 8, label: '+8% 全抗' }],
  },
];

export function setItemById(id: string): SetItemDef | undefined {
  return SET_ITEMS.find((s) => s.id === id);
}
export function setById(id: string): SetDef | undefined {
  return SETS.find((s) => s.id === id);
}
