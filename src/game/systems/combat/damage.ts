import type { DamageType } from '@game/data/schema.ts';
import type { DamageInstance } from './types.ts';
import { randInt, type RNG } from '@engine/math/rng.ts';

// 抗性减免: applied = floor(amount · (100 - resist)/100). resist>=100 → 免疫(0).
export function applyResist(amount: number, type: DamageType, resist: Record<DamageType, number>): number {
  const r = resist[type] ?? 0;
  if (r >= 100) return 0;
  return Math.max(0, Math.floor((amount * (100 - r)) / 100));
}

// 掷一组伤害实例, 逐类抗性减免, 返回分类与合计.
export function rollDamage(
  dmg: DamageInstance[],
  resist: Record<DamageType, number>,
  rng: RNG,
): { byType: Partial<Record<DamageType, number>>; total: number } {
  const byType: Partial<Record<DamageType, number>> = {};
  let total = 0;
  for (const d of dmg) {
    const raw = randInt(rng, d.min, d.max);
    const applied = applyResist(raw, d.type, resist);
    byType[d.type] = (byType[d.type] ?? 0) + applied;
    total += applied;
  }
  return { byType, total };
}
