import { describe, it, expect } from 'vitest';
import { generateItem } from '../src/game/systems/items/generate.ts';
import { emptyBag, accumulateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';
import { UNIQUES } from '../src/game/data/uniques.ts';

describe('暗金掉落', () => {
  it('高稀有加成(Boss)下多次掉落能出暗金', () => {
    const rng = mulberry32(12345);
    let uniques = 0;
    for (let i = 0; i < 400; i++) {
      const it = generateItem(40, rng, 10); // Boss 级加成
      if (it.rarity === 'unique') uniques++;
    }
    expect(uniques).toBeGreaterThan(0); // 刷Boss应能出金
  });

  it('暗金物品携带固定词缀且能累计到属性', () => {
    // 直接造一个该等级必能取到的暗金 (用极高加成保证命中)
    const rng = mulberry32(7);
    let u = null as ReturnType<typeof generateItem> | null;
    for (let i = 0; i < 2000 && !u; i++) {
      const it = generateItem(60, rng, 50);
      if (it.rarity === 'unique') u = it;
    }
    expect(u).toBeTruthy();
    expect(u!.affixes.length).toBeGreaterThan(0);
    expect(u!.identified).toBe(false); // 暗金需鉴定
    expect(UNIQUES.some((d) => d.name === u!.name)).toBe(true);
    // 词缀可被装备属性系统消费
    const bag = emptyBag();
    accumulateItem(bag, u!);
    expect(Object.keys(bag).length).toBeGreaterThan(0);
  });
});
