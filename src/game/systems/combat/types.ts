import type { DamageType } from '@game/data/schema.ts';

// 战斗契约: 玩家与怪物都满足此面, 与 ECS/精灵解耦 (并行任务共享).
export interface Combatant {
  level: number;
  hp: number;
  maxHp: number;
  attackRating: number; // AR
  defense: number; // DR
  // 各伤害类型抗性 % (物理即 PDR%). >=100 视为免疫. 上限(75等)由派生属性层裁剪, 本层不强制.
  resist: Record<DamageType, number>;
  fhr: number; // faster hit recovery %
  hitRecoveryFrames: number; // 基础受身帧 (25fps)
  stunUntilMs: number; // 受身/硬直结束时间戳
}

export interface DamageInstance {
  type: DamageType;
  min: number;
  max: number;
}

export interface AttackResult {
  hit: boolean;
  damageByType: Partial<Record<DamageType, number>>;
  totalDamage: number;
  killed: boolean;
  causedRecovery: boolean;
}
