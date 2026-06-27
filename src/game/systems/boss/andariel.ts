import type { MonStat } from '@game/data/schema.ts';

// 安达莉尔 — 第一幕巢穴守护者 Boss (纯数据/逻辑, 与渲染/引擎解耦).
// 三阶段血量驱动行为切换: 暴怒前(近战毒爪) -> 中段(环形毒弹+召唤) -> 狂暴(加速+高频毒弹).
// 数值对标 D2 量级, 描述全原创, 可按战斗平衡微调.

// 三难度分段数值辅助 (与 monsters.ts 同风格).
const pd = <T,>(n: T, nm: T, h: T) => ({ normal: n, nightmare: nm, hell: h });

// 巢穴 Boss 主数据. 高血量、毒系为主、慢但范围大、毒抗极高.
export const ANDARIEL: MonStat = {
  id: 'andariel',
  name: '安达莉尔',
  sprite: 'andariel',
  ai: 'boss',
  // 区域怪物等级之上, 体现 Boss 威胁.
  level: pd(12, 49, 80),
  // 高血量, nm/hell 递增.
  hp: pd([600, 700], [2400, 2700], [7200, 8000]),
  attackRating: pd(180, 1100, 3200),
  defense: pd(80, 720, 2100),
  // 物理近战基底, 配合下方毒系伤害实例叠加.
  damage: pd([12, 22], [60, 95], [110, 155]),
  // 毒抗极高 (本体免疫倾向), 其余抗性中等; hell 毒抗满 = 免疫.
  resist: {
    poison: pd(75, 90, 100),
    fire: pd(0, 30, 50),
    cold: pd(0, 30, 50),
    lightning: pd(0, 30, 50),
  },
  exp: pd(900, 9000, 42000),
  speed: 2.4,
  radius: 1.2,
  flags: { boss: true },
};

// 战斗阶段: 由当前血量比驱动.
export type BossPhase = 0 | 1 | 2;

// 血量比 -> 阶段. >0.66 -> 0(暴怒前), 0.33~0.66 -> 1, <0.33 -> 2(狂暴).
export function andarielPhase(hp: number, maxHp: number): BossPhase {
  if (maxHp <= 0) return 2; // 防御: 无效 maxHp 视为濒死.
  const ratio = hp / maxHp;
  if (ratio > 0.66) return 0;
  if (ratio >= 0.33) return 1;
  return 2;
}

// 单阶段行为参数, 供 AI 层读取并调度.
export interface PhaseConfig {
  speedMult: number; // 移动速度倍率 (基于 MonStat.speed)
  atkIntervalMult: number; // 近战攻击间隔倍率 (<1 = 更快)
  poisonNova: boolean; // 是否释放环形毒弹
  novaCooldown: number; // 毒弹冷却(秒)
  summon: boolean; // 是否召唤随从
  summonDefId: string; // 召唤怪物的 MonStat id
  summonCount: number; // 单次召唤数量
}

// 各阶段配置.
export const ANDARIEL_PHASES: Record<BossPhase, PhaseConfig> = {
  // 阶段 0 — 暴怒前: 纯近战毒爪追击, 无远程无召唤.
  0: {
    speedMult: 1,
    atkIntervalMult: 1,
    poisonNova: false,
    novaCooldown: 0,
    summon: false,
    summonDefId: '',
    summonCount: 0,
  },
  // 阶段 1 — 中段: 每 ~3s 环形毒弹, 并召唤堕落者 x3 牵制.
  1: {
    speedMult: 1,
    atkIntervalMult: 1,
    poisonNova: true,
    novaCooldown: 3,
    summon: true,
    summonDefId: 'fallen',
    summonCount: 3,
  },
  // 阶段 2 — 狂暴: 加速、近战更频, 高频环形毒弹, 召唤猎犬 x2.
  2: {
    speedMult: 1.4,
    atkIntervalMult: 0.6,
    poisonNova: true,
    novaCooldown: 1.8,
    summon: true,
    summonDefId: 'hound',
    summonCount: 2,
  },
};

// 毒云 / 环形毒弹的伤害实例 (原创数值). 由 ctx.shoot 投射或 nova 命中时结算.
// 多段表示可叠加的毒伤层 (持续毒 + 接触毒).
export function bossPoisonDamage(): { type: 'poison'; min: number; max: number }[] {
  return [
    { type: 'poison', min: 18, max: 30 }, // 主毒云持续伤害
    { type: 'poison', min: 8, max: 14 }, // 毒弹接触附加
  ];
}
