import type { EntityId, IWorld, Transform, Mover } from './types.ts';

// 最小 ECS 实现. 组件存为 Map<EntityId, T>; feature 任务可加新组件 store.
export class World implements IWorld {
  readonly entities = new Set<EntityId>();
  private nextId = 1;
  private transforms = new Map<EntityId, Transform>();
  private movers = new Map<EntityId, Mover>();

  create(): EntityId {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  destroy(id: EntityId): void {
    this.entities.delete(id);
    this.transforms.delete(id);
    this.movers.delete(id);
  }

  transform(id: EntityId): Transform | undefined {
    return this.transforms.get(id);
  }
  mover(id: EntityId): Mover | undefined {
    return this.movers.get(id);
  }

  setTransform(id: EntityId, t: Transform): void {
    this.transforms.set(id, t);
  }
  setMover(id: EntityId, m: Mover): void {
    this.movers.set(id, m);
  }
}
