import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

// 技能落点冲击环 (castFx) — AoE/Nova 施放时产生可视环。
describe('技能冲击环', () => {
  it('法师冰霜新星(nova)施放产生落点冲击环', () => {
    const g = new Game(1, 'sorceress');
    g.skillTree = { frost_nova: 1 };
    g.assignSkill(1, 'frost_nova');
    g.spawnMonster('skeleton', g.player.pos.x + 2, g.player.pos.y);
    g.castFx.length = 0;
    g.useSkill(1);
    expect(g.castFx.length).toBeGreaterThan(0);
    expect(g.castFx[0].radius).toBeGreaterThan(0);
  });

  it('新星(nova)施放产生冲击环', () => {
    const g = new Game(1, 'sorceress');
    g.skillTree = { nova: 1 };
    g.assignSkill(1, 'nova');
    g.castFx.length = 0;
    g.useSkill(1);
    expect(g.castFx.length).toBeGreaterThan(0);
  });
});
