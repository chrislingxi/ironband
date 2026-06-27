import type { Difficulty } from '@game/data/schema.ts';
import type { Vec2 } from '@engine/math/vec.ts';
import { vec } from '@engine/math/vec.ts';
import type { RNG } from '@engine/math/rng.ts';
import { randInt } from '@engine/math/rng.ts';
import { AREAS } from '@game/world/act1.ts';

// 区域实例化: 把静态 LevelDef 展开成一份可玩的运行时区域, 供 Game 直接消费。
// 纯逻辑、无副作用, 同种子 + 同区域 → 同结果 (确定性, 可单测)。

// 单个怪物的出生点
export interface MonsterSpawn {
  defId: string; // MonStat id
  x: number;
  y: number;
}

// 通往相邻区域的出口
export interface AreaExit {
  toId: string; // 目标区域 id
  pos: Vec2; // 出口在本区域内的坐标
}

// 实例化后的区域
export interface AreaInstance {
  id: string;
  name: string;
  isTown: boolean;
  size: [number, number];
  monsterSpawns: MonsterSpawn[];
  exits: AreaExit[];
}

// 难度刷怪密度系数
const DIFF_MULT: Record<Difficulty, number> = {
  normal: 1,
  nightmare: 1.4,
  hell: 1.8,
};

// 边缘内缩量 (避免出口/怪物贴死边界)
const MARGIN = 4;

// 沿四条边均匀分布出口点: 上、右、下、左循环取边
function exitPos(index: number, total: number, w: number, h: number): Vec2 {
  // 把 total 个出口铺到区域边缘, 错开方位
  const side = index % 4;
  const t = total > 1 ? (index + 1) / (total + 1) : 0.5; // 沿边的归一化位置
  switch (side) {
    case 0:
      return vec(MARGIN + t * (w - 2 * MARGIN), MARGIN); // 上边
    case 1:
      return vec(w - MARGIN, MARGIN + t * (h - 2 * MARGIN)); // 右边
    case 2:
      return vec(MARGIN + t * (w - 2 * MARGIN), h - MARGIN); // 下边
    default:
      return vec(MARGIN, MARGIN + t * (h - 2 * MARGIN)); // 左边
  }
}

// 实例化一个区域。营地不刷怪; 野外按 monLevel/难度决定怪量, 随机布点。
export function buildArea(
  levelId: string,
  rng: RNG,
  diff: Difficulty = 'normal',
): AreaInstance {
  const def = AREAS[levelId];
  if (!def) throw new Error(`未知区域: ${levelId}`);

  const isTown = def.isTown === true;
  // 缩小有效尺寸: 出口更近、不那么空旷 (营地保持原尺寸放下NPC)
  const scale = isTown ? 1 : 0.6;
  const w = Math.max(30, Math.round(def.size[0] * scale));
  const h = Math.max(30, Math.round(def.size[1] * scale));

  // 出口: 由 connects 沿边缘布点生成
  const exits: AreaExit[] = def.connects.map((toId, i) => ({
    toId,
    pos: exitPos(i, def.connects.length, w, h),
  }));

  const monsterSpawns: MonsterSpawn[] = [];
  if (!isTown && def.monsters.length > 0) {
    // 怪量随 monLevel 与难度增长 (略降, 配合安全出生半径)
    const lvl = def.monLevel[diff];
    const base = 4 + Math.floor(lvl * 0.5);
    const count = Math.round(base * DIFF_MULT[diff]);
    // 安全出生半径: 玩家落点(中心)周围不刷怪, 避免一进区域就被围秒
    const cx = w / 2, cy = h / 2;
    const safe = Math.max(7, Math.min(w, h) * 0.3);
    let guard = 0;
    while (monsterSpawns.length < count && guard < count * 12) {
      guard++;
      const x = MARGIN + rng() * (w - 2 * MARGIN);
      const y = MARGIN + rng() * (h - 2 * MARGIN);
      if (Math.hypot(x - cx, y - cy) < safe) continue; // 太靠近落点, 重抽
      const defId = def.monsters[randInt(rng, 0, def.monsters.length - 1)];
      monsterSpawns.push({ defId, x, y });
    }
  }

  return {
    id: def.id,
    name: def.name,
    isTown,
    size: [w, h],
    monsterSpawns,
    exits,
  };
}
