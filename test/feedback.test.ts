import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

// Round 1: 战斗反馈事件 — miss/元素色/免疫/吸血/经验 飘字数据。
describe('战斗反馈事件', () => {
  it('击杀怪物推送 +XP 经验事件', () => {
    const g = new Game(1, 'barbarian');
    g.spawnMonster('skeleton', g.player.pos.x + 0.6, g.player.pos.y);
    const m = g.monsters[0];
    m.combat.maxHp = m.combat.hp = 1; // 一击必杀
    for (let i = 0; i < 200 && g.monsters.length; i++) g.update(1 / 60, { move: { x: 0, y: 0 } });
    // 历史上某帧应出现过 xp 事件 (events 每帧清空, 故用一个累积器重跑)
    const g2 = new Game(1, 'barbarian');
    g2.spawnMonster('skeleton', g2.player.pos.x + 0.6, g2.player.pos.y);
    g2.monsters[0].combat.maxHp = g2.monsters[0].combat.hp = 1;
    let sawXp = false;
    for (let i = 0; i < 200 && g2.monsters.length; i++) {
      g2.update(1 / 60, { move: { x: 0, y: 0 } });
      if (g2.events.some((e) => e.xp && e.xp > 0)) sawXp = true;
    }
    expect(sawXp).toBe(true);
  });

  it('命中事件带元素类型 (法师冰弹=cold)', () => {
    const g = new Game(1, 'sorceress');
    g.spawnMonster('skeleton', g.player.pos.x + 3, g.player.pos.y);
    g.monsters[0].combat.maxHp = g.monsters[0].combat.hp = 9999; // 保活看命中
    let sawCold = false;
    for (let i = 0; i < 120; i++) {
      g.useSkill(0); // 冰弹
      g.update(1 / 60, { move: { x: 0, y: 0 } });
      if (g.events.some((e) => e.dmgType === 'cold' && e.amount > 0)) sawCold = true;
    }
    expect(sawCold).toBe(true);
  });

  it('吸血命中推送回血事件', () => {
    const g = new Game(1, 'barbarian');
    // 直接给玩家吸血并掉血, 贴脸肉盾, 自动攻击应回血并推 heal 事件
    (g as unknown as { lifeLeechPct: number }).lifeLeechPct = 50;
    g.player.combat.hp = 10;
    g.spawnMonster('brute', g.player.pos.x + 0.6, g.player.pos.y);
    g.monsters[0].combat.maxHp = g.monsters[0].combat.hp = 1e7;
    let sawHeal = false;
    for (let i = 0; i < 300; i++) {
      g.monsters[0].combat.hp = 1e7;
      g.update(1 / 60, { move: { x: 0, y: 0 } });
      if (g.events.some((e) => e.heal && e.heal > 0)) sawHeal = true;
    }
    expect(sawHeal).toBe(true);
  });

  it('免疫: 抗性≥100 的元素伤害归零并标记 immune', () => {
    const g = new Game(1, 'sorceress');
    g.spawnMonster('skeleton', g.player.pos.x + 3, g.player.pos.y);
    g.monsters[0].combat.resist.cold = 100; // 冰免疫
    g.monsters[0].combat.maxHp = g.monsters[0].combat.hp = 9999;
    let sawImmune = false;
    for (let i = 0; i < 120; i++) {
      g.useSkill(0);
      g.update(1 / 60, { move: { x: 0, y: 0 } });
      if (g.events.some((e) => e.immune)) sawImmune = true;
    }
    expect(sawImmune).toBe(true);
  });
});
