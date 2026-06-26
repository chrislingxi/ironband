import type { Vec2 } from '@engine/math/vec.ts';
import { dist, normalize } from '@engine/math/vec.ts';
import type { DamageInstance } from '@game/systems/combat/types.ts';

// 雇佣兵(罗格弓手)系统 — 纯逻辑层: 跟随玩家 + 射程内放箭.
// 与渲染/ECS 解耦, 通过 MercCtx 注入玩家位置/怪物列表/放箭回调.

// 雇佣兵实体. 仅持有跟随与射击所需的最小状态.
export interface Merc {
  pos: Vec2;
  facing: number; // 朝向(弧度)
  hp: number;
  maxHp: number;
  level: number;
  attackCd: number; // 剩余攻击冷却(秒)
  attackInterval: number; // 攻击间隔(秒)
  speed: number; // 移动速度(格/秒)
  range: number; // 射程(格)
  dead: boolean;
}

// 跟随时与玩家保持的理想间距(格). 小于此值不再贴近.
const FOLLOW_DIST = 3.5;
// 超过此距离视为掉队, 以加速归队(乘以 CATCHUP_MULT).
const CATCHUP_DIST = 8;
const CATCHUP_MULT = 2.5;

// 创建一名罗格弓手. 血量/伤害随等级线性成长.
export function makeMerc(level: number): Merc {
  const lv = Math.max(1, Math.floor(level));
  const maxHp = 40 + lv * 12; // 等级越高越肉
  return {
    pos: { x: 0, y: 0 },
    facing: 0,
    hp: maxHp,
    maxHp,
    level: lv,
    attackCd: 0,
    attackInterval: 1.1,
    speed: 4,
    range: 9,
    dead: false,
  };
}

// 雇佣兵箭矢的物理伤害, 随等级递增.
export function mercDamage(level: number): DamageInstance[] {
  const lv = Math.max(1, Math.floor(level));
  const min = 3 + lv * 2;
  const max = 6 + lv * 4;
  return [{ type: 'physical', min, max }];
}

// 每帧更新所需的外部上下文.
export interface MercCtx {
  playerPos: Vec2;
  monsters: { pos: Vec2; radius: number; dead: boolean }[];
  dt: number; // 帧时长(秒)
  nowMs: number; // 当前时间戳(毫秒)
  // 放箭回调: 由调用方将其接入玩家侧 missile 通道, 使箭可伤怪.
  shootArrow: (from: Vec2, dir: Vec2, dmg: DamageInstance[]) => void;
}

// 在一组活怪中找出射程内距雇佣兵最近的目标, 无则返回 null.
function nearestTarget(m: Merc, monsters: MercCtx['monsters']): { pos: Vec2 } | null {
  let best: { pos: Vec2 } | null = null;
  let bestD = m.range;
  for (const mon of monsters) {
    if (mon.dead) continue;
    const d = dist(m.pos, mon.pos);
    if (d <= bestD) {
      bestD = d;
      best = mon;
    }
  }
  return best;
}

// 每帧推进一名雇佣兵的行为: 跟随移动 + 索敌放箭 + 冷却衰减.
export function updateMerc(m: Merc, ctx: MercCtx): void {
  if (m.dead) return;

  // --- 跟随玩家 ---
  const toPlayer = { x: ctx.playerPos.x - m.pos.x, y: ctx.playerPos.y - m.pos.y };
  const dPlayer = dist(m.pos, ctx.playerPos);
  if (dPlayer > FOLLOW_DIST) {
    const dir = normalize(toPlayer);
    // 掉队过远时加速归队.
    const spd = dPlayer > CATCHUP_DIST ? m.speed * CATCHUP_MULT : m.speed;
    const step = Math.min(spd * ctx.dt, dPlayer - FOLLOW_DIST);
    m.pos.x += dir.x * step;
    m.pos.y += dir.y * step;
  }

  // --- 索敌放箭 ---
  const target = nearestTarget(m, ctx.monsters);
  if (target) {
    const aim = normalize({ x: target.pos.x - m.pos.x, y: target.pos.y - m.pos.y });
    m.facing = Math.atan2(aim.y, aim.x); // 面朝目标
    if (m.attackCd <= 0) {
      ctx.shootArrow({ x: m.pos.x, y: m.pos.y }, aim, mercDamage(m.level));
      m.attackCd = m.attackInterval;
    }
  }

  // --- 冷却衰减 ---
  if (m.attackCd > 0) m.attackCd = Math.max(0, m.attackCd - ctx.dt);
}

// 雇佣金价(固定一口价).
export function hireCost(): number {
  return 500;
}

// 复活价, 随等级递增.
export function reviveCost(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return 200 + lv * 50;
}
