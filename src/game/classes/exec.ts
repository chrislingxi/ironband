// 技能执行档 (SKILL_EXEC): 把技能树里每个"主动技能"映射到一份可施放行为。
// Game.useSkill 据此泛化执行 (近战/投射/环身/喊话等)。被动技能不在此表 (由 passiveBonuses 处理)。
// kind 复用现有执行形态; 元素/倍率/冷却/弹数/半径/控制 按 D2 手感设定 (原创数值)。
import type { ClassSkillKey } from '@game/classes/profiles.ts';

// 一个技能的执行参数 (id/name/icon 由技能树补全)。
export type ExecProfile = Omit<ClassSkillKey, 'id' | 'name' | 'icon' | 'treeSkillId'>;

// 普通攻击: 所有职业默认槽0, 无需学习。野蛮人/亚马逊近战挥击; 法师射出魔法光弹(不再用棍子近战)。
export const BASIC_ATTACK: ClassSkillKey = {
  id: 'basic_attack', name: '普通攻击', icon: '👊', cooldown: 0.25, kind: 'melee', damageMult: 1.0, damageType: 'physical',
};
export const BASIC_ATTACK_BY_CLASS: Record<'barbarian' | 'amazon' | 'sorceress', ClassSkillKey> = {
  barbarian: BASIC_ATTACK,
  amazon: BASIC_ATTACK,
  sorceress: { id: 'basic_attack', name: '魔法光弹', icon: '🔵', cooldown: 0.35, kind: 'projectile', damageMult: 1.0, damageType: 'magic', missileKind: 'bolt' },
};

export const SKILL_EXEC: Record<string, ExecProfile> = {
  // ===== 野蛮人 =====
  bash: { kind: 'melee', damageMult: 1.6, damageType: 'physical', cooldown: 0.5, stun: 0.3 },
  double_swing: { kind: 'arc', damageMult: 1.1, damageType: 'physical', cooldown: 0.6, radius: 1.6 },
  stun: { kind: 'melee', damageMult: 1.2, damageType: 'physical', cooldown: 0.9, stun: 1.2 },
  double_throw: { kind: 'spread', damageMult: 1.0, damageType: 'physical', cooldown: 0.7, missileKind: 'bolt', count: 2 },
  concentrate: { kind: 'melee', damageMult: 1.9, damageType: 'physical', cooldown: 0.8 },
  frenzy: { kind: 'melee', damageMult: 1.5, damageType: 'physical', cooldown: 0.45 },
  whirlwind: { kind: 'arc', damageMult: 1.8, damageType: 'physical', cooldown: 1.0, radius: 2.8 },
  berserk: { kind: 'melee', damageMult: 2.4, damageType: 'magic', cooldown: 1.0 },
  howl: { kind: 'aoe', damageMult: 0, damageType: 'physical', cooldown: 6, radius: 4, stun: 1.5, duration: 0 },
  shout: { kind: 'shout', damageMult: 0, damageType: 'physical', cooldown: 8, duration: 5 },
  taunt: { kind: 'aoe', damageMult: 0, damageType: 'physical', cooldown: 4, radius: 3.5, stun: 0.9 },
  battle_cry: { kind: 'aoe', damageMult: 0, damageType: 'physical', cooldown: 6, radius: 4, stun: 0.7 },
  battle_orders: { kind: 'shout', damageMult: 0, damageType: 'physical', cooldown: 12, duration: 8 },
  war_cry: { kind: 'aoe', damageMult: 0.9, damageType: 'physical', cooldown: 5, radius: 3, stun: 1.2 },
  battle_command: { kind: 'shout', damageMult: 0, damageType: 'physical', cooldown: 10, duration: 6 },

  // ===== 法师 =====
  ice_bolt: { kind: 'projectile', damageMult: 1.2, damageType: 'cold', cooldown: 0.5, missileKind: 'iceball', stun: 1.0 },
  frozen_armor: { kind: 'shout', damageMult: 0, damageType: 'cold', cooldown: 10, duration: 8 },
  ice_blast: { kind: 'projectile', damageMult: 1.5, damageType: 'cold', cooldown: 0.8, missileKind: 'iceball', stun: 1.5 },
  frost_nova: { kind: 'nova', damageMult: 1.0, damageType: 'cold', cooldown: 2, missileKind: 'nova', radius: 4, stun: 1.0 },
  glacial_spike: { kind: 'projectile', damageMult: 1.8, damageType: 'cold', cooldown: 1.0, missileKind: 'iceball', stun: 1.5 },
  blizzard: { kind: 'projectile', damageMult: 1.9, damageType: 'cold', cooldown: 1.4, missileKind: 'iceball', radius: 3 },
  frozen_orb: { kind: 'nova', damageMult: 1.6, damageType: 'cold', cooldown: 2.0, missileKind: 'iceball', radius: 4 },
  fire_bolt: { kind: 'projectile', damageMult: 1.2, damageType: 'fire', cooldown: 0.5, missileKind: 'fireball' },
  inferno: { kind: 'projectile', damageMult: 0.8, damageType: 'fire', cooldown: 0.4, missileKind: 'fireball' },
  fire_ball: { kind: 'projectile', damageMult: 1.8, damageType: 'fire', cooldown: 1.0, missileKind: 'fireball', radius: 2.5 },
  fire_wall: { kind: 'projectile', damageMult: 1.6, damageType: 'fire', cooldown: 1.2, missileKind: 'fireball', radius: 3 },
  enchant: { kind: 'shout', damageMult: 0, damageType: 'fire', cooldown: 12, duration: 10 },
  meteor: { kind: 'projectile', damageMult: 2.4, damageType: 'fire', cooldown: 1.6, missileKind: 'fireball', radius: 3 },
  charged_bolt: { kind: 'spread', damageMult: 1.0, damageType: 'lightning', cooldown: 0.7, missileKind: 'bolt', count: 5 },
  static_field: { kind: 'nova', damageMult: 0.7, damageType: 'lightning', cooldown: 1.0, missileKind: 'nova', radius: 4 },
  telekinesis: { kind: 'projectile', damageMult: 0.8, damageType: 'magic', cooldown: 0.6, missileKind: 'bolt' },
  nova: { kind: 'nova', damageMult: 1.4, damageType: 'lightning', cooldown: 1.5, missileKind: 'nova', radius: 4 },
  lightning: { kind: 'projectile', damageMult: 2.0, damageType: 'lightning', cooldown: 0.7, missileKind: 'bolt' },
  chain_lightning: { kind: 'spread', damageMult: 1.5, damageType: 'lightning', cooldown: 1.0, missileKind: 'bolt', count: 5 },
  teleport: { kind: 'teleport', damageMult: 0, damageType: 'magic', cooldown: 3, radius: 4 },
  thunder_storm: { kind: 'nova', damageMult: 1.8, damageType: 'lightning', cooldown: 2.6, missileKind: 'nova', radius: 5 },

  // ===== 亚马逊 =====
  magic_arrow: { kind: 'projectile', damageMult: 1.0, damageType: 'magic', cooldown: 0.4, missileKind: 'arrow' },
  fire_arrow: { kind: 'projectile', damageMult: 1.1, damageType: 'fire', cooldown: 0.5, missileKind: 'arrow' },
  cold_arrow: { kind: 'projectile', damageMult: 1.1, damageType: 'cold', cooldown: 0.6, missileKind: 'arrow', stun: 1.0 },
  multiple_shot: { kind: 'spread', damageMult: 0.8, damageType: 'physical', cooldown: 1.0, missileKind: 'arrow', count: 5 },
  exploding_arrow: { kind: 'projectile', damageMult: 1.4, damageType: 'fire', cooldown: 1.0, missileKind: 'fireball' },
  ice_arrow: { kind: 'projectile', damageMult: 1.3, damageType: 'cold', cooldown: 0.7, missileKind: 'arrow', stun: 1.5 },
  guided_arrow: { kind: 'projectile', damageMult: 1.6, damageType: 'physical', cooldown: 0.7, missileKind: 'arrow' },
  strafe: { kind: 'spread', damageMult: 0.9, damageType: 'physical', cooldown: 1.0, missileKind: 'arrow', count: 4 },
  inner_sight: { kind: 'shout', damageMult: 0, damageType: 'magic', cooldown: 6, duration: 8 },
  slow_missiles: { kind: 'shout', damageMult: 0, damageType: 'magic', cooldown: 8, duration: 8 },
  valkyrie: { kind: 'shout', damageMult: 0, damageType: 'physical', cooldown: 20, duration: 12 },
  jab: { kind: 'melee', damageMult: 1.4, damageType: 'physical', cooldown: 0.4 },
  power_strike: { kind: 'melee', damageMult: 1.5, damageType: 'lightning', cooldown: 0.6 },
  poison_javelin: { kind: 'projectile', damageMult: 1.2, damageType: 'poison', cooldown: 0.5, missileKind: 'bolt' },
  lightning_bolt: { kind: 'projectile', damageMult: 2.0, damageType: 'lightning', cooldown: 0.6, missileKind: 'bolt' },
  charged_strike: { kind: 'nova', damageMult: 1.4, damageType: 'lightning', cooldown: 0.7, missileKind: 'nova', radius: 3 },
  plague_javelin: { kind: 'projectile', damageMult: 1.6, damageType: 'poison', cooldown: 0.8, missileKind: 'bolt' },
  lightning_fury: { kind: 'nova', damageMult: 1.5, damageType: 'lightning', cooldown: 2.0, missileKind: 'nova', radius: 4 },
};
