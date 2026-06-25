// 轻量 ECS 契约 (并行开发的稳定接口 — 各系统只依赖这里, 不互相 import 实现).
import type { Vec2 } from '../math/vec.ts';

export type EntityId = number;

// 公共组件 — feature 任务在自己的模块里扩展 World, 但核心组件锁定在此.
export interface Transform {
  pos: Vec2; // 浮点格子坐标
  facing: number; // 朝向角 (rad)
}

export interface Mover {
  vel: Vec2;
  speed: number; // 格/秒
}

// 系统契约: 每帧固定步长调用.
export interface System {
  readonly name: string;
  update(world: IWorld, dt: number): void;
}

// World 契约 — 实体/组件存取的最小面. 具体实现见 world.ts.
export interface IWorld {
  readonly entities: Set<EntityId>;
  create(): EntityId;
  destroy(id: EntityId): void;
  // 组件存取由实现提供泛型 store; 此处仅声明核心组件表.
  transform(id: EntityId): Transform | undefined;
  mover(id: EntityId): Mover | undefined;
}
