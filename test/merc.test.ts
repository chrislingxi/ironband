import { describe, it, expect } from 'vitest';
import { makeMerc, updateMercAI, type MercContext } from '../src/game/systems/merc/index.ts';
import { makePlayer, makeMonster } from '../src/game/entities/factory.ts';
import type { Entity } from '../src/game/entities/entity.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

function ctx(player: Entity, monsters: Entity[], shots: Entity[]): MercContext {
  return {
    player, monsters, dt: 1 / 60, nowMs: 0,
    shoot: (_from, target) => shots.push(target),
  };
}

describe('雇佣兵', () => {
  it('随等级造兵: ally / 弓手 / 有血', () => {
    const m = makeMerc(10);
    expect(m.kind).toBe('ally');
    expect(m.ai).toBe('archer');
    expect(m.combat.maxHp).toBeGreaterThan(0);
    expect(m.attackRange).toBeGreaterThan(5);
  });

  it('射程内有怪 → 射箭并进入冷却', () => {
    const player = makePlayer();
    const merc = makeMerc(5);
    merc.pos = { x: 0, y: 0 };
    const mon = makeMonster('skeleton', 4, 0, mulberry32(1));
    const shots: Entity[] = [];
    updateMercAI(merc, ctx(player, [mon], shots));
    expect(shots.length).toBe(1);
    expect(merc.attackCd).toBeGreaterThan(0);
  });

  it('离玩家过远 → 向玩家靠拢', () => {
    const player = makePlayer();
    player.pos = { x: 0, y: 0 };
    const merc = makeMerc(5);
    merc.pos = { x: 10, y: 0 };
    const before = merc.pos.x;
    const shots: Entity[] = [];
    updateMercAI(merc, ctx(player, [], shots));
    expect(merc.pos.x).toBeLessThan(before); // 朝玩家(x=0)移动
    expect(merc.moving).toBe(true);
  });

  it('死亡时不动作', () => {
    const player = makePlayer();
    const merc = makeMerc(5);
    merc.dead = true;
    const mon = makeMonster('skeleton', 1, 0, mulberry32(1));
    const shots: Entity[] = [];
    updateMercAI(merc, ctx(player, [mon], shots));
    expect(shots.length).toBe(0);
  });
});
