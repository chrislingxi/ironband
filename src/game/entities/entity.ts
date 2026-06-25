import type { Vec2 } from '@engine/math/vec.ts';
import type { Combatant, DamageInstance } from '@game/systems/combat/index.ts';
import type { DamageType } from '@game/data/schema.ts';

export type AIKind = 'skeleton' | 'zombie' | 'fallen' | 'shaman' | 'none';

// 游戏实体 (玩家/怪物). 组合 Transform + Combatant 契约, 战斗逻辑与渲染解耦.
export interface Entity {
  id: number;
  kind: 'player' | 'monster';
  defId: string;
  ai: AIKind;
  pos: Vec2;
  facing: number; // rad
  speed: number; // 格/秒
  radius: number; // 碰撞半径(格)
  combat: Combatant;
  damage: DamageInstance[];
  attackRange: number; // 格
  attackInterval: number; // 秒
  attackCd: number; // 剩余冷却(秒)
  hitFlash: number; // 0..1 受击白闪, 渲染用
  fleeing: boolean; // 堕落者逃跑态(渲染/调试)
  moving: boolean;
  dead: boolean;
  // 占位渲染 (T1 将替换为 FLARE 精灵)
  color: number;
  size: number; // 占位半径(px)
}

export interface Corpse {
  pos: Vec2;
  defId: string;
  color: number;
  size: number;
  ageMs: number;
}

export const noResist = (): Record<DamageType, number> => ({
  physical: 0, fire: 0, cold: 0, lightning: 0, poison: 0, magic: 0,
});

let nextId = 1;
export const freshId = (): number => nextId++;

export function makeCombatant(over: Partial<Combatant>): Combatant {
  return {
    level: 1, hp: 10, maxHp: 10, attackRating: 50, defense: 0,
    resist: noResist(), fhr: 0, hitRecoveryFrames: 8, stunUntilMs: 0, ...over,
  };
}
