// 通用技能树模型 (纯逻辑, 与具体职业数据解耦).
// 对标 D2 技能树规则: 需求等级 / 前置技能 / 上限 / 协同(synergy).
import type { SkillDef } from '@game/data/schema.ts';

// 技能投点状态: skillId -> 已投点数.
export type SkillTreeState = Record<string, number>;

// 需求等级换算: D2 中按 tier 阶梯解锁 (tier 0 = lv1, 之后每层 +6 级可用).
export function requiredLevel(def: SkillDef): number {
  return Math.max(1, def.tier * 6);
}

// 当前 skill 已投点数 (默认 0).
export function pointsIn(skillId: string, state: SkillTreeState): number {
  return state[skillId] ?? 0;
}

// 能否再投一点:
//  1) 角色等级 >= 需求等级;
//  2) 所有前置技能均已投 >= 1 点;
//  3) 未达 maxLevel.
export function canInvest(
  def: SkillDef,
  charLevel: number,
  state: SkillTreeState,
  allDefs: SkillDef[],
): boolean {
  if (charLevel < requiredLevel(def)) return false;
  if (pointsIn(def.id, state) >= def.maxLevel) return false;
  for (const reqId of def.prereqs) {
    // 前置必须存在于该职业技能集且已至少投 1 点.
    const exists = allDefs.some((d) => d.id === reqId);
    if (!exists) return false;
    if (pointsIn(reqId, state) < 1) return false;
  }
  return true;
}

// 投点: 返回新 state (不可变, +1 点). 调用方应先 canInvest 校验.
export function invest(def: SkillDef, state: SkillTreeState): SkillTreeState {
  return { ...state, [def.id]: pointsIn(def.id, state) + 1 };
}

// 已花费总点数 (用于校验剩余可用点 = charLevel-1 等规则, 由调用方决定).
export function totalPointsSpent(state: SkillTreeState): number {
  let sum = 0;
  for (const k in state) sum += state[k] ?? 0;
  return sum;
}

// 被动技能加成: 把"精通/铁壁/天生抗性/穿透"等被动技投点折算为战斗增益百分比,
// 供 deriveCombat 应用 —— 修复"被动技能投了没用"。按 id 模式匹配, 跨职业安全 (缺失记 0)。
export interface PassiveBonuses {
  arPerc: number;   // 命中率 +%
  dmgPerc: number;  // 物理伤害 +%
  defPerc: number;  // 防御 +%
  resAll: number;   // 全抗 +点
}
export function passiveBonuses(state: SkillTreeState, defs: SkillDef[]): PassiveBonuses {
  let masteryPts = 0;
  for (const d of defs) {
    if (d.passive && d.id.includes('mastery')) masteryPts += pointsIn(d.id, state);
  }
  const penetrate = pointsIn('penetrate', state); // 亚马逊穿透 → AR
  const ironSkin = pointsIn('iron_skin', state);   // 野蛮人铁壁 → 防御
  const natRes = pointsIn('natural_resistance', state); // 野蛮人天生抗性 → 全抗
  return {
    arPerc: masteryPts * 5 + penetrate * 5,
    dmgPerc: masteryPts * 4,
    defPerc: ironSkin * 6,
    resAll: natRes * 4,
  };
}

// 协同加成总和: 按 def.synergies 把每个来源技能的已投点数 * perLevel 累加.
// 语义对标 D2 synergy (例: 冰弹每点为冰川尖刺 +X% 伤害). 返回累加百分比/系数, 由伤害公式使用.
export function synergyBonus(def: SkillDef, state: SkillTreeState, allDefs: SkillDef[]): number {
  if (!def.synergies) return 0;
  let bonus = 0;
  for (const syn of def.synergies) {
    // 仅统计实际存在的来源技能, 避免脏数据.
    const exists = allDefs.some((d) => d.id === syn.skill);
    if (!exists) continue;
    bonus += pointsIn(syn.skill, state) * syn.perLevel;
  }
  return bonus;
}

// --- 内联自测思路 (无需 test 文件, 供集成时手动核对) ---
// 1) canInvest: tier=0 技能在 charLevel=1 应可投; tier=2 (需求 lv12) 在 lv5 应拒绝.
// 2) prereqs: 前置未投点时 canInvest=false; 给前置投 1 点后转为 true (满足等级前提下).
// 3) maxLevel: 连续 invest 到 maxLevel 后 canInvest 应返回 false.
// 4) invest 不可变: invest 返回新对象, 原 state 不被修改 (totalPointsSpent(old) 不变).
// 5) synergyBonus: 来源技能投 3 点且 perLevel=0.1 时应得 0.3; 来源不存在时忽略不计.
