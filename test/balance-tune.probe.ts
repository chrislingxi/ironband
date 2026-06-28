// 自动调平器 (开发期工具, 非 CI 测试; 文件名不含 .test. 故默认不被 vitest 收集)。
// 运行: npx vitest run --root . test/balance-tune.probe.ts  (或临时改名 .test.ts 跑)
// 二分搜索 spellK, 使元素职业 Act1 Boss 中位 TTK ≈ 目标(30s, 硬仗带 20-40 的中点)。
import { describe, it } from 'vitest';
import { BALANCE } from '../src/game/data/balance.ts';
import { runScenario, ELEMENTAL, trashClearSeconds } from './bot/player-bot.ts';
import type { CharClass } from '../src/game/data/schema.ts';

const TARGET = 30; // 目标中位 TTK 秒
const LEVELS = [14, 20, 26];

function elementalMedianTTK(): number {
  const ttks: number[] = [];
  for (const c of ELEMENTAL) for (const lv of LEVELS) {
    const r = runScenario(c, lv, lv + 4, 'normal', 7);
    // 未击杀(太肉)记为 maxSec 惩罚, 被秒记真实极小值
    ttks.push(r.killed ? r.seconds : 200);
  }
  ttks.sort((a, b) => a - b);
  return ttks[Math.floor(ttks.length / 2)];
}

describe('balance-tune: 搜索 spellK', () => {
  it('二分 spellK 命中元素 Boss 目标 TTK', () => {
    let lo = 0.1, hi = 14;
    let best: number = BALANCE.spellK, bestErr = Infinity;
    for (let iter = 0; iter < 12; iter++) {
      const mid = (lo + hi) / 2;
      (BALANCE as unknown as { spellK: number }).spellK = mid;
      const ttk = elementalMedianTTK();
      const err = Math.abs(ttk - TARGET);
      if (err < bestErr) { bestErr = err; best = mid; }
      // eslint-disable-next-line no-console
      console.log(`iter${String(iter).padStart(2)} spellK=${mid.toFixed(3)} → 元素中位TTK=${ttk}s`);
      // TTK 与 spellK 反向单调: TTK 太小(过强) → 调小 spellK; TTK 太大 → 调大。
      if (ttk < TARGET) hi = mid; else lo = mid;
    }
    (BALANCE as unknown as { spellK: number }).spellK = best;
    // 护栏: 该 spellK 下元素清杂兵耗时 (不应难受)。
    const trash = trashClearSeconds('sorceress', 14, 18, 7);
    // 全职业最终一览
    // eslint-disable-next-line no-console
    console.log(`\n>>> 推荐 spellK = ${best.toFixed(3)} (元素中位TTK≈${(TARGET + (bestErr * 0)).toFixed(0)}±, 误差${bestErr.toFixed(1)}s)`);
    // eslint-disable-next-line no-console
    console.log(`>>> 护栏: 法师 Lv14 清 blood_moor 杂兵 ${trash}s`);
    const all: CharClass[] = ['sorceress', 'amazon', 'barbarian'];
    for (const c of all) for (const lv of LEVELS) {
      const r = runScenario(c, lv, lv + 4, 'normal', 7);
      // eslint-disable-next-line no-console
      console.log(`   ${c.padEnd(10)} Lv${String(lv).padEnd(2)} 击杀=${r.killed ? '✓' : '✗'} ${String(r.seconds).padStart(5)}s 施放=${String(r.casts).padStart(3)}`);
    }
  }, 120000);
});
