import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { generateItem } from '../src/game/systems/items/index.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';
import { CLASS_SKILLS } from '../src/game/classes/registry.ts';
import { requiredLevel, pointsIn } from '../src/game/classes/skilltree.ts';
import type { SkillDef, CharClass } from '../src/game/data/schema.ts';

// ── 自动玩家 BOT · 平衡探针 ──
// 模拟"人类玩家"：升级→自动加点→把技能点全堆进一条主伤害链(含前置+协同)→捡满装备一键穿戴→
// 走位到 Boss 并循环施放主技能。测量 Boss 击杀耗时(秒/施放次数)/是否被秒/玩家死亡。
// 目的：把"堆叠后第一关 Boss 三四发秒杀"这类失衡量化出来, 供自迭代调平。

const STAT_WEIGHT: Record<CharClass, Array<'str' | 'dex' | 'vit' | 'energy'>> = {
  sorceress: ['energy', 'vit', 'energy', 'str'],
  amazon: ['dex', 'vit', 'dex', 'str'],
  barbarian: ['str', 'vit', 'str', 'dex'],
};
// 各职业主伤害链 (主技能 + 前置 + 协同来源)，BOT 全力堆这条。
const PRIMARY: Record<CharClass, { target: string; chain: string[] }> = {
  sorceress: { target: 'blizzard', chain: ['ice_bolt', 'ice_blast', 'glacial_spike', 'blizzard'] },
  amazon: { target: 'ice_arrow', chain: ['magic_arrow', 'cold_arrow', 'ice_arrow'] },
  barbarian: { target: 'frenzy', chain: ['bash', 'double_swing', 'frenzy'] },
};

function grantToLevel(g: Game, lvl: number): void {
  let guard = 0;
  while (g.character.level < lvl && guard++ < 200) g.grantXp(g.xpForNext());
}

function planSkills(g: Game, cls: CharClass): string {
  const defs: SkillDef[] = CLASS_SKILLS[cls];
  const { chain } = PRIMARY[cls];
  // 实际可用的最深主技能 = 链上需求等级 ≤ 当前等级 的最后一个 (blizzard 需 Lv24, 等级不够则退而求其次)。
  const reachable = chain.filter((id) => {
    const d = defs.find((x) => x.id === id);
    return d && requiredLevel(d) <= g.character.level;
  });
  const target = reachable[reachable.length - 1] ?? chain[0];
  const prereqs = chain.slice(0, chain.indexOf(target)); // target 之前的链上技能 = 前置
  // 1) 前置仅点到 1 级(解锁), 不浪费 — 模拟"一条技能玩到底"的玩家。
  for (const id of prereqs) { let guard = 0; while (pointsIn(id, g.skillTree) < 1 && g.skillPointsAvailable() > 0 && guard++ < 50) if (!g.investSkill(id)) break; }
  // 2) 剩余全灌主技能; 满级后灌协同来源(前置)以吃协同加成; 再不行随便投。
  let guard = 0;
  while (g.skillPointsAvailable() > 0 && guard++ < 500) {
    if (g.investSkill(target)) continue;
    let progressed = false;
    for (const id of [...prereqs].reverse()) { if (g.investSkill(id)) { progressed = true; break; } }
    if (!progressed) { for (const d of defs) { if (!d.passive && g.investSkill(d.id)) { progressed = true; break; } } }
    if (!progressed) break;
  }
  g.assignSkill(1, target);
  return `${target}@${pointsIn(target, g.skillTree)}`;
}

function gearUp(g: Game, ilvl: number, seed: number, n = 14): void {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) { const it = generateItem(ilvl, rng); it.identified = true; g.inventory.push(it); }
  g.equipBest();
  // 再来一轮(穿上后可能解锁更高需求装备)
  for (let i = 0; i < n; i++) { const it = generateItem(ilvl, rng); it.identified = true; g.inventory.push(it); }
  g.equipBest();
}

interface Fight { killed: boolean; seconds: number; casts: number; hpLeftPct: number; playerDied: boolean }
function fightBoss(g: Game, area: string, slot: number, maxSec = 180): Fight {
  g.loadArea(area);
  const boss = g.monsters[0];
  if (!boss) return { killed: false, seconds: 0, casts: 0, hpLeftPct: 1, playerDied: false };
  const hp0 = boss.combat.hp;
  const dt = 1 / 30;
  let t = 0, casts = 0;
  while (t < maxSec && !boss.dead && !g.player.dead) {
    const dx = boss.pos.x - g.player.pos.x, dy = boss.pos.y - g.player.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    const move = d > 6 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 }; // 进中距后停下输出
    g.update(dt, { move });
    if (g.useSkill(slot)) casts++;
    t += dt;
  }
  return { killed: boss.dead, seconds: +t.toFixed(1), casts, hpLeftPct: +(boss.combat.hp / hp0).toFixed(2), playerDied: g.player.dead };
}

// 一个 Act1-Boss 场景: 指定职业 + 通关该幕时的典型等级 + 堆装等级。
function runScenario(cls: CharClass, level: number, ilvl: number, diff: 'normal' | 'nightmare' | 'hell', seed: number): Fight & { cls: CharClass; level: number; diff: string; skill: string } {
  const g = new Game(seed, cls);
  if (diff !== 'normal') g.setDifficulty?.(diff);
  grantToLevel(g, level);
  while (g.statPoints > 0) { const w = STAT_WEIGHT[cls]; g.allocateStat(w[g.statPoints % w.length]); }
  const skill = planSkills(g, cls);
  gearUp(g, ilvl, seed + 1);
  const f = fightBoss(g, 'andariel_lair', 1);
  return { cls, level, diff, skill, ...f };
}

describe('平衡 BOT · Act1 Boss(安达莉尔, 普通) 击杀探针', () => {
  // 跨等级探针: Lv14(技能初成) / Lv20(中段) / Lv26(blizzard 等大招上线 + 堆装)，复现"堆叠后秒 Boss"。
  const CLASSES: CharClass[] = ['sorceress', 'amazon', 'barbarian'];
  const LEVELS = [14, 20, 26];
  const rows = CLASSES.flatMap((c) => LEVELS.map((lv) => runScenario(c, lv, lv + 4, 'normal', 7)));
  // eslint-disable-next-line no-console
  console.log('\n=== Act1 Boss(安达莉尔, 普通 HP~650) BOT 探针 ===');
  for (const r of rows) {
    // eslint-disable-next-line no-console
    console.log(`${r.cls.padEnd(10)} Lv${String(r.level).padEnd(2)} 技能=${r.skill.padEnd(16)} 击杀=${r.killed ? '✓' : '✗'} 用时=${String(r.seconds).padStart(5)}s 施放=${String(r.casts).padStart(3)} 余血=${String((r.hpLeftPct * 100) | 0).padStart(3)}% 玩家死=${r.playerDied}`);
  }

  it('可玩性下限: 各职业到 Lv26 + 堆装应能击杀 Act1 Boss', () => {
    for (const c of CLASSES) {
      expect(rows.some((r) => r.cls === c && r.level === 26 && r.killed), `${c} Lv26 无法击杀 Act1 Boss`).toBe(true);
    }
  });

  // 失衡探针 (报告型, 暂不阻断 CI): 记录"被 ≤4 次施放秒杀"的场景数, 供调平迭代观察收敛。
  // 待 balance.ts 旋钮层 + 调平完成后, 翻转为硬断言 (棘轮验收闸门)。
  it('失衡探针: 统计 Act1 Boss 被 ≤4 次施放秒杀的场景 (目标=0)', () => {
    const trivialized = rows.filter((r) => r.killed && r.casts > 0 && r.casts <= 4);
    // eslint-disable-next-line no-console
    console.log(`\n失衡场景(Boss≤4次施放被秒): ${trivialized.length}/${rows.length} → ${trivialized.map((r) => `${r.cls}Lv${r.level}`).join(' ')}`);
    expect(rows.length).toBeGreaterThan(0); // 探针本身可运行即通过; 失衡数仅作记录
  });
});
