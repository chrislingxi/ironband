import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('Game 战斗沙盒', () => {
  it('玩家自动攻击会击杀贴身的弱怪并产出尸体', () => {
    const g = new Game(7);
    g.player.pos = { x: 10, y: 10 };
    g.spawnMonster('skeleton', 10.6, 10); // 骷髅直扑不逃, 贴在攻击范围内
    let killed = false;
    for (let i = 0; i < 600 && !killed; i++) {
      g.update(1 / 60, { move: { x: 0, y: 0 } });
      if (g.monsters.length === 0) killed = true;
    }
    expect(killed).toBe(true);
    expect(g.corpses.length).toBeGreaterThanOrEqual(1);
  });

  it('无萨满时堕落者会逃离玩家 (距离变大)', () => {
    const g = new Game(3);
    g.player.pos = { x: 10, y: 10 };
    g.player.attackCd = 9999; // 彻底关掉玩家反击, 隔离观察逃跑(否则可能先被秒)
    g.spawnMonster('fallen', 12, 10); // 5格内, 无萨满 → 逃跑
    const f = g.monsters[0];
    const before = Math.hypot(f.pos.x - 10, f.pos.y - 10);
    for (let i = 0; i < 20; i++) g.update(1 / 60, { move: { x: 0, y: 0 } }); // 20帧: 已逃离但仍在5格内(保持fleeing)
    const after = Math.hypot(f.pos.x - 10, f.pos.y - 10);
    expect(after).toBeGreaterThan(before);
    expect(f.fleeing).toBe(true);
  });

  it('怪物攻击会扣玩家血', () => {
    const g = new Game(5);
    g.player.pos = { x: 10, y: 10 };
    g.player.attackInterval = 999; // 关掉玩家反击, 隔离观察怪物造成的伤害
    g.spawnMonster('zombie', 10.7, 10);
    const hp0 = g.player.combat.hp;
    for (let i = 0; i < 300; i++) g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.player.combat.hp).toBeLessThan(hp0);
  });
});
