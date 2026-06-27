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
  hp: pd([4200, 4800], [13000, 15000], [27000, 32000]),
  attackRating: pd(1300, 4000, 8800),
  defense: pd(340, 1400, 2200),
  damage: pd([42, 64], [95, 128], [92, 122]),
  // 多元素高抗, 无明显弱点 (终极战)。
  resist: {
    // 终极Boss对所有元素都有抗性, 但不再"近免疫"——纯法系也须能打动 (M4 校验)。
    poison: pd(50, 60, 70),
    cold: pd(40, 50, 55),
    fire: pd(40, 50, 55),
    lightning: pd(40, 50, 55),
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
