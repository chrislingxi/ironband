import type { ItemInstance, EquipSlot } from '@game/systems/items/index.ts';
import { emptyBag, accumulateItem } from '@game/systems/items/index.ts';
import { makeNormalItem } from '@game/systems/items/index.ts';
import type { DamageType } from '@game/data/schema.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';

// 角色: 基础属性 + 等级 + 装备. 派生战斗数值由 deriveCombat 计算 (装备改变战力).
export interface Character {
  cls: 'barbarian';
  level: number;
  xp: number;
  base: { str: number; dex: number; vit: number; energy: number };
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
}

// 野蛮人起手 (D2 量级): 力30敏20体25精10, 起手手斧
export function makeBarbarian(): Character {
  return {
    cls: 'barbarian', level: 1, xp: 0,
    base: { str: 30, dex: 20, vit: 25, energy: 10 },
    equipment: { weapon: makeNormalItem('hand_axe') },
  };
}

export interface Derived {
  maxHp: number;
  attackRating: number;
  defense: number;
  resist: Record<DamageType, number>;
  damage: DamageInstance[];
  attrs: { str: number; dex: number; vit: number; energy: number };
}

const RES_CAP = 75;

// 派生战斗数值 (近似 D2 公式, 可调; 关键是装备显著改变战力)
export function deriveCombat(ch: Character): Derived {
  const bag = emptyBag();
  let armorDef = 0;
  let weapon: ItemInstance | undefined;
  for (const key of Object.keys(ch.equipment) as EquipSlot[]) {
    const it = ch.equipment[key];
    if (!it) continue;
    accumulateItem(bag, it);
    if (it.base.baseDefense) armorDef += Math.floor((it.base.baseDefense[0] + it.base.baseDefense[1]) / 2);
    if (it.base.slot === 'weapon') weapon = it;
  }
  const str = ch.base.str + (bag.str ?? 0);
  const dex = ch.base.dex + (bag.dex ?? 0);
  const vit = ch.base.vit + (bag.vit ?? 0);
  const energy = ch.base.energy + (bag.energy ?? 0);

  const maxHp = Math.round(55 + (vit - 25) * 4 + (ch.level - 1) * 2 + (bag.maxhp ?? 0));
  const attackRating = Math.round((dex * 5 + (bag.tohit ?? 0)) * (1 + (bag.tohit_perc ?? 0) / 100));
  const defense = Math.round((armorDef + (bag.defense ?? 0)) * (1 + (bag.defense_perc ?? 0) / 100) + dex / 4);

  const wMin = weapon?.base.baseDamage?.[0] ?? 1;
  const wMax = weapon?.base.baseDamage?.[1] ?? 2;
  const dmgMult = 1 + (bag.dmg_perc ?? 0) / 100 + str / 100; // 力量增伤 ~1%/点
  const min = Math.max(1, Math.round((wMin + (bag.mindam ?? 0)) * dmgMult));
  const max = Math.max(min, Math.round((wMax + (bag.maxdam ?? 0)) * dmgMult));
  const damage: DamageInstance[] = [{ type: 'physical', min, max }];

  const resAll = bag.res_all ?? 0;
  const resist: Record<DamageType, number> = {
    physical: 0,
    fire: Math.min(RES_CAP, (bag.res_fire ?? 0) + resAll),
    cold: Math.min(RES_CAP, (bag.res_cold ?? 0) + resAll),
    lightning: Math.min(RES_CAP, (bag.res_lght ?? 0) + resAll),
    poison: Math.min(RES_CAP, (bag.res_pois ?? 0) + resAll),
    magic: 0,
  };
  return { maxHp, attackRating, defense, resist, damage, attrs: { str, dex, vit, energy } };
}
