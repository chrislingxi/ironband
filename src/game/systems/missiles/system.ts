import type { Vec2 } from '@engine/math/vec.ts';
import { dist } from '@engine/math/vec.ts';
import type { Missile } from './missile.ts';

// 可被命中的目标契约 (玩家/怪物均满足).
export interface MissileTarget {
  pos: Vec2;
  radius: number;
  dead: boolean;
}

// 已命中目标集挂在 missile 上, 避免穿透时重复命中同一目标.
// 用 WeakMap 内部维护, 不污染 Missile 数据结构, 也保证确定性.
const hitSets = new WeakMap<Missile, Set<MissileTarget>>();

function hitSetOf(m: Missile): Set<MissileTarget> {
  let s = hitSets.get(m);
  if (!s) {
    s = new Set<MissileTarget>();
    hitSets.set(m, s);
  }
  return s;
}

// 每帧推进所有投射物并做碰撞检测. 纯逻辑、确定性、不依赖 Game.
// - 推进: pos += vel * speed * dt, 累加 traveled
// - 超 range -> dead
// - 与 targets 碰撞 (距离 < m.radius+target.radius 且 !target.dead 且未命中过) -> onHit
//   命中后 pierce 递减, pierce<0 则 dead
// 返回仍存活的投射物 (过滤掉 dead).
export function updateMissiles(
  missiles: Missile[],
  dt: number,
  targets: MissileTarget[],
  onHit: (m: Missile, target: MissileTarget) => void,
): Missile[] {
  for (const m of missiles) {
    if (m.dead) continue;

    // 推进位置
    const dx = m.vel.x * m.speed * dt;
    const dy = m.vel.y * m.speed * dt;
    m.pos.x += dx;
    m.pos.y += dy;
    m.traveled += Math.hypot(dx, dy);

    // 超出射程
    if (m.traveled >= m.range) {
      m.dead = true;
      continue;
    }

    // 碰撞检测
    const hits = hitSetOf(m);
    for (const t of targets) {
      if (t.dead || hits.has(t)) continue;
      if (dist(m.pos, t.pos) < m.radius + t.radius) {
        hits.add(t);
        onHit(m, t);
        m.pierce -= 1;
        if (m.pierce < 0) {
          m.dead = true;
          break;
        }
      }
    }
  }

  // 清理死亡投射物的命中集 (WeakMap 会随对象回收, 这里仅返回存活者)
  return missiles.filter((m) => !m.dead);
}
