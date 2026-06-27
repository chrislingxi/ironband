import { describe, it, expect } from 'vitest';
import { makeBarbarian, deriveCombat } from '../src/game/systems/stats/character.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';
import { Game } from '../src/game/sim/Game.ts';

describe('属性派生 (装备改变战力)', () => {
  it('穿盔甲提升防御', () => {
    const ch = makeBarbarian();
    const d0 = deriveCombat(ch).defense;
    ch.equipment.armor = makeNormalItem('leather');
    expect(deriveCombat(ch).defense).toBeGreaterThan(d0);
  });

  it('+生命词缀提升最大生命', () => {
    const ch = makeBarbarian();
    const base = deriveCombat(ch).maxHp;
    const armor = makeNormalItem('quilted');
    armor.affixes.push({ id: 's_life', kind: 'suffix', stat: 'maxhp', value: 20, label: '活力' });
    ch.equipment.armor = armor;
    expect(deriveCombat(ch).maxHp).toBe(base + 20);
  });

  it('+抗火词缀提升火抗(<=75)', () => {
    const ch = makeBarbarian();
    const ring = makeNormalItem('ring');
    ring.affixes.push({ id: 's_resf', kind: 'suffix', stat: 'res_fire', value: 15, label: '抗火' });
    ch.equipment.ring = ring;
    expect(deriveCombat(ch).resist.fire).toBe(15);
  });

  it('Game.equip 换更强武器提升伤害, 旧武器退回背包', () => {
    const g = new Game(1);
    g.character.level = 10; g.character.base.str = 50; g.recompute(); // 满足双刃斧需求(等级10/力43)
    const before = g.player.damage[0].max;
    g.inventory.push(makeNormalItem('double_axe'));
    expect(g.equip(0)).toBe(true);
    expect(g.player.damage[0].max).toBeGreaterThan(before);
    expect(g.character.equipment.weapon?.base.id).toBe('double_axe');
    expect(g.inventory.some((i) => i.base.id === 'hand_axe')).toBe(true);
  });
});
