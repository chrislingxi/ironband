import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

// Round 9: 精英强化 — minion pack + 地狱多词缀/多队长。
function eliteStats(g: Game) {
  g.loadArea('blood_moor');
  const elites = g.monsters.filter((m) => m.elite);
  const affixCounts = elites.map((e) => (e.elite!.name.split(' ').filter(Boolean)).length);
  return { count: g.monsters.length, elites: elites.length, maxAffix: Math.max(0, ...affixCounts) };
}

describe('精英强化', () => {
  it('野外存在精英队长且生成随从(怪量含随从)', () => {
    const g = new Game(7, 'barbarian');
    const s = eliteStats(g);
    expect(s.elites).toBeGreaterThan(0);
    // 队长各带 2-4 随从 → 总怪量明显多于基础刷怪
    expect(s.count).toBeGreaterThan(s.elites * 2);
  });

  it('地狱比普通有更多精英队长且词缀更多', () => {
    const gN = new Game(7, 'barbarian'); gN.difficulty = 'normal';
    const gH = new Game(7, 'barbarian'); gH.difficulty = 'hell';
    const sN = eliteStats(gN);
    const sH = eliteStats(gH);
    expect(sH.elites).toBeGreaterThanOrEqual(sN.elites);
    expect(sH.maxAffix).toBeGreaterThanOrEqual(sN.maxAffix);
    expect(sH.maxAffix).toBeGreaterThanOrEqual(3); // 地狱起步3词缀
  });
});
