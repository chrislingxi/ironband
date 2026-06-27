import type { ItemBase, Affix, Rarity } from '@game/data/schema.ts';
import { ITEM_BASES, AFFIXES, RARE_WORDS } from '@game/data/items.ts';
import { UNIQUES, type UniqueDef } from '@game/data/uniques.ts';
import type { ItemInstance, RolledAffix, EquipSlot } from './types.ts';
import { randInt, type RNG } from '@engine/math/rng.ts';

let uidSeq = 1;

// 暗金: 从等级允许的暗金里随机取一件 (按其基础物品需求等级筛)。
function pickUnique(ilvl: number, rng: RNG): UniqueDef | null {
  const pool = UNIQUES.filter((u) => {
    const base = ITEM_BASES.find((b) => b.id === u.baseId);
    return base && base.reqLevel <= ilvl + 2;
  });
  if (pool.length === 0) return null;
  return pool[randInt(rng, 0, pool.length - 1)];
}

// 由暗金定义产出一件暗金物品 (固定词缀 + 专名; 未鉴定)。
function makeUnique(u: UniqueDef, ilvl: number): ItemInstance {
  const base = ITEM_BASES.find((b) => b.id === u.baseId)!;
  const affixes: RolledAffix[] = u.affixes.map((a, i) => ({
    id: `${u.id}_${i}`, kind: i % 2 === 0 ? 'prefix' : 'suffix', stat: a.stat, value: a.value, label: a.label,
  }));
  return { uid: uidSeq++, base, rarity: 'unique', ilvl, affixes, name: u.name, identified: false };
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

// 主入口: 按怪物等级 mlvl 生成一件掉落。
// rarityBoost: 暗金概率放大 (精英~3, Boss~10), 让"刷Boss/精英出金"成立。
export function generateItem(mlvl: number, rng: RNG, rarityBoost = 1): ItemInstance {
  const ilvl = Math.max(1, mlvl);
  // 先掷暗金 (概率随等级与稀有加成上升, 封顶 8%)。
  const uniqueChance = Math.min(0.08, (0.004 + ilvl * 0.0004) * rarityBoost);
  if (rng() < uniqueChance) {
    const u = pickUnique(ilvl, rng);
    if (u) return makeUnique(u, ilvl);
  }
  const eligible = ITEM_BASES.filter((b) => b.reqLevel <= ilvl + 2);
  const base = (eligible.length ? eligible : ITEM_BASES)[randInt(rng, 0, (eligible.length ? eligible : ITEM_BASES).length - 1)];
  const rarity = rollRarity(rng, ilvl);
  const affixes = rollAffixes(base, ilvl, rarity, rng);
  const identified = rarity === 'normal' || rarity === 'magic'; // 稀有/套装/暗金需鉴定
  return { uid: uidSeq++, base, rarity, ilvl, affixes, name: makeName(base, rarity, affixes, rng), identified };
}
