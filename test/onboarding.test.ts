import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('first five minutes onboarding', () => {
  it('does not grant starter loot before the first field', () => {
    const g = new Game(7, 'barbarian');
    expect(g.currentArea.id).toBe('rogue_encampment');
    expect(g.onboardingDropGranted).toBe(false);
    expect(g.inventory.length).toBe(0);
  });

  it('guarantees a wearable starter item on the first Blood Moor kill', () => {
    const g = new Game(7, 'barbarian');
    g.loadArea('blood_moor');
    const first = g.monsters[0];
    first.combat.hp = 0;
    first.dead = true;

    g.update(0.016, { move: { x: 0, y: 0 } });

    expect(g.onboardingDropGranted).toBe(true);
    expect(g.inventory.some((it) => it.name === '营火守望者皮手套')).toBe(true);
    const idx = g.inventory.findIndex((it) => it.name === '营火守望者皮手套');
    expect(g.equip(idx)).toBe(true);
    expect(g.character.equipment.gloves?.name).toBe('营火守望者皮手套');
  });
});
