import type { MonStat } from '@game/data/schema.ts';
import type { PhaseConfig } from '@game/systems/boss/andariel.ts';

// 第五幕终极 Boss 巴尔 — 毁灭之王. 全游戏最高威胁: 高速近战 + 毒冰双环 + 持续召唤。

const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

export const BAAL: MonStat = {
  id: 'baal',
  name: '巴尔',
  sprite: 'baal',
  ai: 'boss',
  level: pd(45, 75, 105),
  hp: pd([3200, 3600], [8500, 9500], [21000, 24000]),
  attackRating: pd(1300, 4000, 8800),
  defense: pd(340, 1900, 4400),
  damage: pd([58, 88], [185, 255], [460, 620]),
  // 多元素高抗, 无明显弱点 (终极战)。
  resist: {
    poison: pd(75, 90, 100),
    cold: pd(50, 75, 95),
    fire: pd(50, 70, 90),
    lightning: pd(50, 70, 90),
  },
  exp: pd(10000, 70000, 300000),
  speed: 2.8,
  radius: 1.4,
  flags: { boss: true },
};

export const BAAL_PHASES: Record<0 | 1 | 2, PhaseConfig> = {
  0: { speedMult: 1.3, atkIntervalMult: 0.8, poisonNova: true, novaCooldown: 2.8, summon: true, summonDefId: 'skeleton', summonCount: 2 },
  1: { speedMult: 1.4, atkIntervalMult: 0.7, poisonNova: true, novaCooldown: 2.0, summon: true, summonDefId: 'brute', summonCount: 2 },
  2: { speedMult: 1.8, atkIntervalMult: 0.55, poisonNova: true, novaCooldown: 1.2, summon: true, summonDefId: 'hound', summonCount: 3 },
};

export function bossDestructionDamage(): { type: 'poison' | 'cold'; min: number; max: number }[] {
  return [
    { type: 'poison', min: 30, max: 50 },
    { type: 'cold', min: 24, max: 40 },
  ];
}
