import type { Entity, Corpse } from '@game/entities/entity.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { dist, normalize } from '@engine/math/vec.ts';
import type { RNG } from '@engine/math/rng.ts';

// AI 上下文 — Game 注入. 行为只通过此面与世界交互 (便于测试/并行).
export interface AIContext {
  player: Entity;
  entities: Entity[];
  corpses: Corpse[];
  nowMs: number;
  dt: number;
  rng: RNG;
  attack: (attacker: Entity, defender: Entity, dmg: DamageInstance[]) => void;
  spawn: (defId: string, x: number, y: number) => void;
  shoot: (from: Entity, dmg: DamageInstance[], kind: 'arrow' | 'fireball' | 'bolt', color: number) => void;
}

function faceAndStep(e: Entity, tx: number, ty: number, dt: number, sign = 1): void {
  const dir = normalize({ x: (tx - e.pos.x) * sign, y: (ty - e.pos.y) * sign });
  if (dir.x === 0 && dir.y === 0) { e.moving = false; return; }
  e.facing = Math.atan2(dir.y, dir.x);
  e.pos.x += dir.x * e.speed * dt;
  e.pos.y += dir.y * e.speed * dt;
  e.moving = true;
}

function tryMeleeAttack(e: Entity, ctx: AIContext): boolean {
  const d = dist(e.pos, ctx.player.pos);
  if (d <= e.attackRange + ctx.player.radius) {
    e.moving = false;
    e.facing = Math.atan2(ctx.player.pos.y - e.pos.y, ctx.player.pos.x - e.pos.x);
    if (e.attackCd <= 0) {
      ctx.attack(e, ctx.player, e.damage);
      e.attackCd = e.attackInterval;
    }
    return true;
  }
  return false;
}

// 直扑型 (骷髅/行尸): 追玩家, 进程攻击.
function aiChaser(e: Entity, ctx: AIContext): void {
  if (!tryMeleeAttack(e, ctx)) faceAndStep(e, ctx.player.pos.x, ctx.player.pos.y, ctx.dt);
}

// 堕落者: 附近有活萨满 → 勇猛追击; 否则玩家逼近就逃跑 (D2 经典怯懦).
function aiFallen(e: Entity, ctx: AIContext): void {
  const shamanNear = ctx.entities.some(
    (o) => !o.dead && o.ai === 'shaman' && dist(o.pos, e.pos) <= 8,
  );
  const d = dist(e.pos, ctx.player.pos);
  if (shamanNear) {
    e.fleeing = false;
    aiChaser(e, ctx);
  } else if (d < 5) {
    e.fleeing = true; // 逃离玩家
    faceAndStep(e, ctx.player.pos.x, ctx.player.pos.y, ctx.dt, -1);
  } else {
    e.fleeing = false;
    e.moving = false;
  }
}

// 堕落萨满: 与玩家保持距离 + 远程火球 + 复活附近的堕落者尸体.
function aiShaman(e: Entity, ctx: AIContext): void {
  const d = dist(e.pos, ctx.player.pos);
  // 走位: 太近后撤, 太远靠近, 中距停下放火球
  if (d < 4) faceAndStep(e, ctx.player.pos.x, ctx.player.pos.y, ctx.dt, -1);
  else if (d > 7) faceAndStep(e, ctx.player.pos.x, ctx.player.pos.y, ctx.dt);
  else { e.moving = false; e.facing = Math.atan2(ctx.player.pos.y - e.pos.y, ctx.player.pos.x - e.pos.x); }

  // 远程攻击: 放火球飞射物 (射程内)
  if (d <= 9 && e.attackCd <= 0) {
    ctx.shoot(e, e.damage, 'fireball', 0xff7a3a);
    e.attackCd = e.attackInterval;
  }
  // 复活: 找附近堕落者尸体, 移除并召唤一只 (复活冷却复用 attackCd 之外的简单节流由 Game 控制)
  const idx = ctx.corpses.findIndex((c) => c.defId === 'fallen' && dist(c.pos, e.pos) <= 6);
  if (idx >= 0 && e.attackCd <= 0.05) {
    const c = ctx.corpses[idx];
    ctx.corpses.splice(idx, 1);
    ctx.spawn('fallen', c.pos.x, c.pos.y);
  }
}

// 远程射手(弓手/吐毒虫): 拉开距离放飞射物.
function aiArcher(e: Entity, ctx: AIContext): void {
  const d = dist(e.pos, ctx.player.pos);
  if (d < 4) faceAndStep(e, ctx.player.pos.x, ctx.player.pos.y, ctx.dt, -1); // 太近后撤
  else if (d > 9) faceAndStep(e, ctx.player.pos.x, ctx.player.pos.y, ctx.dt); // 太远靠近
  else { e.moving = false; e.facing = Math.atan2(ctx.player.pos.y - e.pos.y, ctx.player.pos.x - e.pos.x); }
  if (d <= 10 && e.attackCd <= 0) {
    const poison = e.defId === 'spitter';
    ctx.shoot(e, e.damage, poison ? 'bolt' : 'arrow', poison ? 0x9be04a : 0xc8b88a);
    e.attackCd = e.attackInterval;
  }
}

export function updateMonsterAI(e: Entity, ctx: AIContext): void {
  if (e.dead) return;
  if (ctx.nowMs < e.combat.stunUntilMs) { e.moving = false; return; } // 受身中不动
  e.attackCd = Math.max(0, e.attackCd - ctx.dt);
  switch (e.ai) {
    case 'skeleton':
    case 'zombie':
    case 'brute':
      aiChaser(e, ctx);
      break;
    case 'fallen':
      aiFallen(e, ctx);
      break;
    case 'shaman':
      aiShaman(e, ctx);
      break;
    case 'archer':
      aiArcher(e, ctx);
      break;
    default:
      e.moving = false;
  }
}
