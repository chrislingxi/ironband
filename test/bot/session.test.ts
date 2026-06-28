import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game/sim/Game.ts';
import { serializeGame, applySave } from '../../src/game/systems/save/index.ts';
import { generateItem } from '../../src/game/systems/items/index.ts';
import { mulberry32 } from '../../src/engine/math/rng.ts';
import { deriveCombat } from '../../src/game/systems/stats/character.ts';
import { AREAS } from '../../src/game/world/act1.ts';
import { STAT_WEIGHT, PRIMARY } from './player-bot.ts';
import type { CharClass } from '../../src/game/data/schema.ts';

// ── 全流程「人类一局」探针 ──
// 像真人那样走完: 建号→逐区清怪升级→加点/投技能→捡装/一键穿戴→营地(鉴定/买卖/赌博/仓库)→
// 打 Boss→故意送死/重生→存读档往返。全程巡检一批跨系统不变量, 任何异常/越界即为发现。
// 目标: 让 BOT 覆盖数值/交互/经济/存档/进度的更多问题面, 而非只盯单一 Boss。

const CLASSES: CharClass[] = ['barbarian', 'amazon', 'sorceress'];
const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

// 收集一个职业整局的不变量违例 (空 = 健康)。
// hardOnly=true: 仅查"恒应成立"的硬不变量(异常/NaN/守恒/存读档), 跳过受 layout 影响的清场进度判定
//   → 供随机种子探索用, 任何违例都是真 bug 而非种子噪声。
function playSession(cls: CharClass, seed: number, hardOnly = false): string[] {
  const bad: string[] = [];
  const flag = (m: string) => bad.push(`[${cls}] ${m}`);
  const g = new Game(seed, cls);

  // 全程战斗数值健全性巡检
  const checkStats = (where: string) => {
    const p = g.player.combat;
    for (const [k, v] of Object.entries(p)) if (typeof v === 'number' && !Number.isFinite(v)) flag(`${where}: combat.${k} 非有限 (${v})`);
    if (p.hp > p.maxHp + 0.01) flag(`${where}: hp ${p.hp} > maxHp ${p.maxHp}`);
    if (p.hp < 0) flag(`${where}: hp 负 (${p.hp})`);
    if (!isFiniteNum(g.goldTotal) || g.goldTotal < 0) flag(`${where}: gold 异常 (${g.goldTotal})`);
    if (g.inventory.length > g.invCap) flag(`${where}: 背包 ${g.inventory.length} > 上限 ${g.invCap}`);
    const d = deriveCombat(g.character);
    if (!isFiniteNum(d.maxHp) || d.maxHp <= 0) flag(`${where}: deriveCombat.maxHp 异常 (${d.maxHp})`);
    if (d.damage[0].min > d.damage[0].max) flag(`${where}: 伤害 min>max`);
  };

  try {
    checkStats('开局');

    // ---- 升级 + 加点 + 投技能 (模拟养成到 Act1 Boss 段) ----
    let guard = 0;
    while (g.character.level < 16 && guard++ < 100) g.grantXp(g.xpForNext());
    const spentBefore = g.statPoints;
    while (g.statPoints > 0) { const w = STAT_WEIGHT[cls]; const ok = g.allocateStat(w[g.statPoints % w.length]); if (!ok) { flag('allocateStat 在有点时返回 false'); break; } }
    if (g.statPoints !== 0) flag(`加点后仍剩 ${g.statPoints} 点 (应为0)`);
    void spentBefore;
    // 投技能: 主链
    const chain = PRIMARY[cls].chain;
    let sg = 0;
    while (g.skillPointsAvailable() > 0 && sg++ < 300) {
      let any = false;
      for (const id of chain) if (g.investSkill(id)) { any = true; break; }
      if (!any) break;
    }
    // 装载已学的最深主技能到技能键 (否则 useSkill 无效, 只能靠普攻)。
    const learned = chain.filter((id) => g.canAssignSkill(id));
    if (learned.length) g.assignSkill(1, learned[learned.length - 1]);
    // 技能点不应为负 / 不应超用
    if (g.skillPointsAvailable() < 0) flag('skillPointsAvailable 为负 (超投)');
    checkStats('养成后');

    // ---- 捡装 + 一键穿戴; 验证不降配 ----
    const rng = mulberry32(seed + 5);
    for (let i = 0; i < 16; i++) { const it = generateItem(18, rng); it.identified = true; g.inventory.push(it); }
    // 综合战力 (一键穿戴会跨 伤害/生命/防御/抗性/命中 多维优化, 单看伤害会误判)。
    const power = () => { const d = deriveCombat(g.character); return d.damage[0].max + d.maxHp + d.defense + d.attackRating * 0.2 + (d.resist.fire + d.resist.cold + d.resist.lightning + d.resist.poison); };
    const scoreBefore = power();
    g.equipBest();
    const scoreAfter = power();
    if (scoreAfter < scoreBefore - 0.5) flag(`一键穿戴后综合战力下降 (${scoreBefore.toFixed(0)}→${scoreAfter.toFixed(0)})`);
    if (g.inventory.length > g.invCap) flag('一键穿戴后背包超上限');
    checkStats('穿戴后');

    // ---- 经济: 回营地, 卖垃圾/赌博/仓库往返 ----
    g.loadArea('rogue_encampment');
    const gold0 = g.goldTotal;
    g.sellJunk();
    if (g.goldTotal < gold0) flag('卖垃圾后金币反而减少');
    // 仓库往返: 存一件再取回, 不应丢失/复制
    if (g.inventory.length > 0) {
      const uid = g.inventory[0].uid;
      const invN = g.inventory.length, stashN = g.stash.length;
      if (g.depositToStash(uid)) {
        if (g.inventory.length !== invN - 1 || g.stash.length !== stashN + 1) flag('存入仓库后数量不守恒');
        if (g.withdrawFromStash(uid)) {
          if (g.inventory.length !== invN || g.stash.length !== stashN) flag('取回仓库后数量不守恒');
        }
      }
    }
    // 赌博: 花钱 (若买得起)
    const gGold = g.goldTotal;
    if (g.gamble()) { if (g.goldTotal >= gGold) flag('赌博后金币未扣'); }
    checkStats('营地经济后');

    // ---- 逐区清怪: 只判"完全打不动"(零进度), 慢清不算 bug (避免 layout 抖动误报, 保证 loop 稳定) ----
    if (!hardOnly) {
      for (const area of ['blood_moor', 'cold_plains']) {
        g.loadArea(area);
        const r = clearArea(g, 120);
        if (!g.player.dead && r.remaining >= r.start && r.start > 0) flag(`${area}: 120s 零击杀 (${r.start}→${r.remaining}), 疑似打不动`);
        checkStats(`清 ${area} 后`);
      }
      // Boss: 可达, 且能造成伤害 (HP 下降)
      g.loadArea('andariel_lair');
      if (!AREAS['andariel_lair']) flag('andariel_lair 区域缺失');
      const boss = g.monsters[0];
      if (!boss) flag('Boss 区未生成 Boss');
      const bossHp0 = boss?.combat.hp ?? 0;
      const r = clearArea(g, 150);
      const bossHpEnd = boss?.combat.hp ?? 0;
      if (!g.player.dead && !r.cleared && bossHpEnd >= bossHp0) flag('Boss: 150s HP 无下降 (打不动)');
      checkStats('Boss 战后');
    }

    // ---- 送死 + 重生: 重生后存活、HP>0 ----
    g.player.combat.hp = 1;
    // 直接置死走重生路径
    g.player.dead = true; g.player.combat.hp = 0; g.state = 'dead';
    g.respawn();
    if (g.player.dead) flag('重生后仍为死亡态');
    if (g.player.combat.hp <= 0) flag(`重生后 HP ≤0 (${g.player.combat.hp})`);
    checkStats('重生后');

    // ---- 存读档往返: 关键字段守恒 ----
    const snap = serializeGame(g, 'probe');
    const g2 = new Game(seed, cls);
    applySave(g2, snap);
    if (g2.character.level !== g.character.level) flag(`存读档 level 不一致 (${g.character.level}→${g2.character.level})`);
    if (g2.goldTotal !== g.goldTotal) flag(`存读档 gold 不一致 (${g.goldTotal}→${g2.goldTotal})`);
    if (g2.inventory.length !== g.inventory.length) flag(`存读档背包数不一致 (${g.inventory.length}→${g2.inventory.length})`);
    const sp1 = g.skillPointsAvailable(), sp2 = g2.skillPointsAvailable();
    if (sp1 !== sp2) flag(`存读档技能点不一致 (${sp1}→${sp2})`);
  } catch (e) {
    flag(`抛异常: ${(e as Error).message}`);
  }
  return bad;
}

// 走位清场 (steer 到最近怪, 普攻+技能), 返回起始/剩余/是否清空。
function clearArea(g: Game, maxSec: number): { cleared: boolean; start: number; remaining: number } {
  const start = g.monsters.length;
  const dt = 1 / 30;
  let t = 0;
  while (t < maxSec && g.monsters.length > 0 && !g.player.dead) {
    const tgt = g.monsters.reduce((a, b) => {
      const da = Math.hypot(a.pos.x - g.player.pos.x, a.pos.y - g.player.pos.y);
      const db = Math.hypot(b.pos.x - g.player.pos.x, b.pos.y - g.player.pos.y);
      return db < da ? b : a;
    });
    const dx = tgt.pos.x - g.player.pos.x, dy = tgt.pos.y - g.player.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    // 贴近到近战可及 (~1.2 格); 远程职业近身也照样能打 → 通用走位。
    g.update(dt, { move: d > 1.2 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 } });
    for (let s = 1; s <= 3; s++) g.useSkill(s);
    t += dt;
  }
  return { cleared: g.monsters.length === 0, start, remaining: g.monsters.length };
}

describe('全流程人类一局 · 跨系统不变量', () => {
  const findings = CLASSES.flatMap((c) => playSession(c, 7));
  // eslint-disable-next-line no-console
  console.log(`\n=== 全流程探针: ${findings.length} 处发现 ===`);
  for (const f of findings) console.log(' - ' + f); // eslint-disable-line no-console

  it('三职业整局无不变量违例 (数值/经济/存档/进度)', () => {
    expect(findings, findings.join('\n')).toEqual([]);
  });
});

// ── 探索式探针: 每次运行用不同随机种子跑批量局, 只断言"硬不变量"(异常/NaN/守恒/存读档)。
// 硬不变量与种子无关 → 任何违例都是真 bug; 定时 loop 反复跑即在种子空间持续探索, 发现新边角问题。
describe('探索 · 随机种子批量 hard 不变量', () => {
  const base = Math.floor((Date.now() % 1e6) + 1);
  const seeds = Array.from({ length: 6 }, (_, i) => base + i * 7919);
  const findings = seeds.flatMap((s) => CLASSES.map((c) => playSession(c, s, true)).flat());
  // eslint-disable-next-line no-console
  console.log(`\n=== 探索探针: 种子基 ${base}, ${seeds.length}×${CLASSES.length} 局, ${findings.length} 处硬违例 ===`);
  for (const f of findings) console.log(' - ' + f); // eslint-disable-line no-console

  it('随机批量无硬不变量违例 (探索新边角问题)', () => {
    expect(findings, findings.join('\n')).toEqual([]);
  });
});
