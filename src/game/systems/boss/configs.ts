import type { DamageInstance } from '@game/systems/combat/index.ts';
import type { PhaseConfig } from '@game/systems/boss/andariel.ts';
import { ANDARIEL_PHASES, bossPoisonDamage } from '@game/systems/boss/andariel.ts';
import { DURIEL_PHASES, bossColdDamage } from '@game/systems/boss/duriel.ts';
import { MEPHISTO_PHASES, bossLightningDamage } from '@game/systems/boss/mephisto.ts';
import { DIABLO_PHASES, bossFireDamage } from '@game/systems/boss/diablo.ts';
import { BAAL_PHASES, bossDestructionDamage } from '@game/systems/boss/baal.ts';

// Boss 行为配置注册表: 新增 Boss 只需在此登记 (阶段表 + 环爆元素色/伤害)，
// behaviors.ts 的 aiBoss 据 defId 查表, 无需再硬编码各 Boss 分支。
// 招牌弹幕形态 (给每个 Boss 记忆点, 不再都是同一个环):
//  ring   环形放射 (安达莉尔毒环)
//  fan    朝玩家的扇形吐息 (暗黑破坏神火墙线)
//  aimed  朝玩家的密集瞄准弹幕 (梅菲斯特远程压制)
//  charge 朝玩家高速冲撞 + 小环 (督瑞尔冲锋)
//  storm  双层错位大环 (巴尔毁灭风暴)
export type BossSpecial = 'ring' | 'fan' | 'aimed' | 'charge' | 'storm';

export interface BossConfig {
  phases: Record<0 | 1 | 2, PhaseConfig>;
  novaColor: number;
  novaDamage: () => DamageInstance[];
  special: BossSpecial;
}

export const BOSS_CONFIG: Record<string, BossConfig> = {
  andariel: { phases: ANDARIEL_PHASES, novaColor: 0x9be04a, novaDamage: bossPoisonDamage, special: 'ring' },
  duriel: { phases: DURIEL_PHASES, novaColor: 0x6ad0ff, novaDamage: bossColdDamage, special: 'charge' },
  mephisto: { phases: MEPHISTO_PHASES, novaColor: 0x9a6aff, novaDamage: bossLightningDamage, special: 'aimed' },
  diablo: { phases: DIABLO_PHASES, novaColor: 0xff5a20, novaDamage: bossFireDamage, special: 'fan' },
  baal: { phases: BAAL_PHASES, novaColor: 0x8af06a, novaDamage: bossDestructionDamage, special: 'storm' },
};
