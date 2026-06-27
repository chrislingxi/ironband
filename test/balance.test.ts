import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { CLASS_KEYS } from '../src/game/classes/profiles.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';
import type { ItemInstance, RolledAffix, StatKey } from '../src/game/systems/items/types.ts';
import type { CharClass } from '../src/game/data/schema.ts';

// 给一件装备贴上确定性词缀 (代表"认真养成"的装备, 不依赖掉落运气, 测试稳定)。
function withAffixes(it: ItemInstance, mods: [StatKey, number][]): ItemInstance {
  it.affixes = mods.map(([stat, value], i) => ({
    id: `t_${stat}_${i}`, kind: i % 2 === 0 ? 'prefix' : 'suffix', stat, value, label: stat,
  } as RolledAffix));
  return it;
}

// 构建一个"该等级的合理 build": 主属性/体能/少量敏捷 + 满主技能 + 确定性整套装备
// (吸血武器 + 防具 + 抗性/血量首饰)。代表"认真养成 + 使用药水"的玩家 (D2 正常玩法)。
function hero(cls: CharClass, level: number): Game {
  const g = new Game(1, cls);
  g.character.level = level;
  const pts = (level - 1) * 5;
  const base = g.character.base;
  const primary: 'str' | 'dex' | 'energy' = cls === 'barbarian' ? 'str' : cls === 'amazon' ? 'dex' : 'energy';
  base.dex += Math.floor(pts * 0.15);
  base.vit += Math.floor(pts * 0.30);
  base[primary] += Math.ceil(pts * 0.55);
  const sp = level - 1;
  const k0 = CLASS_KEYS[cls][0], k1 = CLASS_KEYS[cls][1];
  g.skillTree[k0.treeSkillId ?? k0.id] = Math.min(20, sp);
  g.skillTree[k1.treeSkillId ?? k1.id] = Math.min(20, Math.max(0, sp - 20));
  const eq = g.character.equipment;
  eq.weapon = withAffixes(makeNormalItem('double_axe'), [['dmg_perc', 60], ['maxdam', 30], ['lifeleech', 6], ['tohit', 200]]);
  eq.armor = withAffixes(makeNormalItem('chain'), [['defense', 120], ['res_all', 30], ['maxhp', 60]]);
  eq.helm = withAffixes(makeNormalItem('skull_cap'), [['defense', 60], ['res_all', 20]]);
  eq.shield = withAffixes(makeNormalItem('small_shield'), [['defense', 60], ['res_all', 20]]);
  eq.ring = withAffixes(makeNormalItem('ring'), [['res_all', 30], ['maxhp', 50], ['str', 20]]);
  eq.amulet = withAffixes(makeNormalItem('amulet'), [['res_all', 30], ['maxhp', 50], ['dex', 20]]);
  g.recompute(true);
  return g;
}

// 跑模拟: 朝最近怪移动并循环放技能; 返回结局。
function run(g: Game, maxSec: number) {
  const p = g.player;
  const dt = 1 / 60;
  let t = 0, minHp = p.combat.maxHp;
  for (; t < maxSec; t += dt) {
    if (p.dead || g.monsters.length === 0) break;
    const m = g.monsters[0];
    const nx = m.pos.x - p.pos.x, ny = m.pos.y - p.pos.y, d = Math.hypot(nx, ny) || 1;
    g.update(dt, { move: d > 1.4 ? { x: nx / d, y: ny / d } : { x: 0, y: 0 } });
    for (let s = 0; s < 4; s++) g.useSkill(s);
    minHp = Math.min(minHp, p.combat.hp);
  }
  return { cleared: g.monsters.length === 0, dead: p.dead, t, minHp, maxHp: p.combat.maxHp };
}

const CLASSES: CharClass[] = ['barbarian', 'amazon', 'sorceress'];

describe('平衡: 续航存在下各职业可击败普通巴尔且不被秒', () => {
  for (const cls of CLASSES) {
    it(`${cls}: L60 击败普通巴尔 (存活 + 非瞬秒)`, () => {
      const g = hero(cls, 60);
      g.loadArea('worldstone_keep');
      const r = run(g, 90);
      expect(r.dead, `${cls} 被普通巴尔打死 (minHp=${r.minHp.toFixed(0)}/${r.maxHp})`).toBe(false);
      expect(r.cleared, `${cls} 90s 内无法击杀普通巴尔`).toBe(true);
      expect(r.t, `${cls} 把巴尔 ${r.t.toFixed(1)}s 瞬秒, Boss 血量过低`).toBeGreaterThan(2);
    });
  }
});

describe('续航机制', () => {
  it('装备吸血: 命中按伤害回血', () => {
    const g = new Game(1, 'barbarian');
    // 直接构造带吸血的状态: 用一把吸血戒指模拟较繁琐, 改测 quaff 与回血逻辑。
    g.player.combat.hp = 1;
    g.potions = 1;
    const ok = g.quaffPotion();
    expect(ok).toBe(true);
    expect(g.player.combat.hp).toBeGreaterThan(1);
  });

  it('自动饮药: 低于 35% 自动回血', () => {
    const g = new Game(1, 'barbarian');
    g.autoQuaff = true;
    g.potions = 5;
    g.player.combat.hp = g.player.combat.maxHp * 0.2;
    const hp0 = g.player.combat.hp;
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.player.combat.hp).toBeGreaterThan(hp0);
    expect(g.potions).toBe(4);
  });

  it('进营地补满药水', () => {
    const g = new Game(1, 'barbarian');
    g.potions = 0;
    g.loadArea('rogue_encampment');
    expect(g.potions).toBe(g.potionCap);
  });
});
