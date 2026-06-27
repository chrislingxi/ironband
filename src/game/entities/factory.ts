import type { Entity } from './entity.ts';
import { freshId, makeCombatant, noResist } from './entity.ts';
import { MONSTERS } from '@game/data/monsters.ts';
import { MONSTERS_EXT } from '@game/data/monsters2.ts';
import { ANDARIEL } from '@game/systems/boss/andariel.ts';
import { DURIEL } from '@game/systems/boss/duriel.ts';
import { MEPHISTO } from '@game/systems/boss/mephisto.ts';
import { DIABLO } from '@game/systems/boss/diablo.ts';
import { BAAL } from '@game/systems/boss/baal.ts';
import type { MonStat } from '@game/data/schema.ts';

const ALL_MONSTERS: Record<string, MonStat> = {
  ...MONSTERS, ...MONSTERS_EXT,
  andariel: ANDARIEL, duriel: DURIEL, mephisto: MEPHISTO, diablo: DIABLO, baal: BAAL,
};
import type { Difficulty, DamageType } from '@game/data/schema.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { randInt, type RNG } from '@engine/math/rng.ts';

const PLACEHOLDER: Record<string, { color: number; size: number }> = {
  skeleton: { color: 0xdcdcd0, size: 12 },
  zombie: { color: 0x6a8a4a, size: 14 },
  fallen: { color: 0xc0503a, size: 9 },
  shaman: { color: 0xa050c0, size: 12 },
  archer: { color: 0xc8b88a, size: 12 },
  brute: { color: 0x8a4a3a, size: 18 },
  spitter: { color: 0x7ac04a, size: 10 },
  hound: { color: 0x9a6a3a, size: 10 },
  andariel: { color: 0xb01818, size: 30 },
  duriel: { color: 0x8ab0c8, size: 32 }, // 寒冷苍白, 体型最大
  mephisto: { color: 0x7a5ad0, size: 31 }, // 憎恨之王, 紫电色
  diablo: { color: 0xd83020, size: 34 },   // 恐惧之王, 烈焰赤红
  baal: { color: 0x6a8a4a, size: 36 },     // 毁灭之王, 终极, 体型最大
};

export function makePlayer(): Entity {
  // 野蛮人 normal 起手 (代表性数值, 后续 CharStats 任务精调)
  return {
    id: freshId(), kind: 'player', defId: 'barbarian', ai: 'none',
    pos: { x: 0, y: 0 }, facing: 0, speed: 4.6, radius: 0.45,
    combat: makeCombatant({ level: 1, hp: 55, maxHp: 55, attackRating: 110, defense: 12, fhr: 0, hitRecoveryFrames: 7 }),
    damage: [{ type: 'physical', min: 3, max: 6 }],
    attackRange: 1.25, attackInterval: 0.55, attackCd: 0, xpReward: 0,
    hitFlash: 0, fleeing: false, moving: false, dead: false,
    color: 0xffd76b, size: 13,
  };
}

export function makeMonster(defId: string, x: number, y: number, rng: RNG, diff: Difficulty = 'normal', areaLevel?: number): Entity {
  const m = ALL_MONSTERS[defId];
  if (!m) throw new Error(`unknown monster: ${defId}`);
  const [hpMin, hpMax] = m.hp[diff];
  const hp = randInt(rng, hpMin, hpMax);
  const resist = noResist();
  for (const k in m.resist) {
    const t = k as DamageType;
    resist[t] = m.resist[t]![diff];
  }
  const ranged = !!m.flags?.ranged;
  // 远程伤害类型取自怪物自身元素 (吐酸怪=毒/萨满=火); 缺省物理 (弓手=物理箭, 不再误判火)。
  const dmgType: DamageType = ranged ? (m.rangedType ?? 'physical') : 'physical';
  const dmg: DamageInstance[] = [{ type: dmgType, min: m.damage[diff][0], max: m.damage[diff][1] }];
  const ph = PLACEHOLDER[defId] ?? { color: 0xaaaaaa, size: 12 };

  // 有效等级: 取怪物自身等级与所在区域 monLevel 的较大者 —— 修复"深幕怪仍是低等级、
  // 既不更难也不给经验"的根因 (同一骷髅在第一幕和第五幕原本都是 3 级)。Boss 保持高自带等级。
  const lvl = Math.max(m.level[diff], areaLevel ?? 0);
  // 经验按有效等级统一缩放, 公式自洽匹配 xpForNext 的 1.6 指数 (任意等级约 32 同级杀/级);
  // Boss 给约 60% 一级。跨幕/跨难度随 monLevel 自动放大。
  const typeWeight = Math.max(0.7, Math.min(2.0, m.exp.normal / 6));
  const xpReward = m.flags?.boss
    ? Math.round(50 * Math.pow(lvl, 1.6))
    : Math.round(2.5 * Math.pow(lvl, 1.6) * typeWeight);
  return {
    id: freshId(), kind: 'monster', defId, ai: m.ai as Entity['ai'],
    pos: { x, y }, facing: Math.PI, speed: m.speed, radius: m.radius,
    combat: makeCombatant({
      level: lvl, hp, maxHp: hp,
      attackRating: m.attackRating[diff], defense: m.defense[diff],
      resist, fhr: 0, hitRecoveryFrames: 9,
    }),
    damage: dmg,
    attackRange: ranged ? 9 : 0.9,
    attackInterval: ranged ? 1.8 : 1.1, attackCd: randInt(rng, 0, 60) / 100,
    xpReward,
    hitFlash: 0, fleeing: false, moving: false, dead: false,
    color: ph.color, size: ph.size,
  };
}
