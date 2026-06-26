import type { ItemBase, Affix, Rarity } from '@game/data/schema.ts';
import { ITEM_BASES, AFFIXES, RARE_WORDS, UNIQUE_NAMES } from '@game/data/items.ts';
import type { ItemInstance, RolledAffix, EquipSlot } from './types.ts';
import { randInt, type RNG } from '@engine/math/rng.ts';

let uidSeq = 1;

// 稀有/暗金掉落未鉴定; 普通/魔法默认已鉴定.
function defaultIdentified(rarity: Rarity): boolean {
  return rarity === 'normal' || rarity === 'magic';
}

function affixApplies(a: Affix, slot: EquipSlot): boolean {
  return a.appliesTo.includes('any') || a.appliesTo.includes(slot);
}

function rollRarity(rng: RNG, ilvl: number): Rarity {
  const r = rng();
  const rareChance = Math.min(0.14, 0.04 + ilvl * 0.004);
  const magicChance = 0.42;
  if (r < rareChance) return 'rare';
  if (r < rareChance + magicChance) return 'magic';
  return 'normal';
}

function weightedPick<T extends { frequency: number }>(items: T[], rng: RNG): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.frequency, 0);
  let roll = rng() * total;
  for (const i of items) {
    roll -= i.frequency;
    if (roll <= 0) return i;
  }
  return items[items.length - 1];
}

function rollAffix(a: Affix, rng: RNG): RolledAffix {
  return {
    id: a.id, kind: a.kind, stat: a.stat as RolledAffix['stat'],
    value: randInt(rng, a.range[0], a.range[1]), label: a.name,
  };
}

// 滚词缀: magic = 至多1前+1后(至少1); rare = 至多3前+3后(共3-6)
function rollAffixes(base: ItemBase, ilvl: number, rarity: Rarity, rng: RNG): RolledAffix[] {
  if (rarity === 'normal') return [];
  const slot = base.slot;
  const pool = AFFIXES.filter((a) => a.level <= ilvl && a.rarity.includes(rarity as 'magic' | 'rare') && affixApplies(a, slot));
  const prefixes = pool.filter((a) => a.kind === 'prefix');
  const suffixes = pool.filter((a) => a.kind === 'suffix');
  const out: RolledAffix[] = [];
  const usedStats = new Set<string>();
  const take = (from: Affix[], n: number) => {
    const avail = from.filter((a) => !usedStats.has(a.stat));
    for (let i = 0; i < n; i++) {
      const pick = weightedPick(avail.filter((a) => !usedStats.has(a.stat)), rng);
      if (!pick) break;
      usedStats.add(pick.stat);
      out.push(rollAffix(pick, rng));
    }
  };
  if (rarity === 'magic') {
    const nP = rng() < 0.5 ? 1 : 0;
    const nS = nP === 0 ? 1 : rng() < 0.6 ? 1 : 0;
    take(prefixes, nP);
    take(suffixes, nS);
    if (out.length === 0) take(prefixes.length ? prefixes : suffixes, 1); // 保底1条
  } else {
    take(prefixes, randInt(rng, 1, 3));
    take(suffixes, randInt(rng, 1, 3));
  }
  return out;
}

function makeName(base: ItemBase, rarity: Rarity, affixes: RolledAffix[], rng: RNG): string {
  if (rarity === 'normal') return base.name;
  if (rarity === 'magic') {
    const pre = affixes.find((a) => a.kind === 'prefix');
    const suf = affixes.find((a) => a.kind === 'suffix');
    return `${pre ? pre.label : ''}${base.name}${suf ? '·' + suf.label : ''}`;
  }
  // rare: 两词拼名 + 基础
  const w1 = RARE_WORDS[randInt(rng, 0, RARE_WORDS.length - 1)];
  let w2 = RARE_WORDS[randInt(rng, 0, RARE_WORDS.length - 1)];
  if (w2 === w1) w2 = RARE_WORDS[(RARE_WORDS.indexOf(w1) + 1) % RARE_WORDS.length];
  return `${w1}${w2} ${base.name}`;
}

// 生成一件普通(白色)指定基础物品 (起手装备/商店用)
export function makeNormalItem(baseId: string): ItemInstance {
  const base = ITEM_BASES.find((b) => b.id === baseId);
  if (!base) throw new Error(`no base ${baseId}`);
  return { uid: uidSeq++, base, rarity: 'normal', ilvl: base.reqLevel, affixes: [], name: base.name, identified: true };
}

// 在 ilvl±2 范围内随机挑一件可用基础物品.
function pickBase(ilvl: number, rng: RNG): ItemBase {
  const eligible = ITEM_BASES.filter((b) => b.reqLevel <= ilvl + 2);
  const pool = eligible.length ? eligible : ITEM_BASES;
  return pool[randInt(rng, 0, pool.length - 1)];
}

// 主入口: 按怪物等级 mlvl 生成一件掉落
export function generateItem(mlvl: number, rng: RNG): ItemInstance {
  const ilvl = Math.max(1, mlvl);
  const base = pickBase(ilvl, rng);
  const rarity = rollRarity(rng, ilvl);
  const affixes = rollAffixes(base, ilvl, rarity, rng);
  return { uid: uidSeq++, base, rarity, ilvl, affixes, name: makeName(base, rarity, affixes, rng), identified: defaultIdentified(rarity) };
}

// 暗金(unique): 在 rare 词缀基础上多滚 1 条并取偏高数值, 用专名命名. 未鉴定.
// 说明: 本作暂以"程序化暗金"实现 (无固定暗金表), 仍保留刷出史诗装的悬念.
export function generateUniqueItem(mlvl: number, rng: RNG): ItemInstance {
  const ilvl = Math.max(1, mlvl);
  const base = pickBase(ilvl, rng);
  const pool = AFFIXES.filter((a) => a.level <= ilvl && affixApplies(a, base.slot));
  const affixes: RolledAffix[] = [];
  const used = new Set<string>();
  const n = randInt(rng, 4, 6);
  for (let i = 0; i < n && pool.length; i++) {
    const avail = pool.filter((a) => !used.has(a.stat));
    const pick = weightedPick(avail, rng);
    if (!pick) break;
    used.add(pick.stat);
    // 暗金取上半区数值 (偏高)
    const mid = Math.ceil((pick.range[0] + pick.range[1]) / 2);
    affixes.push({ id: pick.id, kind: pick.kind, stat: pick.stat as RolledAffix['stat'], value: randInt(rng, mid, pick.range[1]), label: pick.name });
  }
  const name = `${UNIQUE_NAMES[randInt(rng, 0, UNIQUE_NAMES.length - 1)]}·${base.name}`;
  return { uid: uidSeq++, base, rarity: 'unique', ilvl, affixes, name, identified: false };
}

// 商店货架: 已鉴定, 偏向普通/魔法, 偶有稀有 (绝不暗金).
export function generateShopItem(mlvl: number, rng: RNG): ItemInstance {
  const ilvl = Math.max(1, mlvl);
  const base = pickBase(ilvl, rng);
  const r = rng();
  const rarity: Rarity = r < 0.12 ? 'rare' : r < 0.55 ? 'magic' : 'normal';
  const affixes = rollAffixes(base, ilvl, rarity, rng);
  return { uid: uidSeq++, base, rarity, ilvl, affixes, name: makeName(base, rarity, affixes, rng), identified: true };
}

// 赌博出货: 未鉴定, 必为魔法及以上, 小概率暗金 — 悬念全在鉴定那一刻.
export function generateGambleItem(mlvl: number, rng: RNG): ItemInstance {
  const ilvl = Math.max(1, mlvl);
  const r = rng();
  if (r < 0.03) return generateUniqueItem(ilvl, rng); // 3% 赌出暗金
  const base = pickBase(ilvl, rng);
  const rarity: Rarity = r < 0.38 ? 'rare' : 'magic'; // 其余: ~36% 稀有, 余下魔法
  const affixes = rollAffixes(base, ilvl, rarity, rng);
  return { uid: uidSeq++, base, rarity, ilvl, affixes, name: makeName(base, rarity, affixes, rng), identified: false };
}
