import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem, generateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

// Round 3: 装备需求校验 (等级/力量/敏捷) + 未鉴定不可穿。
describe('装备需求校验', () => {
  it('未鉴定物品不可装备', () => {
    const g = new Game(1, 'barbarian');
    const it = makeNormalItem('double_axe');
    it.identified = false;
    g.inventory.push(it);
    expect(g.canEquip(it)).toBe(false);
    expect(g.equip(0)).toBe(false);
  });

  it('力量不足不可装备 (double_axe 需力43)', () => {
    const g = new Game(1, 'sorceress'); // 力10
    const it = makeNormalItem('double_axe'); // reqStr 43
    g.inventory.push(it);
    expect(g.canEquip(it)).toBe(false);
    expect(g.equip(0)).toBe(false);
    expect(g.character.equipment.weapon?.base.id).not.toBe('double_axe');
  });

  it('满足需求可装备', () => {
    const g = new Game(1, 'barbarian'); // 力30
    const it = makeNormalItem('short_sword'); // 力10
    g.inventory.push(it);
    expect(g.canEquip(it)).toBe(true);
    expect(g.equip(0)).toBe(true);
    expect(g.character.equipment.weapon?.base.id).toBe('short_sword');
  });

  it('等级不足不可装备', () => {
    const g = new Game(1, 'barbarian');
    g.character.base.str = 99; // 力够
    const it = makeNormalItem('double_axe'); // 需等级10
    g.inventory.push(it);
    g.recompute();
    expect(g.canEquip(it)).toBe(false); // 1级 < 10级
    g.character.level = 10;
    expect(g.canEquip(it)).toBe(true);
  });

  it('掉落的稀有物初始未鉴定, 故不可直接装备', () => {
    const rng = mulberry32(5);
    let rareUnid = null;
    for (let i = 0; i < 300 && !rareUnid; i++) {
      const it = generateItem(20, rng, 1);
      if (!it.identified) rareUnid = it;
    }
    expect(rareUnid).toBeTruthy();
    const g = new Game(1, 'barbarian');
    expect(g.canEquip(rareUnid!)).toBe(false);
  });
});
