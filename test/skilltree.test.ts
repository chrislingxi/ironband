import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('技能树投点与难度', () => {
  it('1级无技能点; 升级后可投点', () => {
    const g = new Game(1);
    expect(g.skillPointsAvailable()).toBe(0);
    expect(g.investSkill('bash')).toBe(false);
    g.grantXp(g.xpForNext(1) + g.xpForNext(2) + g.xpForNext(3));
    expect(g.skillPointsAvailable()).toBeGreaterThan(0);
  });

  it('可投无前置技能, 投点后记录; 未满足前置则拒绝', () => {
    const g = new Game(1);
    g.grantXp(g.xpForNext(1) + g.xpForNext(2) + g.xpForNext(3) + g.xpForNext(4) + g.xpForNext(5));
    expect(g.investSkill('bash')).toBe(true); // tier0 无前置
    expect(g.skillTree['bash']).toBe(1);
    expect(g.investSkill('whirlwind')).toBe(false); // 前置(专注+狂热)未投
  });

  it('切换难度施加抗性惩罚并重载区域', () => {
    const g = new Game(1);
    const fire0 = g.player.combat.resist.fire;
    g.setDifficulty('nightmare');
    expect(g.difficulty).toBe('nightmare');
    expect(g.player.combat.resist.fire).toBeLessThan(fire0); // 噩梦 -40
    expect(g.currentArea).toBeTruthy();
  });
});
