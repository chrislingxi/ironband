// 自动玩家 BOT (供平衡探针 + 自动调平器共用)。
// 模拟人类玩家: 升级→自动加点→把技能点堆进一条主伤害链(前置仅解锁、主技能灌满)→
// 捡满装备一键穿戴→走位施放主技能, 测量 Boss 击杀耗时/施放数/是否被秒。
import { Game } from '../../src/game/sim/Game.ts';
import { generateItem } from '../../src/game/systems/items/index.ts';
import { mulberry32 } from '../../src/engine/math/rng.ts';
import { CLASS_SKILLS } from '../../src/game/classes/registry.ts';
import { requiredLevel, pointsIn } from '../../src/game/classes/skilltree.ts';
import type { SkillDef, CharClass, Difficulty } from '../../src/game/data/schema.ts';

export const STAT_WEIGHT: Record<CharClass, Array<'str' | 'dex' | 'vit' | 'energy'>> = {
  sorceress: ['energy', 'vit', 'energy', 'str'],
  amazon: ['dex', 'vit', 'dex', 'str'],
  barbarian: ['str', 'vit', 'str', 'dex'],
};
export const PRIMARY: Record<CharClass, { chain: string[] }> = {
  sorceress: { chain: ['ice_bolt', 'ice_blast', 'glacial_spike', 'blizzard'] },
  amazon: { chain: ['magic_arrow', 'cold_arrow', 'ice_arrow'] },
  barbarian: { chain: ['bash', 'double_swing', 'frenzy'] },
};
export const ELEMENTAL: CharClass[] = ['sorceress', 'amazon'];

function grantToLevel(g: Game, lvl: number): void {
  let guard = 0;
  while (g.character.level < lvl && guard++ < 300) g.grantXp(g.xpForNext());
}

function planSkills(g: Game, cls: CharClass): string {
  const defs: SkillDef[] = CLASS_SKILLS[cls];
  const { chain } = PRIMARY[cls];
  const reachable = chain.filter((id) => {
    const d = defs.find((x) => x.id === id);
    return d && requiredLevel(d) <= g.character.level;
  });
  const target = reachable[reachable.length - 1] ?? chain[0];
  const prereqs = chain.slice(0, chain.indexOf(target));
  for (const id of prereqs) { let guard = 0; while (pointsIn(id, g.skillTree) < 1 && g.skillPointsAvailable() > 0 && guard++ < 50) if (!g.investSkill(id)) break; }
  let guard = 0;
  while (g.skillPointsAvailable() > 0 && guard++ < 500) {
    if (g.investSkill(target)) continue;
    let progressed = false;
    for (const id of [...prereqs].reverse()) { if (g.investSkill(id)) { progressed = true; break; } }
    if (!progressed) { for (const d of defs) { if (!d.passive && g.investSkill(d.id)) { progressed = true; break; } } }
    if (!progressed) break;
  }
  g.assignSkill(1, target);
  return target;
}

function gearUp(g: Game, ilvl: number, seed: number, n = 14): void {
  const rng = mulberry32(seed);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) { const it = generateItem(ilvl, rng); it.identified = true; g.inventory.push(it); }
    g.equipBest();
  }
}

export interface Fight { cls: CharClass; level: number; diff: string; skill: string; killed: boolean; seconds: number; casts: number; hpLeftPct: number; playerDied: boolean }

function fightBoss(g: Game, area: string, slot: number, maxSec = 180): Omit<Fight, 'cls' | 'level' | 'diff' | 'skill'> {
  g.loadArea(area);
  const boss = g.monsters[0];
  if (!boss) return { killed: false, seconds: 0, casts: 0, hpLeftPct: 1, playerDied: false };
  const hp0 = boss.combat.hp;
  const dt = 1 / 30;
  let t = 0, casts = 0;
  while (t < maxSec && !boss.dead && !g.player.dead) {
    const dx = boss.pos.x - g.player.pos.x, dy = boss.pos.y - g.player.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    const move = d > 6 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
    g.update(dt, { move });
    if (g.useSkill(slot)) casts++;
    t += dt;
  }
  return { killed: boss.dead, seconds: +t.toFixed(1), casts, hpLeftPct: +(boss.combat.hp / hp0).toFixed(2), playerDied: g.player.dead };
}

// 一个 Boss 场景: 职业 + 等级 + 堆装等级 + 难度 + Boss 区域。
export function runScenario(cls: CharClass, level: number, ilvl: number, diff: Difficulty, seed: number, bossArea = 'andariel_lair'): Fight {
  const g = new Game(seed, cls);
  if (diff !== 'normal') g.setDifficulty(diff);
  grantToLevel(g, level);
  while (g.statPoints > 0) { const w = STAT_WEIGHT[cls]; g.allocateStat(w[g.statPoints % w.length]); }
  const skill = planSkills(g, cls);
  gearUp(g, ilvl, seed + 1);
  const f = fightBoss(g, bossArea, 1);
  return { cls, level, diff, skill, ...f };
}

// 一局杂兵清场耗时 (秒) — 用于"调平后元素清怪不应变得难受"的护栏。
export function trashClearSeconds(cls: CharClass, level: number, ilvl: number, seed: number, area = 'blood_moor', maxSec = 90): number {
  const g = new Game(seed, cls);
  grantToLevel(g, level);
  while (g.statPoints > 0) { const w = STAT_WEIGHT[cls]; g.allocateStat(w[g.statPoints % w.length]); }
  planSkills(g, cls);
  gearUp(g, ilvl, seed + 1);
  g.loadArea(area);
  const dt = 1 / 30;
  let t = 0;
  while (t < maxSec && g.monsters.length > 0 && !g.player.dead) {
    const target = g.monsters.reduce((a, b) => {
      const da = Math.hypot(a.pos.x - g.player.pos.x, a.pos.y - g.player.pos.y);
      const db = Math.hypot(b.pos.x - g.player.pos.x, b.pos.y - g.player.pos.y);
      return db < da ? b : a;
    });
    const dx = target.pos.x - g.player.pos.x, dy = target.pos.y - g.player.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    g.update(dt, { move: d > 4 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 } });
    g.useSkill(1);
    t += dt;
  }
  return +t.toFixed(1);
}
