import type { Combatant, DamageInstance, AttackResult } from './types.ts';
import { chanceToHit } from './hit.ts';
import { rollDamage } from './damage.ts';
import { hitRecoverySeconds } from './recovery.ts';
import type { RNG } from '@engine/math/rng.ts';

// 一次攻击结算: 掷命中 → 掷伤害(逐类抗性) → 扣血 → 触发受身.
// 副作用: 修改 defender.hp / stunUntilMs (战斗系统语义).
export function resolveAttack(
  attacker: Combatant,
  defender: Combatant,
  dmg: DamageInstance[],
  rng: RNG,
  nowMs: number,
): AttackResult {
  const chance = chanceToHit(attacker.attackRating, defender.defense, attacker.level, defender.level);
  if (rng() * 100 >= chance) {
    return { hit: false, damageByType: {}, totalDamage: 0, killed: false, causedRecovery: false };
  }

  const { byType, total } = rollDamage(dmg, defender.resist, rng);
  defender.hp = Math.max(0, defender.hp - total);
  const killed = defender.hp <= 0;

  let causedRecovery = false;
  if (!killed && total > 0) {
    const secs = hitRecoverySeconds(defender.hitRecoveryFrames, defender.fhr);
    defender.stunUntilMs = nowMs + secs * 1000;
    causedRecovery = true;
  }

  return { hit: true, damageByType: byType, totalDamage: total, killed, causedRecovery };
}
