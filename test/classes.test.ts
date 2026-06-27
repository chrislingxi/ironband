import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('三职业可玩 + 投射物', () => {
  it('按职业构造角色', () => {
    expect(new Game(1, 'barbarian').character.cls).toBe('barbarian');
    expect(new Game(1, 'amazon').character.cls).toBe('amazon');
    const sorc = new Game(1, 'sorceress');
    expect(sorc.character.cls).toBe('sorceress');
    expect(sorc.character.base.energy).toBeGreaterThan(20); // 法师高精力
  });

  it('亚马逊投射技能生成飞射物', () => {
    const g = new Game(2, 'amazon');
    g.skillTree = { magic_arrow: 1 }; g.assignSkill(1, 'magic_arrow');
    expect(g.missiles.length).toBe(0);
    expect(g.useSkill(1)).toBe(true); // 魔法箭(projectile)
    expect(g.missiles.length).toBeGreaterThan(0);
  });

  it('法师新星生成环形多发飞射物', () => {
    const g = new Game(3, 'sorceress');
    g.skillTree = { nova: 1 }; g.assignSkill(1, 'nova');
    g.useSkill(1); // 新星(nova)
    expect(g.missiles.length).toBeGreaterThanOrEqual(8);
  });

  it('玩家飞射物命中并伤害怪物', () => {
    const g = new Game(4, 'amazon');
    g.skillTree = { magic_arrow: 1 }; g.assignSkill(1, 'magic_arrow');
    g.player.pos = { x: 10, y: 10 };
    g.spawnMonster('zombie', 13, 10); // 正前方(+x)
    const hp0 = g.monsters[0].combat.hp;
    g.useSkill(1);
    for (let i = 0; i < 90; i++) g.update(1 / 60, { move: { x: 0, y: 0 } });
    const dmgDone = g.monsters.length === 0 || g.monsters[0].combat.hp < hp0;
    expect(dmgDone).toBe(true);
  });
});
