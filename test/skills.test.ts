import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('野蛮人技能', () => {
  it('战嚎(war_cry) 命中并震慑环身多个敌人', () => {
    const g = new Game(11);
    g.skillTree = { war_cry: 1 }; g.assignSkill(2, 'war_cry');
    g.player.pos = { x: 10, y: 10 };
    g.spawnMonster('skeleton', 11, 10);
    g.spawnMonster('skeleton', 10, 11);
    g.spawnMonster('skeleton', 9, 10);
    const ok = g.useSkill(2);
    expect(ok).toBe(true);
    // 至少一个怪进入震慑(stunUntilMs 在未来)
    const stunned = g.monsters.filter((m) => m.combat.stunUntilMs > g.timeMs).length;
    expect(stunned).toBeGreaterThanOrEqual(1);
  });

  it('技能受冷却约束: 刚用过立即再用失败', () => {
    const g = new Game(12);
    g.player.pos = { x: 10, y: 10 };
    g.spawnMonster('skeleton', 11, 10);
    expect(g.useSkill(0)).toBe(true);
    expect(g.useSkill(0)).toBe(false); // 冷却中
    expect(g.skillCd[0]).toBeGreaterThan(0);
  });

  it('双挥(double_swing) 可同时命中身前多个敌人', () => {
    const g = new Game(13);
    g.skillTree = { double_swing: 1 }; g.assignSkill(1, 'double_swing');
    g.player.pos = { x: 10, y: 10 };
    g.player.facing = 0; // 朝 +x
    g.spawnMonster('skeleton', 11.5, 10);
    g.spawnMonster('skeleton', 11.5, 10.6);
    const hp0 = g.monsters.map((m) => m.combat.hp);
    g.useSkill(1);
    const hit = g.monsters.filter((m, i) => m.combat.hp < hp0[i]).length;
    expect(hit).toBeGreaterThanOrEqual(1);
  });
});
