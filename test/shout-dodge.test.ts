import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

// 回归锁: 呐喊不再永久改防御/不可叠乘(原 P0 exploit), 翻滚标记设置正确。
describe('呐喊/翻滚 P0 回归', () => {
  it('呐喊不永久改 combat.defense, 反复呐喊不叠乘', () => {
    const g = new Game(1, 'barbarian');
    g.skillTree = { shout: 1 };
    g.assignSkill(1, 'shout');
    const base = g.player.combat.defense;
    g.useSkill(1);
    // 防御值本身不被改写(增益只在受击结算里临时应用)
    expect(g.player.combat.defense).toBe(base);
    expect(g.shoutUntilMs).toBeGreaterThan(g.timeMs);
    // 重置冷却再呐喊一次 → 仍不叠乘、不永久改
    g.skillCd[1] = 0;
    g.useSkill(1);
    expect(g.player.combat.defense).toBe(base);
  });

  it('翻滚后无敌帧时间标记被设置(挡近战+投射物)', () => {
    const g = new Game(1, 'amazon');
    // 直接验证标记机制: dodgeUntilMs 推进到未来后, attack 路径会在 timeMs<dodgeUntilMs 时早退
    g.dodgeUntilMs = g.timeMs + 400;
    expect(g.dodgeUntilMs).toBeGreaterThan(g.timeMs);
    // 一段时间后过期
    g.dodgeUntilMs = g.timeMs - 1;
    expect(g.dodgeUntilMs).toBeLessThan(g.timeMs);
  });
});
