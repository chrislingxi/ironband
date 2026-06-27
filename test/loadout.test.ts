import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { serializeGame, applySave } from '../src/game/systems/save/index.ts';
import { defaultLoadout, CASTABLE_SKILLS } from '../src/game/classes/profiles.ts';
import { BASIC_ATTACK } from '../src/game/classes/exec.ts';

// M3: 技能栏 = 1 普通攻击(槽0固定) + 3 个技能树槽(学了才能上)。
describe('技能栏 (1普攻 + 3技能树槽)', () => {
  it('默认装载: 槽0普通攻击, 槽1-3空', () => {
    const g = new Game(1, 'sorceress');
    expect(g.assignedSkills).toEqual(defaultLoadout('sorceress'));
    expect(g.skillKey(0)?.id).toBe(BASIC_ATTACK.id);
    expect(g.skillKey(1)).toBeUndefined();
    expect(g.skillKey(2)).toBeUndefined();
  });

  it('普通攻击专属槽0, 不可指派到其它槽; 槽0不可被改', () => {
    const g = new Game(1, 'barbarian');
    expect(g.canAssignSkill(BASIC_ATTACK.id)).toBe(false);
    expect(g.assignSkill(1, BASIC_ATTACK.id)).toBe(false);
    expect(g.assignSkill(0, 'bash')).toBe(false); // 槽0锁定
    expect(g.skillKey(0)?.id).toBe(BASIC_ATTACK.id);
  });

  it('未学的技能不可上; 学过后可指派到槽1-3并能施放', () => {
    const g = new Game(1, 'sorceress');
    expect(g.canAssignSkill('blizzard')).toBe(false);
    g.skillTree = { blizzard: 1 };
    expect(g.canAssignSkill('blizzard')).toBe(true);
    expect(g.assignSkill(1, 'blizzard')).toBe(true);
    expect(g.skillKey(1)?.name).toBe('暴风雪');
    // 能真正施放 (暴风雪是 aoe → 产生冲击环)
    g.castFx.length = 0;
    g.useSkill(1);
    expect(g.castFx.length).toBeGreaterThan(0);
  });

  it('同一技能不占两个槽 (换槽自动清旧)', () => {
    const g = new Game(1, 'amazon');
    g.skillTree = { multiple_shot: 1 };
    g.assignSkill(1, 'multiple_shot');
    g.assignSkill(2, 'multiple_shot');
    expect(g.assignedSkills[1]).toBe(''); // 旧槽被清
    expect(g.assignedSkills[2]).toBe('multiple_shot');
  });

  it('每职业可施放池含普通攻击 + 多个主动技 (>10)', () => {
    for (const cls of ['barbarian', 'amazon', 'sorceress'] as const) {
      expect(CASTABLE_SKILLS[cls][0].id).toBe(BASIC_ATTACK.id);
      expect(CASTABLE_SKILLS[cls].length).toBeGreaterThan(10);
    }
  });

  it('装载随存档往返', () => {
    const g = new Game(1, 'amazon');
    g.skillTree = { strafe: 1 };
    g.assignSkill(1, 'strafe');
    const g2 = new Game(2, 'barbarian');
    applySave(g2, serializeGame(g));
    expect(g2.assignedSkills[1]).toBe('strafe');
    expect(g2.skillKey(1)?.name).toBe('扫射');
  });
});
