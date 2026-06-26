import { describe, it, expect } from 'vitest';
import { buyPrice, sellPrice, gamblePrice, generateShopStock } from '../src/game/systems/economy/index.ts';
import { generateUniqueItem, generateGambleItem, makeNormalItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('经济定价', () => {
  it('卖价约为买价 1/4 且至少 1', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 50; i++) {
      const it = generateUniqueItem(20, rng);
      const buy = buyPrice(it);
      const sell = sellPrice(it);
      expect(sell).toBeGreaterThanOrEqual(1);
      expect(sell).toBe(Math.max(1, Math.floor(buy / 4)));
      expect(sell).toBeLessThan(buy);
    }
  });

  it('更稀有/带词缀的物品更值钱', () => {
    const white = makeNormalItem('short_sword');
    const uniq = generateUniqueItem(30, mulberry32(5));
    expect(buyPrice(uniq)).toBeGreaterThan(buyPrice(white));
  });

  it('赌博花费随区域等级递增', () => {
    expect(gamblePrice(20)).toBeGreaterThan(gamblePrice(5));
  });

  it('商店货架确定性且为已鉴定货', () => {
    const a = generateShopStock(10, mulberry32(3), 8);
    const b = generateShopStock(10, mulberry32(3), 8);
    expect(a.length).toBe(8);
    expect(a.map((i) => i.base.id)).toEqual(b.map((i) => i.base.id));
    for (const it of a) expect(it.identified).toBe(true);
  });
});

describe('暗金/赌博生成', () => {
  it('暗金为 unique 稀有度、未鉴定、带多条词缀', () => {
    const u = generateUniqueItem(25, mulberry32(42));
    expect(u.rarity).toBe('unique');
    expect(u.identified).toBe(false);
    expect(u.affixes.length).toBeGreaterThanOrEqual(1);
  });

  it('赌博出货必为未鉴定且魔法及以上', () => {
    const rng = mulberry32(2025);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const it = generateGambleItem(30, rng);
      expect(it.identified).toBe(false);
      expect(it.rarity).not.toBe('normal');
      seen.add(it.rarity);
    }
    expect(seen.has('magic')).toBe(true);
    expect(seen.has('rare')).toBe(true);
  });
});
