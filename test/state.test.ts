import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('游戏状态机 (阵亡/清场/波次)', () => {
  it('无怪时进入清场状态', () => {
    const g = new Game(1);
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.state).toBe('cleared');
  });

  it('迎战下一波: wave递增并刷新怪物', () => {
    const g = new Game(1);
    g.update(1 / 60, { move: { x: 0, y: 0 } }); // → cleared
    g.nextWave();
    expect(g.wave).toBe(2);
    expect(g.state).toBe('playing');
    expect(g.monsters.length).toBeGreaterThan(0);
  });

  it('玩家阵亡 → dead; 重生回满血并复位', () => {
    const g = new Game(1);
    g.spawnMonster('skeleton', 50, 50);
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
