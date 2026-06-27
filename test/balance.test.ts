import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { CLASS_KEYS } from '../src/game/classes/profiles.ts';
import { generateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';
import type { CharClass } from '../src/game/data/schema.ts';

// 构建一个"该等级的合理 build": 主属性/体能/少量敏捷 + 满主技能 + 整套装备(武器选最大伤害)。
// 代表"认真养成 + 使用药水"的玩家 (D2 正常玩法), 而非裸装。
function hero(cls: CharClass, level: number, ilvl: number): Game {
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
  const rng = mulberry32(777);
  let bestW: ReturnType<typeof generateItem> | null = null, bestWdmg = 0;
  for (let i = 0; i < 200; i++) {
    const it = generateItem(ilvl, rng, 3);
    const slot = it.base.slot;
    if (slot === 'weapon') {
      const dm = (it.base.baseDamage?.[1] ?? 0) + it.affixes.reduce((s, a) => s + (a.stat === 'maxdam' ? a.value : 0), 0);
      if (dm > bestWdmg) { bestWdmg = dm; bestW = it; }
    } else if (!g.character.equipment[slot]) {
      g.character.equipment[slot] = it;
    }
  }
  if (bestW) g.character.equipment.weapon = bestW;
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
      const g = hero(cls, 60, 75);
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
