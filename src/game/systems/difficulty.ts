// 难度系统 (纯逻辑). 对标 D2 三难度: normal / nightmare / hell.
// 怪物属性整体缩放 + 玩家抗性惩罚 + 免疫判定.
import type { Difficulty } from '@game/data/schema.ts';

// 可选难度列表 (顺序即递增).
export const DIFFICULTIES: Difficulty[] = ['normal', 'nightmare', 'hell'];

// 怪物属性缩放因子 (相对 normal). 实际逐怪数值由 MonStats.PerDifficulty 提供,
// 此处给出一套整体倍率, 供没有逐难度数据或全局调节时使用.
export interface MonsterScale {
  hp: number;
  dmg: number;
  ar: number; // attack rating
  def: number;
  xp: number;
}

export function monsterScale(diff: Difficulty): MonsterScale {
  switch (diff) {
    case 'normal':
      return { hp: 1, dmg: 1, ar: 1, def: 1, xp: 1 };
    case 'nightmare':
      // 噩梦: 血量/伤害显著上升, 经验大幅提高.
      return { hp: 3.5, dmg: 2.5, ar: 4, def: 4, xp: 8 };
    case 'hell':
      // 地狱: 进一步飙升, 命中/防御差距最大.
      return { hp: 9, dmg: 5, ar: 12, def: 12, xp: 20 };
  }
}

// 玩家抗性惩罚 (各元素抗性的固定减值): normal 0, nightmare -40, hell -100.
export function playerResistPenalty(diff: Difficulty): number {
  switch (diff) {
    case 'normal':
      return 0;
    case 'nightmare':
      return -40;
    case 'hell':
      return -100;
  }
}

// 免疫判定: 有效抗性 >= 100% 即免疫该元素.
export function isImmune(resistPct: number): boolean {
  return resistPct >= 100;
}
