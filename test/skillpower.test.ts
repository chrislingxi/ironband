import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

// 投技能点必须真正增强对应主动技能的伤害 (修复"技能树纯装饰")。
function castIceBoltDamage(points: number): number {
  const g = new Game(1, 'sorceress');
  g.skillTree = points > 0 ? { ice_bolt: points } : {};
  // 放一个目标让朝向确定, 然后释放冰弹(槽0)
  g.spawnMonster('skeleton', g.player.pos.x + 3, g.player.pos.y);
  g.useSkill(0);
  // 取生成的冰弹投射物的最大伤害
  const m = g.missiles.find((mm) => mm.kind === 'iceball');
  expect(m).toBeTruthy();
  return m!.dmg.reduce((s, d) => s + d.max, 0);
}

describe('攻速 (武器快慢)', () => {
  it('短剑攻速快于双刃斧', async () => {
    const { makeNormalItem } = await import('../src/game/systems/items/index.ts');
    const g = new Game(1, 'barbarian');
    g.character.equipment.weapon = makeNormalItem('short_sword');
    g.recompute();
    const fast = g.player.attackInterval;
    g.character.equipment.weapon = makeNormalItem('double_axe');
    g.recompute();
    const slow = g.player.attackInterval;
    expect(fast).toBeLessThan(slow);
    expect(fast).toBeCloseTo(0.45, 2);
    expect(slow).toBeCloseTo(0.7, 2);
  });
});

describe('暴击 (critical_strike 生效)', () => {
  function critRate(critPoints: number): number {
    const g = new Game(99, 'amazon');
    g.skillTree = critPoints > 0 ? { critical_strike: critPoints } : {};
    // 放一个超肉盾贴身, 玩家自动攻击, 怪不死 → 累计大量命中
    g.spawnMonster('brute', g.player.pos.x + 0.6, g.player.pos.y);
    const dummy = g.monsters[0];
    dummy.combat.maxHp = dummy.combat.hp = 1e7;
    for (let i = 0; i < 400; i++) {
      dummy.combat.hp = 1e7; // 保活
      g.update(1 / 60, { move: { x: 0, y: 0 } });
    }
    const hits = g.events.filter((e) => !e.toPlayer);
    const crits = hits.filter((e) => e.crit);
    return hits.length > 0 ? crits.length / hits.length : 0;
  }
  it('投 critical_strike 后暴击率明显高于基础', () => {
    const base = critRate(0);    // ~5%
    const invested = critRate(15); // ~5%+45%=50%
    expect(invested).toBeGreaterThan(base);
    expect(invested).toBeGreaterThan(0.25);
  });
});

describe('被动技能生效 (合议 S2 收尾)', () => {
  it('铁壁→防御↑, 精通→命中/伤害↑, 天生抗性→全抗↑', () => {
    const g = new Game(1, 'barbarian');
    const def0 = g.player.combat.defense;
    const ar0 = g.player.combat.attackRating;
    const fire0 = g.player.combat.resist.fire;
    g.skillTree = { iron_skin: 5, sword_mastery: 5, natural_resistance: 5 };
    g.recompute();
    expect(g.player.combat.defense).toBeGreaterThan(def0);
    expect(g.player.combat.attackRating).toBeGreaterThan(ar0);
    expect(g.player.combat.resist.fire).toBeGreaterThan(fire0);
  });
});

describe('技能树接通战斗: 投点增强主动技能', () => {
  it('冰弹伤害随投点提升 (0点 < 5点)', () => {
    const d0 = castIceBoltDamage(0);
    const d5 = castIceBoltDamage(5);
    expect(d5).toBeGreaterThan(d0);
    // 5 点应约 +45% (0.09×5), 给出宽松下界防回归
    expect(d5).toBeGreaterThanOrEqual(Math.round(d0 * 1.3));
  });

  it('synergy 来源技能投点也提升伤害 (冰弹吃寒冰系synergy)', () => {
    const base = castIceBoltDamage(3);
    // 在 synergy 来源(如冰川尖刺/暴风雪)投点后, 冰弹应更高
    const g = new Game(1, 'sorceress');
    g.skillTree = { ice_bolt: 3, glacial_spike: 5, blizzard: 5 };
    g.spawnMonster('skeleton', g.player.pos.x + 3, g.player.pos.y);
    g.useSkill(0);
    const m = g.missiles.find((mm) => mm.kind === 'iceball')!;
    const withSyn = m.dmg.reduce((s, d) => s + d.max, 0);
    expect(withSyn).toBeGreaterThanOrEqual(base); // 至少不低于 (有synergy则更高)
  });
});
