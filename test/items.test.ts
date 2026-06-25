import { describe, it, expect } from 'vitest';
import { generateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('物品生成', () => {
  it('确定性: 同种子同结果', () => {
    const a = generateItem(10, mulberry32(99));
    const b = generateItem(10, mulberry32(99));
    expect(a.base.id).toBe(b.base.id);
    expect(a.rarity).toBe(b.rarity);
    expect(a.affixes.length).toBe(b.affixes.length);
  });

  it('稀有度按词缀数自洽 (magic 1-2, rare 3-6, normal 0)', () => {
    const rng = mulberry32(2024);
    for (let i = 0; i < 400; i++) {
      const it = generateItem(20, rng);
      if (it.rarity === 'normal') expect(it.affixes.length).toBe(0);
      if (it.rarity === 'magic') { expect(it.affixes.length).toBeGreaterThanOrEqual(1); expect(it.affixes.length).toBeLessThanOrEqual(2); }
      if (it.rarity === 'rare') { expect(it.affixes.length).toBeGreaterThanOrEqual(1); expect(it.affixes.length).toBeLessThanOrEqual(6); }
    }
  });

  it('高 ilvl 大量生成能滚出 magic 与 rare', () => {
    const rng = mulberry32(7);
    const rs = new Set<string>();
    for (let i = 0; i < 500; i++) rs.add(generateItem(25, rng).rarity);
    expect(rs.has('magic')).toBe(true);
    expect(rs.has('rare')).toBe(true);
  });

  it('词缀只落在适配槽位 (dmg_perc 仅武器)', () => {
    const rng = mulberry32(555);
    for (let i = 0; i < 500; i++) {
      const it = generateItem(25, rng);
      for (const a of it.affixes) {
        if (a.stat === 'dmg_perc') expect(it.base.slot).toBe('weapon');
      }
    }
  });
});
