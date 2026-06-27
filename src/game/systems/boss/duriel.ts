import type { MonStat } from '@game/data/schema.ts';
import type { PhaseConfig } from '@game/systems/boss/andariel.ts';

// 第二幕 Boss 督瑞尔 — 痛苦之王. 矮壮疾冲近战, 寒冷系.
// 复用 Boss AI 的阶段/环爆/召唤机制 (见 behaviors.ts), 但走寒冷主题:
// 不放毒, 改环形冰弹; 阶段越低越疾速狂暴.

const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

export const DURIEL: MonStat = {
  id: 'duriel',
  name: '督瑞尔',
  sprite: 'duriel',
  ai: 'boss',
  // 二幕 Boss, 等级高于一幕安达莉尔.
  level: pd(22, 56, 88),
  // 极高血量 (肉盾型痛苦之王).
  hp: pd([900, 1050], [3400, 3800], [9600, 10800]),
  attackRating: pd(360, 1700, 4400),
  defense: pd(140, 980, 2600),
  // 沉重近战钝击.
  damage: pd([26, 40], [95, 140], [260, 360]),
  // 寒冷免疫倾向, 火抗较低 (火法克制), 其余中等.
  resist: {
    cold: pd(75, 90, 100),
    fire: pd(0, 20, 40),
    lightning: pd(0, 30, 50),
    poison: pd(20, 40, 60),
  },
  exp: pd(1800, 16000, 70000),
  speed: 2.8, // 比安达莉尔更快, 体现"疾冲"
  radius: 1.3,
  flags: { boss: true },
};

// 督瑞尔阶段: 全程疾速近战, 中段起环形冰弹, 狂暴期加速并召唤亡灵牵制.
export const DURIEL_PHASES: Record<0 | 1 | 2, PhaseConfig> = {
  // 阶段 0 — 疾冲近战, 无远程.
  0: { speedMult: 1.3, atkIntervalMult: 0.9, poisonNova: false, novaCooldown: 0, summon: false, summonDefId: '', summonCount: 0 },
  // 阶段 1 — 环形冰弹 + 召唤骷髅 x2.
  1: { speedMult: 1.3, atkIntervalMult: 0.85, poisonNova: true, novaCooldown: 3.2, summon: true, summonDefId: 'skeleton', summonCount: 2 },
  // 阶段 2 — 狂暴: 极速、高频冰弹.
  2: { speedMult: 1.8, atkIntervalMult: 0.55, poisonNova: true, novaCooldown: 1.6, summon: true, summonDefId: 'skeleton', summonCount: 3 },
};

// 环形冰弹伤害实例 (寒冷主题, 原创数值).
export function bossColdDamage(): { type: 'cold'; min: number; max: number }[] {
  return [
    { type: 'cold', min: 22, max: 36 },
    { type: 'cold', min: 10, max: 16 },
  ];
}
