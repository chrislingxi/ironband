import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';

// Round 10: 一键回收 — 卖白/蓝保留稀有以上。
describe('一键回收 + 背包满', () => {
  it('sellJunk 卖出普通/魔法, 保留稀有', () => {
    const g = new Game(1, 'barbarian');
    const white = makeNormalItem('short_sword'); // normal
    const blue = makeNormalItem('club'); blue.rarity = 'magic'; blue.identified = true;
    const rare = makeNormalItem('mace'); rare.rarity = 'rare'; rare.identified = true;
    g.inventory.push(white, blue, rare);
    const g0 = g.goldTotal;
    const n = g.sellJunk();
    expect(n).toBe(2);
    expect(g.goldTotal).toBeGreaterThan(g0);
    expect(g.inventory.length).toBe(1);
    expect(g.inventory[0].rarity).toBe('rare');
  });

  it('未鉴定的不被一键回收', () => {
    const g = new Game(1, 'barbarian');
    const unid = makeNormalItem('club'); unid.rarity = 'magic'; unid.identified = false;
    g.inventory.push(unid);
    expect(g.sellJunk()).toBe(0);
    expect(g.inventory.length).toBe(1);
  });
});
