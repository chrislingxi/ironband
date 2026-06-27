import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';
import type { ItemInstance, RolledAffix, StatKey } from '../src/game/systems/items/types.ts';
import type { CharClass } from '../src/game/data/schema.ts';

// M4 数值校验回归: 认真养成的三职业都应能击败地狱巴尔且存活 (不被秒、能打动)。
function aff(it: ItemInstance, mods: [StatKey, number][]) {
  it.affixes = mods.map(([stat, value], i) => ({ id: `t${i}`, kind: i % 2 ? 'suffix' : 'prefix', stat, value, label: '' } as RolledAffix));
  return it;
}
function hero(cls: CharClass, level: number, skills: [string, string]): Game {
  const g = new Game(7, cls); g.character.level = level;
  const pts = (level - 1) * 5, base = g.character.base;
  const prim = cls === 'barbarian' ? 'str' : cls === 'amazon' ? 'dex' : 'energy';
  base.dex += Math.floor(pts * 0.15); base.vit += Math.floor(pts * 0.35); (base as Record<string, number>)[prim] += Math.ceil(pts * 0.5);
  g.skillTree = { [skills[0]]: 20, [skills[1]]: Math.max(1, level - 21) };
  g.assignSkill(1, skills[0]); g.assignSkill(2, skills[1]);
  const e = g.character.equipment;
  e.weapon = aff(makeNormalItem('double_axe'), [['dmg_perc', 80], ['maxdam', 40], ['lifeleech', 6], ['tohit', 400]]);
  e.armor = aff(makeNormalItem('chain'), [['defense', 180], ['res_all', 40], ['maxhp', 80]]);
  e.helm = aff(makeNormalItem('skull_cap'), [['defense', 80], ['res_all', 25]]);
  e.shield = aff(makeNormalItem('small_shield'), [['defense', 80], ['res_all', 25]]);
  e.ring = aff(makeNormalItem('ring'), [['res_all', 40], ['maxhp', 60], ['str', 25]]);
  e.amulet = aff(makeNormalItem('amulet'), [['res_all', 40], ['maxhp', 60], ['dex', 25]]);
  g.potions = 8; g.recompute(true); return g;
}
function fight(g: Game, melee: boolean, maxSec: number) {
  const p = g.player; const dt = 1 / 60; let t = 0, minHp = p.combat.maxHp;
  for (; t < maxSec; t += dt) {
    if (p.dead || g.monsters.length === 0) break;
    const m = g.monsters[0]; const nx = m.pos.x - p.pos.x, ny = m.pos.y - p.pos.y, d = Math.hypot(nx, ny) || 1;
    const want = melee ? 1.2 : 6; let mv = { x: 0, y: 0 };
    if (d > want) mv = { x: nx / d, y: ny / d }; else if (d < want - 1) mv = { x: -nx / d, y: -ny / d };
    g.update(dt, { move: mv });
    for (let s = 1; s <= 3; s++) g.useSkill(s);
    minHp = Math.min(minHp, p.combat.hp);
  }
  return { killed: g.monsters.length === 0, dead: p.dead, t, minHpFrac: minHp / p.combat.maxHp };
}

describe('M4 数值回归: 三职业地狱巴尔可通关且存活', () => {
  const cases: [CharClass, [string, string], boolean][] = [
    ['barbarian', ['whirlwind', 'concentrate'], true],
    ['amazon', ['guided_arrow', 'strafe'], false],
    ['sorceress', ['blizzard', 'meteor'], false],
  ];
  for (const [cls, skills, melee] of cases) {
    it(`${cls}: L80 击败地狱巴尔且存活`, () => {
      const g = hero(cls, 80, skills); g.difficulty = 'hell'; g.recompute(true);
      g.loadArea('worldstone_keep');
      const r = fight(g, melee, 90);
      expect(r.killed, `${cls} 未能击杀地狱巴尔`).toBe(true);
      expect(r.dead, `${cls} 被地狱巴尔打死`).toBe(false);
    });
  }
});
