import { describe, it, expect } from 'vitest';
import {
  chanceToHit,
  applyResist,
  rollDamage,
  hitRecoveryFrames,
  resolveAttack,
  type Combatant,
} from '../src/game/systems/combat/index.ts';
import type { DamageType } from '../src/game/data/schema.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

const zeroResist = (): Record<DamageType, number> => ({
  physical: 0, fire: 0, cold: 0, lightning: 0, poison: 0, magic: 0,
});

function dummy(over: Partial<Combatant> = {}): Combatant {
  return {
    level: 1, hp: 100, maxHp: 100, attackRating: 100, defense: 0,
    resist: zeroResist(), fhr: 0, hitRecoveryFrames: 10, stunUntilMs: 0, ...over,
  };
}

describe('chanceToHit (Arreat Summit 公式)', () => {
  it('钳制在 [5,95]', () => {
    expect(chanceToHit(99999, 0, 99, 1)).toBe(95); // 极强攻击仍≤95
    expect(chanceToHit(0, 99999, 1, 99)).toBe(5); // 极弱攻击仍≥5
  });
  it('AR=DR 且同级 → 50%', () => {
    // 100·(AR/(AR+DR)) · 2·L/(L+L) = 100·0.5·1 = 50
    expect(chanceToHit(500, 500, 30, 30)).toBeCloseTo(50, 5);
  });
  it('防御越高命中越低 (单调)', () => {
    expect(chanceToHit(1000, 200, 20, 20)).toBeGreaterThan(chanceToHit(1000, 800, 20, 20));
  });
});

describe('applyResist', () => {
  it('75% 抗 → 伤害 1/4 (向下取整)', () => {
    expect(applyResist(100, 'fire', { ...zeroResist(), fire: 75 })).toBe(25);
  });
  it('>=100% → 免疫(0)', () => {
    expect(applyResist(9999, 'cold', { ...zeroResist(), cold: 100 })).toBe(0);
  });
  it('负抗(增伤)... 0抗原样', () => {
    expect(applyResist(50, 'physical', zeroResist())).toBe(50);
  });
});

describe('rollDamage', () => {
  it('固定种子可复现', () => {
    const dmg = [{ type: 'physical' as DamageType, min: 5, max: 10 }];
    const a = rollDamage(dmg, zeroResist(), mulberry32(42));
    const b = rollDamage(dmg, zeroResist(), mulberry32(42));
    expect(a.total).toBe(b.total);
    expect(a.total).toBeGreaterThanOrEqual(5);
    expect(a.total).toBeLessThanOrEqual(10);
  });
});

describe('hitRecoveryFrames (FHR)', () => {
  it('FHR 越高帧数越少或相等 (单调)', () => {
    expect(hitRecoveryFrames(10, 0)).toBeGreaterThanOrEqual(hitRecoveryFrames(10, 60));
    expect(hitRecoveryFrames(10, 60)).toBeGreaterThanOrEqual(hitRecoveryFrames(10, 200));
  });
});

describe('resolveAttack', () => {
  it('必中场景: 造成伤害并可致死', () => {
    const att = dummy({ attackRating: 99999, level: 99 });
    const def = dummy({ hp: 8, defense: 0, level: 1, hitRecoveryFrames: 10 });
    const r = resolveAttack(att, def, [{ type: 'physical', min: 10, max: 10 }], mulberry32(1), 1000);
    expect(r.hit).toBe(true);
    expect(r.totalDamage).toBe(10);
    expect(r.killed).toBe(true);
    expect(def.hp).toBe(0);
  });
  it('非致死命中触发受身, 设置 stunUntilMs', () => {
    const att = dummy({ attackRating: 99999, level: 99 });
    const def = dummy({ hp: 100, hitRecoveryFrames: 10, fhr: 0 });
    const r = resolveAttack(att, def, [{ type: 'physical', min: 5, max: 5 }], mulberry32(1), 1000);
    expect(r.hit).toBe(true);
    expect(r.causedRecovery).toBe(true);
    expect(def.stunUntilMs).toBeGreaterThan(1000);
  });
});
