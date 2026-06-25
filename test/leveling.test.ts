import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('经验与升级', () => {
  it('xpForNext 随等级递增', () => {
    const g = new Game(1);
    expect(g.xpForNext(2)).toBeGreaterThan(g.xpForNext(1));
    expect(g.xpForNext(5)).toBeGreaterThan(g.xpForNext(2));
  });

  it('够经验则升级, 自动加点并提升最大生命', () => {
    const g = new Game(1);
    const hp0 = g.player.combat.maxHp;
    const vit0 = g.character.base.vit;
    g.grantXp(g.xpForNext(1));
    expect(g.character.level).toBe(2);
    expect(g.character.base.vit).toBe(vit0 + 2);
    expect(g.player.combat.maxHp).toBeGreaterThan(hp0);
    expect(g.notices.some((n) => n.includes('升级'))).toBe(true);
  });

  it('一次大量经验可连升多级', () => {
    const g = new Game(1);
    g.grantXp(g.xpForNext(1) + g.xpForNext(2) + g.xpForNext(3));
    expect(g.character.level).toBe(4);
  });
});
