// 营地经济: 商店库存 / 价格估算 / 赌博 / 鉴定. 全部纯函数(只依赖入参 + 注入 RNG),
// 不持有任何模块级可变状态, 便于复现与单测. 与 Game 的集成只在调用方完成(扣金/加物/移除).

import type { ItemInstance } from '@game/systems/items/types.ts';
import { generateItem, makeNormalItem } from '@game/systems/items/generate.ts';
import { ITEM_BASES } from '@game/data/items.ts';
import { randInt, type RNG } from '@engine/math/rng.ts';

// ── 调参常量 ──────────────────────────────────────────────────────────────

// 各稀有度的基础价值倍率 (白便宜 → 蓝 → 黄贵).
const RARITY_MULT: Record<ItemInstance['rarity'], number> = {
  normal: 1,
  magic: 4,
  rare: 12,
  set: 18,
  unique: 24,
};

// 单条词缀的附加价值(金币), 词缀越多越贵.
const AFFIX_VALUE = 35;

// 估价基准: 与基础需求等级挂钩, 高级基础更贵.
const BASE_VALUE = 8; // 每件最低底价
const REQLEVEL_VALUE = 6; // 每点 reqLevel 的加价

// 回收折价分母: 卖价 = floor(买价 / 4).
const SELL_DIVISOR = 4;

// 赌博: 基础花费 + 随等级线性增长.
const GAMBLE_BASE = 120;
const GAMBLE_PER_LEVEL = 80;

// 鉴定: 固定金币价(也可在调用方改用鉴定卷轴抵扣).
const IDENTIFY_GOLD = 100;

// ── 1. 商店库存 ─────────────────────────────────────────────────────────────

// 随机商店库存: 多数白装 + 少量蓝装, 全部视为已鉴定(白/蓝在生成时即完整可见).
// areaLevel 决定可售基础与词缀深度; count 为陈列件数.
export function generateShopStock(areaLevel: number, rng: RNG, count = 8): ItemInstance[] {
  const lvl = Math.max(1, Math.floor(areaLevel));
  const stock: ItemInstance[] = [];
  for (let i = 0; i < count; i++) {
    // 约 25% 概率出蓝装(magic), 其余为白装. 蓝装借用掉落生成器并强制偏向 magic.
    if (rng() < 0.25) {
      stock.push(rollMagicBiased(lvl, rng));
    } else {
      // 白装: 从该区域可售基础里随机取一个基础, 生成普通件.
      stock.push(makeNormalItem(pickShopBaseId(lvl, rng)));
    }
  }
  return stock;
}

// 从适配 areaLevel 的基础里随机挑一个 id (用于白装陈列).
function pickShopBaseId(areaLevel: number, rng: RNG): string {
  const eligible = ITEM_BASES.filter((b) => b.reqLevel <= areaLevel + 2);
  const pool = eligible.length ? eligible : ITEM_BASES;
  return pool[randInt(rng, 0, pool.length - 1)].id;
}

// ── 2~3. 价格 ───────────────────────────────────────────────────────────────

// 买价: 由稀有度倍率 × (底价 + reqLevel 加价) + 词缀加价 组成.
// 结果: 白便宜, 蓝中等, 黄(rare)最贵.
export function buyPrice(it: ItemInstance): number {
  const mult = RARITY_MULT[it.rarity] ?? 1;
  const baseWorth = BASE_VALUE + it.base.reqLevel * REQLEVEL_VALUE;
  const affixWorth = it.affixes.length * AFFIX_VALUE;
  const price = mult * baseWorth + affixWorth;
  return Math.max(1, Math.floor(price));
}

// 卖价: 回收价压低为买价的四分之一(向下取整, 最低 1).
export function sellPrice(it: ItemInstance): number {
  return Math.max(1, Math.floor(buyPrice(it) / SELL_DIVISOR));
}

// ── 4~5. 赌博 ───────────────────────────────────────────────────────────────

// 赌博花费: 随角色等级线性上升.
export function gambleCost(charLevel: number): number {
  const lvl = Math.max(1, Math.floor(charLevel));
  return GAMBLE_BASE + lvl * GAMBLE_PER_LEVEL;
}

// 赌出一件物品: 在角色等级附近生成, 偏向 magic, 小概率 rare(几乎不出白).
// 复用 generateItem 的稀有度滚动, 通过多次取样做偏置(不改动 generate.ts).
export function gambleItem(charLevel: number, rng: RNG): ItemInstance {
  const lvl = Math.max(1, Math.floor(charLevel));
  return rollMagicBiased(lvl, rng, /*rareChance*/ 0.1);
}

// 偏置生成: 多取样若干件, 优先返回稀有度更高者, 实现"蓝偏多, 小概率黄"的效果.
// rareChance 命中时优先选 rare; 否则优先选 magic; 都没有则用白装兜底.
function rollMagicBiased(mlvl: number, rng: RNG, rareChance = 0.04): ItemInstance {
  const samples = [generateItem(mlvl, rng), generateItem(mlvl, rng), generateItem(mlvl, rng)];
  const wantRare = rng() < rareChance;
  if (wantRare) {
    const rare = samples.find((s) => s.rarity === 'rare');
    if (rare) return rare;
  }
  const magic = samples.find((s) => s.rarity === 'magic');
  if (magic) return magic;
  const rare = samples.find((s) => s.rarity === 'rare');
  if (rare) return rare;
  return samples[0];
}

// ── 6. 鉴定 ─────────────────────────────────────────────────────────────────

// 鉴定花费(金币). 也可在调用方用鉴定卷轴替代金币支付.
export function identifyCost(): number {
  return IDENTIFY_GOLD;
}
