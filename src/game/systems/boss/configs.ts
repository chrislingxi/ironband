import type { DamageInstance } from '@game/systems/combat/index.ts';
import type { PhaseConfig } from '@game/systems/boss/andariel.ts';
import { ANDARIEL_PHASES, bossPoisonDamage } from '@game/systems/boss/andariel.ts';
import { DURIEL_PHASES, bossColdDamage } from '@game/systems/boss/duriel.ts';
import { MEPHISTO_PHASES, bossLightningDamage } from '@game/systems/boss/mephisto.ts';

// Boss 行为配置注册表: 新增 Boss 只需在此登记 (阶段表 + 环爆元素色/伤害)，
// behaviors.ts 的 aiBoss 据 defId 查表, 无需再硬编码各 Boss 分支。
export interface BossConfig {
  phases: Record<0 | 1 | 2, PhaseConfig>;
  novaColor: number;
  novaDamage: () => DamageInstance[];
}

export const BOSS_CONFIG: Record<string, BossConfig> = {
  andariel: { phases: ANDARIEL_PHASES, novaColor: 0x9be04a, novaDamage: bossPoisonDamage },
  duriel: { phases: DURIEL_PHASES, novaColor: 0x6ad0ff, novaDamage: bossColdDamage },
  mephisto: { phases: MEPHISTO_PHASES, novaColor: 0x9a6aff, novaDamage: bossLightningDamage },
};
