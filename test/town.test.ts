import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';

describe('Phase D: 营地经济', () => {
  it('商店买入: 扣金 + 入背包', () => {
    const g = new Game(1, 'barbarian');
    g.goldTotal = 100000;
    g.refreshShop();
    expect(g.shopStock.length).toBeGreaterThan(0);
    const uid = g.shopStock[0].uid;
    const gold0 = g.goldTotal;
    const inv0 = g.inventory.length;
    expect(g.buyItem(uid)).toBe(true);
    expect(g.inventory.length).toBe(inv0 + 1);
    expect(g.goldTotal).toBeLessThan(gold0);
  });

  it('出售: 加金 + 移除', () => {
    const g = new Game(1, 'barbarian');
    g.inventory.push(makeNormalItem('mace'));
    const uid = g.inventory[g.inventory.length - 1].uid;
    const gold0 = g.goldTotal;
    expect(g.sellItem(uid)).toBe(true);
    expect(g.goldTotal).toBeGreaterThan(gold0);
  });

  it('赌博: 花金得随机物', () => {
    const g = new Game(1, 'barbarian');
    g.goldTotal = 100000;
    const inv0 = g.inventory.length;
    expect(g.gamble()).toBe(true);
    expect(g.inventory.length).toBe(inv0 + 1);
  });

  it('鉴定: 未鉴定物花金变已鉴定', () => {
    const g = new Game(1, 'barbarian');
    g.goldTotal = 100000;
    const it = makeNormalItem('leather');
    it.identified = false;
    g.inventory.push(it);
    expect(g.identifyItem(it.uid)).toBe(true);
    expect(it.identified).toBe(true);
  });

  it('雇佣兵: 雇佣 + 阵亡复活', () => {
    const g = new Game(1, 'barbarian');
    g.goldTotal = 100000;
    expect(g.merc).toBeUndefined();
    expect(g.hireMerc()).toBe(true);
    expect(g.merc).toBeTruthy();
    g.merc!.dead = true;
    expect(g.reviveMerc()).toBe(true);
    expect(g.merc!.dead).toBe(false);
  });
});
