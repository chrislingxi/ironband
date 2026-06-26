// 雇佣兵 (罗格弓手): Q2 解锁, 营地雇佣后随玩家出征, 自动射箭参战.
// 设计为随行单位 (kind='ally'): 不被玩家攻击/不计入清场, 但会被敌方投射物/近战伤害, 死亡需花金复活.
import type { Entity } from '@game/entities/entity.ts';
import { freshId, makeCombatant, noResist } from '@game/entities/entity.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { dist, normalize } from '@engine/math/vec.ts';

// 雇佣兵随行/作战参数 (格、秒)
const SHOOT_RANGE = 10; // 索敌/射程
const FOLLOW_DIST = 2.6; // 跟随玩家的理想距离
const KITE_DIST = 3.5; // 怪物近于此则后撤拉开
const REGEN_PER_SEC = 4; // 脱战回血/秒

// 雇佣兵上下文 — Game 注入.
export interface MercContext {
  player: Entity;
  monsters: Entity[];
  dt: number;
  nowMs: number;
  shoot: (from: Entity, target: Entity) => void; // 生成玩家阵营箭矢
}

// 按角色等级造一名罗格弓手 (血量/伤害随等级缩放).
export function makeMerc(charLevel: number): Entity {
  const lvl = Math.max(1, charLevel);
  const hp = 60 + lvl * 14;
  const dmgMin = 4 + Math.floor(lvl * 1.2);
  const dmgMax = 8 + Math.floor(lvl * 2.0);
  return {
    id: freshId(), kind: 'ally', defId: 'rogue_merc', ai: 'archer',
    pos: { x: 0, y: 0 }, facing: 0, speed: 4.4, radius: 0.4,
    combat: makeCombatant({ level: lvl, hp, maxHp: hp, attackRating: 60 + lvl * 12, defense: 10 + lvl * 2, resist: noResist(), hitRecoveryFrames: 7 }),
    damage: [{ type: 'physical', min: dmgMin, max: dmgMax } as DamageInstance],
    attackRange: SHOOT_RANGE, attackInterval: 1.1, attackCd: 0, xpReward: 0,
    hitFlash: 0, fleeing: false, moving: false, dead: false,
    color: 0xff9ec4, size: 12,
  };
}

// 找射程内最近的活怪.
function nearestMonster(merc: Entity, monsters: Entity[]): Entity | null {
  let best: Entity | null = null;
  let bd = SHOOT_RANGE;
  for (const m of monsters) {
    if (m.dead) continue;
    const d = dist(merc.pos, m.pos) - m.radius;
    if (d <= bd) { bd = d; best = m; }
  }
  return best;
}

// 雇佣兵每帧逻辑: 走位(跟随/拉开) + 自动射箭. 死亡时静止.
export function updateMercAI(merc: Entity, ctx: MercContext): void {
  if (merc.dead) return;
  merc.attackCd = Math.max(0, merc.attackCd - ctx.dt);
  merc.hitFlash = Math.max(0, merc.hitFlash - ctx.dt * 4);

  const target = nearestMonster(merc, ctx.monsters);
  const dPlayer = dist(merc.pos, ctx.player.pos);

  // 脱战回血
  if (!target && merc.combat.hp < merc.combat.maxHp) {
    merc.combat.hp = Math.min(merc.combat.maxHp, merc.combat.hp + REGEN_PER_SEC * ctx.dt);
  }

  // 走位: 怪太近则拉开; 否则离玩家太远就归队; 中距停下射击.
  let moved = false;
  if (target) {
    const dT = dist(merc.pos, target.pos);
    merc.facing = Math.atan2(target.pos.y - merc.pos.y, target.pos.x - merc.pos.x);
    if (dT < KITE_DIST) {
      const away = normalize({ x: merc.pos.x - target.pos.x, y: merc.pos.y - target.pos.y });
      merc.pos.x += away.x * merc.speed * ctx.dt;
      merc.pos.y += away.y * merc.speed * ctx.dt;
      moved = true;
    }
  }
  if (!moved && dPlayer > FOLLOW_DIST) {
    const to = normalize({ x: ctx.player.pos.x - merc.pos.x, y: ctx.player.pos.y - merc.pos.y });
    merc.pos.x += to.x * merc.speed * ctx.dt;
    merc.pos.y += to.y * merc.speed * ctx.dt;
    if (!target) merc.facing = Math.atan2(to.y, to.x);
    moved = true;
  }
  merc.moving = moved;

  // 射击
  if (target && merc.attackCd <= 0) {
    ctx.shoot(merc, target);
    merc.attackCd = merc.attackInterval;
  }
}
