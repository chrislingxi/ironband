import type { MonStat } from '@game/data/schema.ts';
import type { PhaseConfig } from '@game/systems/boss/andariel.ts';

// 第四幕 Boss 暗黑破坏神 — 恐惧之王. 高威胁近战 + 火焰环爆。

const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

export const DIABLO: MonStat = {
  id: 'diablo',
  name: '暗黑破坏神',
  sprite: 'diablo',
  ai: 'boss',
  level: pd(40, 70, 100),
  hp: pd([2200, 2500], [6000, 6800], [15000, 17000]),
  attackRating: pd(900, 3000, 6800),
  defense: pd(260, 1500, 3600),
  damage: pd([45, 70], [150, 210], [380, 510]),
  // 火免疫倾向, 冷抗低 (冰法克制)。
  resist: {
    fire: pd(75, 90, 100),
    lightning: pd(50, 70, 90),
    poison: pd(50, 70, 90),
    cold: pd(0, 20, 40),
  },
  exp: pd(6000, 42000, 180000),
  speed: 2.6,
  radius: 1.4,
  flags: { boss: true },
};

export const DIABLO_PHASES: Record<0 | 1 | 2, PhaseConfig> = {
  0: { speedMult: 1.2, atkIntervalMult: 0.85, poisonNova: false, novaCooldown: 0, summon: false, summonDefId: '', summonCount: 0 },
  1: { speedMult: 1.3, atkIntervalMult: 0.8, poisonNova: true, novaCooldown: 2.6, summon: true, summonDefId: 'brute', summonCount: 2 },
  2: { speedMult: 1.6, atkIntervalMult: 0.6, poisonNova: true, novaCooldown: 1.4, summon: true, summonDefId: 'hound', summonCount: 3 },
};

export function bossFireDamage(): { type: 'fire'; min: number; max: number }[] {
  return [
    { type: 'fire', min: 34, max: 56 },
    { type: 'fire', min: 16, max: 26 },
  ];
}
