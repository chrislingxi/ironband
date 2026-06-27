import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { serializeGame, applySave } from '../src/game/systems/save/index.ts';
import { defaultLoadout, CASTABLE_SKILLS } from '../src/game/classes/profiles.ts';

describe('技能键装载 (K: 技能槽绑定技能树技能)', () => {
  it('默认装载为该职业起手4键', () => {
    const g = new Game(1, 'sorceress');
    expect(g.assignedSkills).toEqual(defaultLoadout('sorceress'));
    expect(g.skillKey(0).id).toBe('ice_bolt');
  });

  it('未投点的扩充技能不可装备', () => {
    const g = new Game(1, 'sorceress');
    expect(g.canAssignSkill('blizzard')).toBe(false); // 暴风雪未学
    expect(g.assignSkill(0, 'blizzard')).toBe(false);
    expect(g.skillKey(0).id).toBe('ice_bolt'); // 未改变
  });

  it('投点后可把扩充技能绑定到槽, HUD/施放随之改变', () => {
    const g = new Game(1, 'sorceress');
    g.skillTree = { blizzard: 1 }; // 学了暴风雪
    expect(g.canAssignSkill('blizzard')).toBe(true);
    expect(g.assignSkill(0, 'blizzard')).toBe(true);
    expect(g.skillKey(0).id).toBe('blizzard');
    expect(g.skillKey(0).name).toBe('暴风雪');
  });

  it('默认4键无需投点即可随意换位', () => {
    const g = new Game(1, 'barbarian');
    // 把槽0换成默认池里的战嚎(war_cry, 起手键之一)
    expect(g.assignSkill(0, 'war_cry')).toBe(true);
    expect(g.skillKey(0).id).toBe('war_cry');
  });

  it('绑定的技能能真正施放 (投点扩充技能可打出)', () => {
    const g = new Game(1, 'sorceress');
    g.skillTree = { charged_bolt: 5 };
    g.assignSkill(0, 'charged_bolt');
    g.spawnMonster('skeleton', g.player.pos.x + 3, g.player.pos.y);
    const ok = g.useSkill(0);
    expect(ok).toBe(true);
    // 闪电球是 spread bolt → 生成多个 bolt 投射物
    expect(g.missiles.length).toBeGreaterThan(1);
  });

  it('装载随存档往返; 旧档缺字段按职业默认', () => {
    const g = new Game(1, 'amazon');
    g.skillTree = { strafe: 1 };
    g.assignSkill(1, 'strafe');
    const g2 = new Game(2, 'barbarian');
    applySave(g2, serializeGame(g));
    expect(g2.assignedSkills[1]).toBe('strafe');
    // 旧档(删字段)
    const data = serializeGame(g) as unknown as Record<string, unknown>;
    delete data.assignedSkills;
    const g3 = new Game(3, 'barbarian');
    applySave(g3, data as never);
    expect(g3.assignedSkills).toEqual(defaultLoadout('amazon'));
  });

  it('每职业可装备池含默认4键+扩充技能', () => {
    for (const cls of ['barbarian', 'amazon', 'sorceress'] as const) {
      expect(CASTABLE_SKILLS[cls].length).toBeGreaterThan(4);
      for (const id of defaultLoadout(cls)) {
        expect(CASTABLE_SKILLS[cls].some((k) => k.id === id)).toBe(true);
      }
    }
  });
});
