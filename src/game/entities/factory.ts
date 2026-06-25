import type { Entity } from './entity.ts';
import { freshId, makeCombatant, noResist } from './entity.ts';
import { MONSTERS } from '@game/data/monsters.ts';
import type { Difficulty, DamageType } from '@game/data/schema.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { randInt, type RNG } from '@engine/math/rng.ts';

const PLACEHOLDER: Record<string, { color: number; size: number }> = {
  skeleton: { color: 0xdcdcd0, size: 12 },
  zombie: { color: 0x6a8a4a, size: 14 },
  fallen: { color: 0xc0503a, size: 9 },
  shaman: { color: 0xa050c0, size: 12 },
};

export function makePlayer(): Entity {
  // 野蛮人 normal 起手 (代表性数值, 后续 CharStats 任务精调)
  return {
    id: freshId(), kind: 'player', defId: 'barbarian', ai: 'none',
    pos: { x: 0, y: 0 }, facing: 0, speed: 4.6, radius: 0.45,
    combat: makeCombatant({ level: 1, hp: 55, maxHp: 55, attackRating: 110, defense: 12, fhr: 0, hitRecoveryFrames: 7 }),
    damage: [{ type: 'physical', min: 3, max: 6 }],
    attackRange: 1.25, attackInterval: 0.55, attackCd: 0,
    hitFlash: 0, fleeing: false, moving: false, dead: false,
    color: 0xffd76b, size: 13,
  };
}

export function makeMonster(defId: string, x: number, y: number, rng: RNG, diff: Difficulty = 'normal'): Entity {
  const m = MONSTERS[defId];
  if (!m) throw new Error(`unknown monster: ${defId}`);
  const [hpMin, hpMax] = m.hp[diff];
  const hp = randInt(rng, hpMin, hpMax);
  const resist = noResist();
  for (const k in m.resist) {
    const t = k as DamageType;
    resist[t] = m.resist[t]![diff];
  }
  const ranged = !!m.flags?.ranged;
  const dmgType: DamageType = ranged ? 'fire' : 'physical';
  const dmg: DamageInstance[] = [{ type: dmgType, min: m.damage[diff][0], max: m.damage[diff][1] }];
  const ph = PLACEHOLDER[defId] ?? { color: 0xaaaaaa, size: 12 };
  return {
    id: freshId(), kind: 'monster', defId, ai: m.ai as Entity['ai'],
    pos: { x, y }, facing: Math.PI, speed: m.speed, radius: m.radius,
    combat: makeCombatant({
      level: m.level[diff], hp, maxHp: hp,
      attackRating: m.attackRating[diff], defense: m.defense[diff],
      resist, fhr: 0, hitRecoveryFrames: 9,
    }),
    damage: dmg,
    attackRange: ranged ? 9 : 0.9,
    attackInterval: ranged ? 1.8 : 1.1, attackCd: randInt(rng, 0, 60) / 100,
    hitFlash: 0, fleeing: false, moving: false, dead: false,
    color: ph.color, size: ph.size,
  };
}
