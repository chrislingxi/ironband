// 符文与符文之语 (原创命名, 借鉴 D2 镶嵌系统)。
// 符文镶入带孔装备后提供属性; 按特定顺序集齐则触发"符文之语"额外加成。
import type { StatKey } from '@game/systems/items/types.ts';

export interface RuneDef {
  id: string;
  name: string;
  mods: { stat: StatKey; value: number }[]; // 镶入后提供的属性
}

// 8 枚基础符文 (掉落物); 单孔即有用, 集齐成语更强。
export const RUNES: RuneDef[] = [
  { id: 'r_tir', name: '提尔符', mods: [{ stat: 'maxmana', value: 8 }] },
  { id: 'r_eld', name: '艾尔德符', mods: [{ stat: 'tohit', value: 30 }] },
  { id: 'r_nef', name: '奈夫符', mods: [{ stat: 'defense', value: 20 }] },
  { id: 'r_ith', name: '伊斯符', mods: [{ stat: 'maxdam', value: 9 }] },
  { id: 'r_tal', name: '塔尔符', mods: [{ stat: 'res_pois', value: 15 }] },
  { id: 'r_ral', name: '拉尔符', mods: [{ stat: 'res_fire', value: 15 }] },
  { id: 'r_ort', name: '奥特符', mods: [{ stat: 'res_lght', value: 15 }] },
  { id: 'r_thul', name: '索尔符', mods: [{ stat: 'res_cold', value: 15 }] },
];

export function runeById(id: string): RuneDef | undefined {
  return RUNES.find((r) => r.id === id);
}

// 装备大类 (符文之语限定可镶的底材类型)。
export type SocketBaseClass = 'weapon' | 'armor' | 'helm' | 'shield';

export interface RunewordDef {
  id: string;
  name: string;           // 成语专名 (替换物品显示名)
  runes: string[];        // 必须按此顺序镶满
  bases: SocketBaseClass[]; // 可成型的底材大类
  mods: { stat: StatKey; value: number }[]; // 额外加成 (叠加在符文本身之上)
}

// 4 条入门符文之语 (原创命名)。
export const RUNEWORDS: RunewordDef[] = [
  {
    id: 'rw_steel', name: '寒钢', runes: ['r_tir', 'r_eld'], bases: ['weapon'],
    mods: [{ stat: 'dmg_perc', value: 25 }, { stat: 'tohit', value: 50 }],
  },
  {
    id: 'rw_ward', name: '壁垒', runes: ['r_nef', 'r_thul'], bases: ['armor', 'shield'],
    mods: [{ stat: 'defense_perc', value: 30 }, { stat: 'res_all', value: 8 }],
  },
  {
    id: 'rw_ember', name: '余烬', runes: ['r_ral', 'r_ort', 'r_tal'], bases: ['armor', 'helm'],
    mods: [{ stat: 'res_all', value: 12 }, { stat: 'maxhp', value: 25 }],
  },
  {
    id: 'rw_fury', name: '狂怒', runes: ['r_ith', 'r_eld', 'r_tir'], bases: ['weapon'],
    mods: [{ stat: 'dmg_perc', value: 45 }, { stat: 'lifeleech', value: 5 }],
  },
];
