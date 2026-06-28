import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { generateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';
import { CLASS_SKILLS } from '../src/game/classes/registry.ts';
import { requiredLevel } from '../src/game/classes/skilltree.ts';

// 自测「无头一局」: 用模拟代替人工逐 bug 复测, 锁住核心玩法不变量。
// 这些断言对应历轮真实问题 (法师普攻、自动攻击、全屏拾取、一键穿戴、技能树可达)。

const FIELDS = 'blood_moor';
function step(g: Game, n: number): void { for (let i = 0; i < n; i++) g.update(1 / 60, { move: { x: 0, y: 0 } }); }

describe('无头一局 · 核心玩法不变量', () => {
  it('法师普攻是远程光弹: 怪在射程内会自动发射玩家投射物', () => {
    const g = new Game(7, 'sorceress');
    g.loadArea(FIELDS);
    const m = g.monsters[0];
    expect(m).toBeTruthy();
    g.player.pos = { x: m.pos.x - 4, y: m.pos.y }; // 4 格 (近战够不到, 远程够得到)
    g.player.attackCd = 0;
    const before = g.missiles.filter((mi) => mi.fromPlayer).length;
    step(g, 3);
    const after = g.missiles.filter((mi) => mi.fromPlayer).length;
    expect(after).toBeGreaterThan(before); // 发射了光弹
  });

  it('法师普攻伤害 > 0 (与武器解耦, 不会出现"打不动")', () => {
    const g = new Game(7, 'sorceress');
    const bk = g.skillKey(0)!;
    expect(bk.kind).toBe('projectile');
    // skillDamage 是私有, 用一局命中验证: 让怪挨光弹后掉血
    g.loadArea(FIELDS);
    const m = g.monsters[0];
    const hp0 = m.combat.hp;
    g.player.pos = { x: m.pos.x - 3, y: m.pos.y };
    g.player.attackCd = 0;
    step(g, 90);
    expect(m.combat.hp).toBeLessThan(hp0); // 确实造成伤害
  });

  it('近战职业普攻自动挥击并伤害贴身怪', () => {
    const g = new Game(7, 'barbarian');
    g.loadArea(FIELDS);
    const m = g.monsters[0];
    const hp0 = m.combat.hp;
    g.player.pos = { x: m.pos.x - 0.5, y: m.pos.y };
    g.player.attackCd = 0;
    step(g, 120);
    expect(m.combat.hp).toBeLessThan(hp0);
  });

  it('全屏自动拾取: 远在地图另一端的掉落也会被收进背包', () => {
    const g = new Game(7, 'barbarian');
    g.loadArea(FIELDS);
    g.player.pos = { x: 2, y: 2 };
    g.groundItems.push({ id: 9991, pos: { x: 60, y: 60 }, item: generateItem(5, mulberry32(11)) });
    step(g, 2);
    expect(g.groundItems.find((gi) => gi.id === 9991)).toBeUndefined();
  });

  it('一键穿戴: 背包有可穿装备时至少装上一件', () => {
    const g = new Game(7, 'barbarian');
    for (let i = 0; i < 8; i++) { const it = generateItem(8, mulberry32(100 + i)); it.identified = true; g.inventory.push(it); }
    const equipped0 = Object.values(g.character.equipment).filter(Boolean).length;
    const n = g.equipBest();
    const equipped1 = Object.values(g.character.equipment).filter(Boolean).length;
    expect(n).toBeGreaterThan(0);
    expect(equipped1).toBeGreaterThan(equipped0);
  });

  it('技能树结构自洽: 每个技能的前置都属于同职业, 且需求等级随 tier 递增', () => {
    for (const cls of ['barbarian', 'amazon', 'sorceress'] as const) {
      const defs = CLASS_SKILLS[cls];
      const ids = new Set(defs.map((d) => d.id));
      for (const d of defs) {
        for (const p of d.prereqs) expect(ids.has(p), `${cls}/${d.id} 前置 ${p} 缺失`).toBe(true);
        // 前置的需求等级必须 < 本技能 (否则永远解不开)
        for (const p of d.prereqs) {
          const pre = defs.find((x) => x.id === p)!;
          expect(requiredLevel(pre)).toBeLessThanOrEqual(requiredLevel(d));
        }
      }
      // 每系(tab)都至少有一个 tier0 起手技 (否则整列锁死)
      for (let tab = 0; tab < 3; tab++) {
        const inTab = defs.filter((d) => d.tab === tab);
        expect(inTab.some((d) => d.tier === 0 && d.prereqs.length === 0), `${cls} tab${tab} 无起手技`).toBe(true);
      }
    }
  });

  it('升级即给技能点/属性点 (可成长)', () => {
    const g = new Game(7, 'sorceress');
    const sp0 = g.skillPointsAvailable();
    const lvl0 = g.character.level;
    g.grantXp(10000); // 直接灌经验触发多级
    expect(g.character.level).toBeGreaterThan(lvl0);
    expect(g.skillPointsAvailable()).toBeGreaterThan(sp0);
  });
});
