// 野蛮人完整技能树数据. 三系: tab0 战斗技能 / tab1 战斗精通 / tab2 战吼.
// 与 barbarian.ts 的 3 个主动键(bash/double_swing/war_cry)互补, 这里是完整天赋数据.
// 名称对标 D2 (结构性专有名词), 数值与描述原创、量级合理. 配合 skilltree.ts 使用.
import type { SkillDef } from '@game/data/schema.ts';

export const BARBARIAN_SKILLS: SkillDef[] = [
  // === tab 0: 战斗技能 ===
  {
    id: 'bash', name: '猛击', charClass: 'barbarian', tab: 0, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'physical', icon: '🗡',
    baseDamage: (l) => [4 + l * 3, 8 + l * 4],
    manaCost: () => 2,
    synergies: [{ skill: 'stun', perLevel: 0.1 }, { skill: 'concentrate', perLevel: 0.1 }],
  },
  {
    id: 'double_swing', name: '双挥', charClass: 'barbarian', tab: 0, tier: 1,
    prereqs: ['bash'], maxLevel: 20, damageType: 'physical', icon: '⚔',
    baseDamage: (l) => [5 + l * 3, 10 + l * 5],
    manaCost: (l) => Math.max(1, 3 - l * 0.1),
  },
  {
    id: 'stun', name: '震慑', charClass: 'barbarian', tab: 0, tier: 2,
    prereqs: ['bash'], maxLevel: 20, damageType: 'physical', icon: '💫',
    baseDamage: (l) => [4 + l * 3, 9 + l * 4],
    manaCost: () => 2,
  },
  {
    id: 'double_throw', name: '双重投掷', charClass: 'barbarian', tab: 0, tier: 3,
    prereqs: ['double_swing'], maxLevel: 20, damageType: 'physical', icon: '🪃',
    baseDamage: (l) => [6 + l * 3, 12 + l * 5],
    manaCost: () => 3,
  },
  {
    id: 'concentrate', name: '专注', charClass: 'barbarian', tab: 0, tier: 4,
    prereqs: ['stun'], maxLevel: 20, damageType: 'physical', icon: '🎯',
    baseDamage: (l) => [8 + l * 5, 16 + l * 7],
    manaCost: () => 4,
    synergies: [{ skill: 'bash', perLevel: 0.05 }, { skill: 'stun', perLevel: 0.05 }],
  },
  {
    id: 'frenzy', name: '狂热', charClass: 'barbarian', tab: 0, tier: 4,
    prereqs: ['double_throw'], maxLevel: 20, damageType: 'physical', icon: '🔥',
    baseDamage: (l) => [9 + l * 5, 18 + l * 8],
    manaCost: () => 3,
    synergies: [{ skill: 'double_swing', perLevel: 0.05 }],
  },
  {
    id: 'whirlwind', name: '旋风斩', charClass: 'barbarian', tab: 0, tier: 5,
    prereqs: ['concentrate', 'frenzy'], maxLevel: 20, damageType: 'physical', icon: '🌀',
    baseDamage: (l) => [10 + l * 6, 22 + l * 10],
    manaCost: () => 25,
  },
  {
    id: 'berserk', name: '狂暴', charClass: 'barbarian', tab: 0, tier: 5,
    prereqs: ['concentrate'], maxLevel: 20, damageType: 'magic', icon: '😡',
    baseDamage: (l) => [12 + l * 7, 24 + l * 11],
    manaCost: () => 4,
  },

  // === tab 1: 战斗精通 (被动) ===
  {
    id: 'sword_mastery', name: '剑械精通', charClass: 'barbarian', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, passive: true, icon: '🗡',
  },
  {
    id: 'axe_mastery', name: '斧械精通', charClass: 'barbarian', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, passive: true, icon: '🪓',
  },
  {
    id: 'mace_mastery', name: '锤械精通', charClass: 'barbarian', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, passive: true, icon: '🔨',
  },
  {
    id: 'increased_stamina', name: '耐力增强', charClass: 'barbarian', tab: 1, tier: 1,
    prereqs: [], maxLevel: 20, passive: true, icon: '🏃',
  },
  {
    id: 'increased_speed', name: '迅捷', charClass: 'barbarian', tab: 1, tier: 2,
    prereqs: ['increased_stamina'], maxLevel: 20, passive: true, icon: '💨',
  },
  {
    id: 'iron_skin', name: '铁壁', charClass: 'barbarian', tab: 1, tier: 3,
    prereqs: ['increased_stamina'], maxLevel: 20, passive: true, icon: '🛡',
  },
  {
    id: 'natural_resistance', name: '天生抗性', charClass: 'barbarian', tab: 1, tier: 4,
    prereqs: ['iron_skin'], maxLevel: 20, passive: true, icon: '🧱',
  },
  {
    id: 'weapon_block', name: '武器格挡', charClass: 'barbarian', tab: 1, tier: 5,
    prereqs: ['increased_speed'], maxLevel: 20, passive: true, icon: '🤺',
  },

  // === tab 2: 战吼 ===
  {
    id: 'howl', name: '怒吼', charClass: 'barbarian', tab: 2, tier: 0,
    prereqs: [], maxLevel: 20, passive: false, icon: '📢',
    manaCost: () => 2,
  },
  {
    id: 'shout', name: '呐喊', charClass: 'barbarian', tab: 2, tier: 1,
    prereqs: ['howl'], maxLevel: 20, passive: false, icon: '🗣',
    manaCost: () => 3,
  },
  {
    id: 'taunt', name: '挑衅', charClass: 'barbarian', tab: 2, tier: 2,
    prereqs: ['howl'], maxLevel: 20, passive: false, icon: '😤',
    manaCost: () => 2,
  },
  {
    id: 'battle_cry', name: '战吼', charClass: 'barbarian', tab: 2, tier: 3,
    prereqs: ['taunt'], maxLevel: 20, passive: false, icon: '💢',
    manaCost: () => 4,
  },
  {
    id: 'battle_orders', name: '战斗命令', charClass: 'barbarian', tab: 2, tier: 4,
    prereqs: ['shout'], maxLevel: 20, passive: false, icon: '🎺',
    manaCost: () => 7,
  },
  {
    id: 'war_cry', name: '战嚎', charClass: 'barbarian', tab: 2, tier: 5,
    prereqs: ['battle_cry', 'battle_orders'], maxLevel: 20, damageType: 'physical', icon: '🔊',
    baseDamage: (l) => [10 + l * 6, 20 + l * 9],
    manaCost: () => 10,
  },
  {
    id: 'battle_command', name: '战斗号令', charClass: 'barbarian', tab: 2, tier: 5,
    prereqs: ['battle_orders'], maxLevel: 20, passive: false, icon: '👑',
    manaCost: () => 9,
  },
];
