import type { ItemBase, Rarity } from '@game/data/schema.ts';

export type EquipSlot = ItemBase['slot'];

// 属性键 (ItemStatCost 风格, 派生属性层消费). 原创键名.
export type StatKey =
  | 'maxhp' | 'maxmana'
  | 'tohit' | 'tohit_perc'        // 命中(AR) 平/百分比
  | 'defense' | 'defense_perc'    // 防御 平/百分比
  | 'mindam' | 'maxdam' | 'dmg_perc' // 伤害 平/增强%
  | 'str' | 'dex' | 'vit' | 'energy'
  | 'res_fire' | 'res_cold' | 'res_lght' | 'res_pois' | 'res_all'
  | 'lifeleech';                  // 生命偷取 %

export interface RolledAffix {
  id: string;
  kind: 'prefix' | 'suffix';
  stat: StatKey;
  value: number;
  label: string; // 显示名(原创)
}

export interface ItemInstance {
  uid: number;
  base: ItemBase;
  rarity: Rarity;
  ilvl: number;
  affixes: RolledAffix[];
  name: string; // 生成名
}

// 各属性合计 (装备贡献 + 基础)
export type StatBag = Partial<Record<StatKey, number>>;

export function emptyBag(): StatBag {
  return {};
}

export function addStat(bag: StatBag, key: StatKey, v: number): void {
  bag[key] = (bag[key] ?? 0) + v;
}

// 汇总一件装备的词缀到 bag
export function accumulateItem(bag: StatBag, item: ItemInstance): void {
  for (const a of item.affixes) addStat(bag, a.stat, a.value);
}
