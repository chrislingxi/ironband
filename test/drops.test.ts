import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { generateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('掉落与拾取', () => {
  it('地面物品被玩家磁吸进背包', () => {
    const g = new Game(1);
    g.player.pos = { x: 10, y: 10 };
    g.groundItems.push({ id: 1, pos: { x: 10, y: 10 }, item: generateItem(5, mulberry32(1)) });
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.inventory.length).toBe(1);
    expect(g.groundItems.length).toBe(0);
  });

  it('背包满时不再拾取, 物品留在地面', () => {
    const g = new Game(1);
    g.invCap = 1;
    g.player.pos = { x: 10, y: 10 };
    g.inventory.push(generateItem(1, mulberry32(2)));
    g.groundItems.push({ id: 1, pos: { x: 10, y: 10 }, item: generateItem(5, mulberry32(3)) });
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.inventory.length).toBe(1);
    expect(g.groundItems.length).toBe(1);
  });
});
