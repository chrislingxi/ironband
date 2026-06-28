import { describe, it, expect } from 'vitest';
import { itemPower } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';

// 背包重设: 战力 (itemPower) 口径 — 稀有度加权 + 词缀求和, 用于背包一眼识强弱与"一键穿戴"。
describe('itemPower 战力口径', () => {
  it('稀有度越高, 同底材战力越高 (空词缀)', () => {
    const normal = makeNormalItem('short_sword'); normal.rarity = 'normal'; normal.affixes = [];
    const magic = makeNormalItem('short_sword'); magic.rarity = 'magic'; magic.affixes = [];
    const unique = makeNormalItem('short_sword'); unique.rarity = 'unique'; unique.affixes = [];
    expect(itemPower(magic)).toBeGreaterThan(itemPower(normal));
    expect(itemPower(unique)).toBeGreaterThan(itemPower(magic));
  });

  it('词缀数值计入战力', () => {
    const base = makeNormalItem('short_sword'); base.rarity = 'magic'; base.affixes = [];
    const buffed = makeNormalItem('short_sword'); buffed.rarity = 'magic';
    buffed.affixes = [{ stat: 'maxdam', value: 10, kind: 'suffix' } as never];
    expect(itemPower(buffed)).toBeGreaterThan(itemPower(base));
  });

  it('战力为非负整数', () => {
    const it = makeNormalItem('short_sword');
    const p = itemPower(it);
    expect(Number.isInteger(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(0);
  });
});
