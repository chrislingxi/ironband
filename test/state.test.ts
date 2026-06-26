import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('游戏状态机 (区域/阵亡/清场)', () => {
  it('起步在罗格营地(安全区, 无怪, cleared)', () => {
    const g = new Game(1);
    expect(g.currentArea.id).toBe('rogue_encampment');
    expect(g.currentArea.isTown).toBe(true);
    expect(g.monsters.length).toBe(0);
    expect(g.state).toBe('cleared');
  });

  it('进入野外区域会刷怪并 playing', () => {
    const g = new Game(1);
    g.loadArea('blood_moor');
    expect(g.currentArea.id).toBe('blood_moor');
    expect(g.monsters.length).toBeGreaterThan(0);
    expect(g.state).toBe('playing');
  });

  it('玩家阵亡 → dead; 重生回满血并重载区域', () => {
    const g = new Game(1);
    g.loadArea('blood_moor');
    g.player.combat.hp = 0;
    g.player.dead = true;
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.state).toBe('dead');
    g.respawn();
    expect(g.player.dead).toBe(false);
    expect(g.player.combat.hp).toBe(g.player.combat.maxHp);
    expect(g.state).toBe('playing');
  });
});
