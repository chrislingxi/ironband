import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

describe('经验与升级', () => {
  it('xpForNext 随等级递增', () => {
    const g = new Game(1);
    expect(g.xpForNext(2)).toBeGreaterThan(g.xpForNext(1));
    expect(g.xpForNext(5)).toBeGreaterThan(g.xpForNext(2));
  });

  it('够经验则升级, 获得 5 点属性点 (手动加点); 投体能提升生命', () => {
    const g = new Game(1);
    const vit0 = g.character.base.vit;
    g.grantXp(g.xpForNext(1));
    expect(g.character.level).toBe(2);
    expect(g.statPoints).toBe(5); // D2: 每级 5 点
    expect(g.character.base.vit).toBe(vit0); // 不再自动加点
    const hp0 = g.player.combat.maxHp;
    g.allocateStat('vit');
    expect(g.statPoints).toBe(4);
    expect(g.character.base.vit).toBe(vit0 + 1);
    expect(g.player.combat.maxHp).toBeGreaterThan(hp0); // 投体能后生命↑
    expect(g.notices.some((n) => n.includes('升级'))).toBe(true);
  });

  it('洗点: 花金重置属性并退回全部点数', () => {
    const g = new Game(1);
    g.grantXp(g.xpForNext(1) + g.xpForNext(2)); // 升到 3 级
    g.allocateStat('str'); g.allocateStat('str');
    g.goldTotal = 9999;
    expect(g.respecStats()).toBe(true);
    expect(g.statPoints).toBe((g.character.level - 1) * 5); // 全退回
    expect(g.character.base.str).toBe(30); // 野蛮人起手力量
  });

  it('一次大量经验可连升多级', () => {
    const g = new Game(1);
    g.grantXp(g.xpForNext(1) + g.xpForNext(2) + g.xpForNext(3));
    expect(g.character.level).toBe(4);
  });
});
