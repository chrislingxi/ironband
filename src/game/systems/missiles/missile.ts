import type { Vec2 } from '@engine/math/vec.ts';
import { normalize } from '@engine/math/vec.ts';
import type { DamageInstance } from '@game/systems/combat/types.ts';

// 投射物类型: 箭 / 火球 / 冰球 / 闪电箭 / 新星
export type MissileKind = 'arrow' | 'fireball' | 'iceball' | 'bolt' | 'nova';

// 投射物 (箭/法术). 纯数据, 与渲染/Game 解耦, 由 updateMissiles 推进.
export interface Missile {
  id: number;
  pos: Vec2; // 当前世界坐标(格)
  vel: Vec2; // 单位方向向量 (已归一化)
  speed: number; // 速度(格/秒)
  dmg: DamageInstance[]; // 命中时的伤害实例
  radius: number; // 碰撞半径(格)
  fromPlayer: boolean; // 是否玩家发射(决定命中阵营)
  range: number; // 最大飞行距离(格), 超出即消失
  traveled: number; // 已飞行距离(格)
  pierce: number; // 可穿透目标数, <0 时消失
  kind: MissileKind;
  color: number; // 渲染色
  dead: boolean; // 标记销毁
}

// 自增投射物 id
let nextMissileId = 1;

export interface CreateMissileOpts {
  pos: Vec2;
  dir: Vec2; // 飞行方向(无需归一化)
  speed: number;
  dmg: DamageInstance[];
  kind: MissileKind;
  fromPlayer: boolean;
  range?: number;
  pierce?: number;
  radius?: number;
  color?: number;
}

// 构造投射物. dir 会被归一化; 缺省值: range=12, pierce=0, radius=0.25, color=白
export function createMissile(opts: CreateMissileOpts): Missile {
  const vel = normalize(opts.dir);
  return {
    id: nextMissileId++,
    pos: { x: opts.pos.x, y: opts.pos.y },
    vel,
    speed: opts.speed,
    dmg: opts.dmg,
    radius: opts.radius ?? 0.25,
    fromPlayer: opts.fromPlayer,
    range: opts.range ?? 12,
    traveled: 0,
    pierce: opts.pierce ?? 0,
    kind: opts.kind,
    color: opts.color ?? 0xffffff,
    dead: false,
  };
}
