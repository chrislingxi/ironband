import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { generateUniqueItem, makeNormalItem } from '../src/game/systems/items/index.ts';
import { buyPrice, sellPrice } from '../src/game/systems/economy/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('营地服务 + 经济 (Phase D)', () => {
  it('进城刷新商店货架', () => {
    const g = new Game(1);
    expect(g.shopStock.length).toBeGreaterThan(0);
  });

  it('买入: 扣金且物品入背包; 金不足则失败', () => {
    const g = new Game(1);
    const it = g.shopStock[0];
    const price = buyPrice(it);
    g.goldTotal = price;
    const before = g.inventory.length;
    expect(g.buyFromShop(0)).toBe(true);
    expect(g.goldTotal).toBe(0);
    expect(g.inventory.length).toBe(before + 1);
    // 没钱再买失败
    expect(g.buyFromShop(0)).toBe(false);
  });

  it('卖出: 得金 ≈ 买价 1/4 且移出背包', () => {
    const g = new Game(1);
    const sword = makeNormalItem('short_sword');
    g.inventory.push(sword);
    const gold0 = g.goldTotal;
    expect(g.sellToShop(g.inventory.length - 1)).toBe(true);
    expect(g.goldTotal).toBe(gold0 + sellPrice(sword));
  });

  it('赌博: 花金得未鉴定物', () => {
    const g = new Game(1);
    g.goldTotal = g.gambleCost();
    const before = g.inventory.length;
    expect(g.gamble()).toBe(true);
    expect(g.inventory.length).toBe(before + 1);
    expect(g.inventory[g.inventory.length - 1].identified).toBe(false);
    expect(g.goldTotal).toBe(0);
  });

  it('未鉴定物不可穿戴, 鉴定后可穿戴', () => {
    const g = new Game(1);
    const uniq = generateUniqueItem(20, mulberry32(7));
    g.inventory.push(uniq);
    const idx = g.inventory.length - 1;
    expect(g.equip(idx)).toBe(false); // 未鉴定挡下
    g.identifyAll();
    expect(uniq.identified).toBe(true);
    expect(g.equip(idx)).toBe(true);
  });

  it('雇佣兵: 未解锁不可雇; 解锁后雇佣扣金、随行', () => {
    const g = new Game(1);
    g.goldTotal = 99999;
    expect(g.hireMerc()).toBe(false); // 未解锁
    g.mercUnlocked = true;
    expect(g.hireMerc()).toBe(true);
    expect(g.merc).not.toBeNull();
    expect(g.merc!.kind).toBe('ally');
    expect(g.hireMerc()).toBe(false); // 已有
  });

  it('雇佣兵: 死亡后可花金复活', () => {
    const g = new Game(1);
    g.goldTotal = 99999;
    g.mercUnlocked = true;
    g.hireMerc();
    g.merc!.dead = true;
    g.merc!.combat.hp = 0;
    expect(g.reviveMerc()).toBe(true);
    expect(g.merc!.dead).toBe(false);
    expect(g.merc!.combat.hp).toBe(g.merc!.combat.maxHp);
  });

  it('仓库: 背包↔仓库存取', () => {
    const g = new Game(1);
    const item = makeNormalItem('club');
    g.inventory.push(item);
    const i = g.inventory.length - 1;
    expect(g.stashDeposit(i)).toBe(true);
    expect(g.stash).toContain(item);
    expect(g.stashWithdraw(g.stash.length - 1)).toBe(true);
    expect(g.inventory).toContain(item);
  });
});
