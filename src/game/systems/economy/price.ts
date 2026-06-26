// 经济定价: 由物品基础属性 + 稀有度 + 词缀粗略估值. 纯函数, 供商店买卖/赌博/雇佣兵复用.
import type { ItemInstance } from '@game/systems/items/index.ts';
import type { Rarity } from '@game/data/schema.ts';

// 稀有度价值乘数 (越稀有越值钱)
const RARITY_MULT: Record<Rarity, number> = {
  normal: 1, magic: 3, rare: 7, set: 10, unique: 16,
};

// 基础价值: 由需求等级 + 武器伤害 / 护甲防御估算.
export function baseValue(it: ItemInstance): number {
  const b = it.base;
  let v = 15 + b.reqLevel * 8;
  if (b.baseDamage) v += (b.baseDamage[0] + b.baseDamage[1]) * 6;
  if (b.baseDefense) v += (b.baseDefense[0] + b.baseDefense[1]) * 3;
  return v;
}

// 词缀加成: 每条词缀按数值绝对值粗略加权.
export function affixValue(it: ItemInstance): number {
  let v = 0;
  for (const a of it.affixes) v += 20 + Math.abs(a.value) * 4;
  return v;
}

// 买价 (商店出售给玩家的标价).
export function buyPrice(it: ItemInstance): number {
  return Math.round((baseValue(it) + affixValue(it)) * RARITY_MULT[it.rarity]);
}

// 卖价 ≈ 买价 1/4 (D2 风格), 至少 1 金.
export function sellPrice(it: ItemInstance): number {
  return Math.max(1, Math.floor(buyPrice(it) / 4));
}

// 赌博花费: 随区域等级上升, 略高于同级装备均价 (赌博是高风险高回报).
export function gamblePrice(mlvl: number): number {
  return 250 + Math.max(0, mlvl) * 120;
}

// 鉴定花费 (单件). 营地凯恩免费, 此价用于野外卷轴 (暂保留接口).
export function identifyPrice(): number {
  return 50;
}

// 雇佣兵雇佣花费 (随角色等级上升).
export function mercHirePrice(charLevel: number): number {
  return 120 + Math.max(0, charLevel) * 35;
}

// 雇佣兵复活花费 (随雇佣兵等级上升).
export function mercRevivePrice(mercLevel: number): number {
  return 80 + Math.max(0, mercLevel) * 40;
}
