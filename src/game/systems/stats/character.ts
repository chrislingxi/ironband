import type { ItemInstance, EquipSlot } from '@game/systems/items/index.ts';
import { emptyBag, accumulateItem, accumulateSockets, addStat } from '@game/systems/items/index.ts';
import { SETS } from '@game/data/sets.ts';
import { makeNormalItem } from '@game/systems/items/index.ts';
import type { DamageType, CharClass } from '@game/data/schema.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';

// 逐职业生命标定 (修复: 旧公式按野蛮人体能25标定, 导致法师/亚马逊起手血量为负).
// base = 该职业起手体能下的1级生命; 体能每点 perVit; 每级 perLevel.
// 生命曲线 (M4 数值校验上调: 后期角色有效血过低导致地狱被秒, 提升 perVit/perLevel)。
const LIFE: Record<CharClass, { base: number; startVit: number; perVit: number; perLevel: number }> = {
  barbarian: { base: 70, startVit: 25, perVit: 8, perLevel: 4 },
  amazon: { base: 54, startVit: 20, perVit: 4, perLevel: 2.5 },
  sorceress: { base: 46, startVit: 10, perVit: 3, perLevel: 2 },
};

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
  lifeleech: number; // 装备吸血% (命中按物理伤害回血)
  ias: number; // 攻击速度% (走突破点)
  fhr: number; // 受身恢复% (走突破点)
}

const RES_CAP = 75;

// 派生战斗数值 (近似 D2 公式, 可调; 关键是装备显著改变战力)
/** 被动技能增益 (由技能树折算; 缺省为零)。与 classes/skilltree.PassiveBonuses 同形。 */
export interface PassiveBonusInput {
  arPerc?: number;
  dmgPerc?: number;
  defPerc?: number;
  resAll?: number;
}
export function deriveCombat(ch: Character, passive: PassiveBonusInput = {}, extra: Partial<Record<string, number>> = {}): Derived {
  const bag = emptyBag();
  // 额外永久增益 (任务奖励等) 先并入 bag, 与装备同等参与派生。
  for (const k of Object.keys(extra)) addStat(bag, k as never, extra[k] ?? 0);
  let armorDef = 0;
  let weapon: ItemInstance | undefined;
  for (const key of Object.keys(ch.equipment) as EquipSlot[]) {
    const it = ch.equipment[key];
    if (!it) continue;
    accumulateItem(bag, it);
    accumulateSockets(bag, it); // 镶嵌符文 + 符文之语贡献
    if (it.base.baseDefense) armorDef += Math.floor((it.base.baseDefense[0] + it.base.baseDefense[1]) / 2);
    if (it.base.slot === 'weapon') weapon = it;
  }
  // 套装加成: 统计每套已穿件数, 应用所有 count ≤ 已穿数 的档位加成 (递进叠加)。
  const setCount: Record<string, number> = {};
  for (const key of Object.keys(ch.equipment) as EquipSlot[]) {
    const sid = ch.equipment[key]?.setId;
    if (sid) setCount[sid] = (setCount[sid] ?? 0) + 1;
  }
  for (const set of SETS) {
    const have = setCount[set.id] ?? 0;
    if (have < 2) continue;
    for (const tier of set.bonuses) {
      if (have >= tier.count) for (const m of tier.mods) addStat(bag, m.stat, m.value);
    }
  }
  const str = ch.base.str + (bag.str ?? 0);
  const dex = ch.base.dex + (bag.dex ?? 0);
  const vit = ch.base.vit + (bag.vit ?? 0);
  const energy = ch.base.energy + (bag.energy ?? 0);

  const L = LIFE[ch.cls as CharClass] ?? LIFE.barbarian;
  const maxHp = Math.max(20, Math.round(L.base + (vit - L.startVit) * L.perVit + (ch.level - 1) * L.perLevel + (bag.maxhp ?? 0)));
  // 被动技能: 精通/穿透→命中, 铁壁→防御, 天生抗性→全抗 (合议 S2)。
  // 命中(AR): 敏捷×5 + 等级×7(基础随等级成长, 让力量型近战也能命中高防Boss) + 装备命中, 再乘百分比加成。
  const attackRating = Math.round((dex * 5 + ch.level * 7 + (bag.tohit ?? 0)) * (1 + ((bag.tohit_perc ?? 0) + (passive.arPerc ?? 0)) / 100));
  // 铁壁(defPerc)增益作用于总防御(含敏捷贡献), 无甲时也有效。
  const defense = Math.round(
    ((armorDef + (bag.defense ?? 0)) * (1 + (bag.defense_perc ?? 0) / 100) + dex / 4) *
      (1 + (passive.defPerc ?? 0) / 100),
  );

  const wMin = weapon?.base.baseDamage?.[0] ?? 1;
  const wMax = weapon?.base.baseDamage?.[1] ?? 2;
  const dmgMult = 1 + ((bag.dmg_perc ?? 0) + (passive.dmgPerc ?? 0)) / 100 + str / 100; // 力量+被动精通增伤
  const min = Math.max(1, Math.round((wMin + (bag.mindam ?? 0)) * dmgMult));
  const max = Math.max(min, Math.round((wMax + (bag.maxdam ?? 0)) * dmgMult));
  const damage: DamageInstance[] = [{ type: 'physical', min, max }];

  const resAll = (bag.res_all ?? 0) + (passive.resAll ?? 0);
  const resist: Record<DamageType, number> = {
    physical: 0,
    fire: Math.min(RES_CAP, (bag.res_fire ?? 0) + resAll),
    cold: Math.min(RES_CAP, (bag.res_cold ?? 0) + resAll),
    lightning: Math.min(RES_CAP, (bag.res_lght ?? 0) + resAll),
    poison: Math.min(RES_CAP, (bag.res_pois ?? 0) + resAll),
    magic: 0,
  };
  return { maxHp, attackRating, defense, resist, damage, attrs: { str, dex, vit, energy }, lifeleech: bag.lifeleech ?? 0, ias: bag.ias ?? 0, fhr: bag.fhr ?? 0 };
}
