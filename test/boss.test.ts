import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { andarielPhase } from '../src/game/systems/boss/andariel.ts';

describe('Phase C: 安达莉尔 Boss + 任务', () => {
  it('安达莉尔巢穴只刷一只高血 Boss', () => {
    const g = new Game(1, 'barbarian');
    g.loadArea('andariel_lair');
    expect(g.monsters.length).toBe(1);
    expect(g.monsters[0].defId).toBe('andariel');
    expect(g.monsters[0].combat.maxHp).toBeGreaterThan(300);
  });

  it('Boss 三阶段按血量切换', () => {
    expect(andarielPhase(100, 100)).toBe(0);
    expect(andarielPhase(50, 100)).toBe(1);
    expect(andarielPhase(20, 100)).toBe(2);
  });

  it('清场完成对应任务并发技能点奖励', () => {
    const g = new Game(1, 'barbarian');
    g.loadArea('den_of_evil');
    g.monsters = []; // 模拟清空
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.state).toBe('cleared');
    expect(g.questProgress['den_of_evil']).toBe('complete');
    expect(g.bonusSkillPoints).toBeGreaterThan(0);
  });

  it('击败安达莉尔通关第一幕', () => {
    const g = new Game(1, 'barbarian');
    g.loadArea('andariel_lair');
    g.monsters = []; // 模拟 Boss 阵亡
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.questProgress['andariel']).toBe('complete');
    expect(g.act1Complete).toBe(true);
  });
});
