import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';
import { attackInterval, iasFactor } from '../src/game/systems/combat/speed.ts';
import { hitRecoverySeconds } from '../src/game/systems/combat/recovery.ts';
import type { ItemInstance, RolledAffix, StatKey } from '../src/game/systems/items/types.ts';

function affix(it: ItemInstance, stat: StatKey, value: number): ItemInstance {
  it.affixes.push({ id: `t_${stat}`, kind: 'suffix', stat, value, label: stat } as RolledAffix);
  return it;
}

describe('攻速突破点 (IAS)', () => {
  it('ias=0 不改变基础攻速', () => {
    expect(attackInterval(0.45, 0)).toBeCloseTo(0.45, 5);
    expect(iasFactor(0)).toBe(1);
  });

  it('走突破点: 阈值之间无变化, 越过才跳档', () => {
    // 15 与 29 同档 (factor 1.15); 30 跳到下一档 (1.32)
    expect(iasFactor(15)).toBe(iasFactor(29));
    expect(iasFactor(30)).toBeGreaterThan(iasFactor(29));
  });

  it('IAS 越高攻击间隔越短 (单调不增)', () => {
    const a = attackInterval(0.6, 0);
    const b = attackInterval(0.6, 30);
    const c = attackInterval(0.6, 80);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
  });

  it('Game: 装备 IAS 词缀后攻击更快', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment.weapon = makeNormalItem('double_axe');
    g.recompute(true);
    const base = g.player.attackInterval;
    g.character.equipment.weapon = affix(makeNormalItem('double_axe'), 'ias', 40);
    g.recompute(true);
    expect(g.player.attackInterval).toBeLessThan(base);
  });
});

describe('受身突破点 (FHR)', () => {
  it('FHR 越高受身时间越短 (走突破点量化)', () => {
    const s0 = hitRecoverySeconds(9, 0);
    const s60 = hitRecoverySeconds(9, 60);
    expect(s60).toBeLessThan(s0);
  });

  it('Game: 装备 FHR 词缀喂入战斗数值', () => {
    const g = new Game(1, 'barbarian');
    g.recompute(true);
    expect(g.player.combat.fhr).toBe(0);
    g.character.equipment.armor = affix(makeNormalItem('chain'), 'fhr', 30);
    g.recompute(true);
    expect(g.player.combat.fhr).toBe(30);
  });
});
