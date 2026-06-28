import { describe, it, expect } from 'vitest';
import { runScenario, ELEMENTAL, type Fight } from './bot/player-bot.ts';
import type { CharClass } from '../src/game/data/schema.ts';

// ── 平衡 BOT · 验收闸门 ──
// 自动玩家 BOT 跑 Act1 Boss(安达莉尔, 普通)。目标带(与产品对齐): 单一主技能流派"硬仗 20-40s"。
// 元素职业曾因 spellK=14 单发秒杀 → 现由 balance.ts 旋钮 + 调平器标定后, 锁进此闸门防回归。

const CLASSES: CharClass[] = ['sorceress', 'amazon', 'barbarian'];
const LEVELS = [14, 20, 26];
const rows: Fight[] = CLASSES.flatMap((c) => LEVELS.map((lv) => runScenario(c, lv, lv + 4, 'normal', 7)));

// eslint-disable-next-line no-console
console.log('\n=== Act1 Boss(安达莉尔, 普通) BOT 验收 ===');
for (const r of rows) {
  // eslint-disable-next-line no-console
  console.log(`${r.cls.padEnd(10)} Lv${String(r.level).padEnd(2)} 技能=${r.skill.padEnd(14)} 击杀=${r.killed ? '✓' : '✗'} 用时=${String(r.seconds).padStart(5)}s 施放=${String(r.casts).padStart(3)} 余血=${String((r.hpLeftPct * 100) | 0).padStart(3)}% 死=${r.playerDied}`);
}

describe('平衡 BOT · Act1 Boss 验收闸门', () => {
  it('可玩性下限: 各职业到 Lv26 + 堆装应能击杀 Act1 Boss', () => {
    for (const c of CLASSES) {
      expect(rows.some((r) => r.cls === c && r.level === 26 && r.killed), `${c} Lv26 无法击杀 Act1 Boss`).toBe(true);
    }
  });

  // 核心回归: 修复"单发秒 Boss"。在"等级匹配"场景(Lv14 打 Act1 Boss)下, 元素不应被 ≤4 发秒杀。
  // (Lv20/26 = 越级返刷, 允许快速碾压; 让更高配也吃力需更陡的技能逐级缩放 = 设计跟进项, 见 NEEDS_DESIGN.md)
  it('核心回归: 等级匹配下元素不被秒 (Lv14 打 Act1 Boss 需 ≥5 次施放)', () => {
    const lvlAppropriate = rows.filter((r) => ELEMENTAL.includes(r.cls) && r.level === 14 && r.killed);
    expect(lvlAppropriate.length).toBe(ELEMENTAL.length);
    for (const r of lvlAppropriate) {
      expect(r.casts, `${r.cls} Lv14: Act1 Boss 仅 ${r.casts} 次施放被秒(修复前=1, 目标≥5)`).toBeGreaterThanOrEqual(5);
    }
  });
});
