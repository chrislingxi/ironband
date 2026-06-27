import type { MonStat } from '@game/data/schema.ts';
import type { PhaseConfig } from '@game/systems/boss/andariel.ts';

// 第三幕 Boss 梅菲斯特 — 憎恨之王. 漂浮的恶魔术士, 闪电/冰霜系远程压制。
// 复用 Boss AI 的阶段/环爆/召唤机制 (见 behaviors.ts), 主题为闪电环爆。

const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

export const MEPHISTO: MonStat = {
  id: 'mephisto',
  name: '梅菲斯特',
  sprite: 'mephisto',
  ai: 'boss',
  level: pd(28, 62, 94),
  hp: pd([1300, 1500], [4200, 4700], [11000, 12500]),
  attackRating: pd(520, 2100, 5200),
  defense: pd(180, 1200, 3100),
  damage: pd([30, 48], [110, 160], [300, 410]),
  // 闪电/冰免疫倾向, 火抗低 (火法克制)。
  resist: {
    lightning: pd(75, 90, 100),
    cold: pd(50, 75, 90),
    fire: pd(0, 20, 40),
    poison: pd(30, 50, 70),
  },
  exp: pd(3200, 26000, 110000),
  speed: 2.2,
  radius: 1.3,
  flags: { boss: true },
};

// 梅菲斯特阶段: 远程闪电环爆为主, 召唤亡灵牵制, 狂暴期高频。
export const MEPHISTO_PHASES: Record<0 | 1 | 2, PhaseConfig> = {
  0: { speedMult: 1, atkIntervalMult: 1, poisonNova: true, novaCooldown: 3, summon: false, summonDefId: '', summonCount: 0 },
  1: { speedMult: 1.1, atkIntervalMult: 0.9, poisonNova: true, novaCooldown: 2.4, summon: true, summonDefId: 'skeleton', summonCount: 3 },
  2: { speedMult: 1.3, atkIntervalMult: 0.7, poisonNova: true, novaCooldown: 1.4, summon: true, summonDefId: 'shaman', summonCount: 2 },
};

// 环形闪电伤害实例 (闪电主题, 原创数值)。
export function bossLightningDamage(): { type: 'lightning'; min: number; max: number }[] {
  return [
    { type: 'lightning', min: 26, max: 44 },
    { type: 'lightning', min: 12, max: 20 },
  ];
}
