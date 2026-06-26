// 亚马逊技能树数据. 三系: tab0 弓与十字弓 / tab1 被动与魔法 / tab2 标枪与长矛.
// 名称对标 D2 (结构性专有名词), 数值与描述原创、量级合理. 配合 skilltree.ts 使用.
import type { SkillDef } from '@game/data/schema.ts';

export const AMAZON_SKILLS: SkillDef[] = [
  // === tab 0: 弓与十字弓 ===
  {
    id: 'magic_arrow', name: '魔法箭', charClass: 'amazon', tab: 0, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'magic', icon: '🏹',
    baseDamage: (l) => [2 + l * 2, 4 + l * 3],
    manaCost: () => 1,
  },
  {
    id: 'fire_arrow', name: '火焰箭', charClass: 'amazon', tab: 0, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'fire', icon: '🔥',
    baseDamage: (l) => [3 + l * 3, 6 + l * 4],
    manaCost: (l) => 2 + l * 0.5,
    synergies: [{ skill: 'exploding_arrow', perLevel: 0.12 }],
  },
  {
    id: 'cold_arrow', name: '冰冻箭', charClass: 'amazon', tab: 0, tier: 1,
    prereqs: ['magic_arrow'], maxLevel: 20, damageType: 'cold', icon: '❄',
    baseDamage: (l) => [4 + l * 3, 8 + l * 4],
    manaCost: (l) => 3 + l * 0.5,
    synergies: [{ skill: 'ice_arrow', perLevel: 0.1 }],
  },
  {
    id: 'multiple_shot', name: '多重箭', charClass: 'amazon', tab: 0, tier: 2,
    prereqs: ['magic_arrow'], maxLevel: 20, damageType: 'physical', icon: '🎯',
    baseDamage: (l) => [3 + l * 2, 6 + l * 3],
    manaCost: (l) => 4 + l * 0.75,
  },
  {
    id: 'exploding_arrow', name: '爆裂箭', charClass: 'amazon', tab: 0, tier: 3,
    prereqs: ['fire_arrow'], maxLevel: 20, damageType: 'fire', icon: '💥',
    baseDamage: (l) => [6 + l * 5, 12 + l * 7],
    manaCost: (l) => 5 + l,
    synergies: [{ skill: 'fire_arrow', perLevel: 0.1 }],
  },
  {
    id: 'ice_arrow', name: '寒冰箭', charClass: 'amazon', tab: 0, tier: 3,
    prereqs: ['cold_arrow'], maxLevel: 20, damageType: 'cold', icon: '🧊',
    baseDamage: (l) => [7 + l * 5, 14 + l * 7],
    manaCost: (l) => 5 + l,
    synergies: [{ skill: 'cold_arrow', perLevel: 0.1 }],
  },
  {
    id: 'guided_arrow', name: '导引箭', charClass: 'amazon', tab: 0, tier: 5,
    prereqs: ['multiple_shot', 'ice_arrow'], maxLevel: 20, damageType: 'physical', icon: '🌀',
    baseDamage: (l) => [10 + l * 6, 20 + l * 8],
    manaCost: (l) => 6 + l,
  },
  {
    id: 'strafe', name: '扫射', charClass: 'amazon', tab: 0, tier: 5,
    prereqs: ['guided_arrow'], maxLevel: 20, damageType: 'physical', icon: '☄',
    baseDamage: (l) => [12 + l * 6, 24 + l * 9],
    manaCost: (l) => 7 + l,
  },

  // === tab 1: 被动与魔法 ===
  {
    id: 'inner_sight', name: '洞察', charClass: 'amazon', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, passive: false, icon: '👁',
    manaCost: () => 5,
  },
  {
    id: 'critical_strike', name: '致命攻击', charClass: 'amazon', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, passive: true, icon: '⭐',
  },
  {
    id: 'dodge', name: '闪躲', charClass: 'amazon', tab: 1, tier: 1,
    prereqs: ['inner_sight'], maxLevel: 20, passive: true, icon: '💨',
  },
  {
    id: 'slow_missiles', name: '减速投射', charClass: 'amazon', tab: 1, tier: 2,
    prereqs: ['inner_sight'], maxLevel: 20, icon: '🐌',
    manaCost: () => 7,
  },
  {
    id: 'penetrate', name: '穿透', charClass: 'amazon', tab: 1, tier: 3,
    prereqs: ['critical_strike'], maxLevel: 20, passive: true, icon: '🛡',
  },
  {
    id: 'evade', name: '回避', charClass: 'amazon', tab: 1, tier: 3,
    prereqs: ['dodge'], maxLevel: 20, passive: true, icon: '🤸',
  },
  {
    id: 'valkyrie', name: '女武神', charClass: 'amazon', tab: 1, tier: 5,
    prereqs: ['penetrate', 'evade'], maxLevel: 20, damageType: 'physical', icon: '🦅',
    manaCost: () => 25,
  },

  // === tab 2: 标枪与长矛 ===
  {
    id: 'jab', name: '刺击', charClass: 'amazon', tab: 2, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'physical', icon: '🔱',
    baseDamage: (l) => [3 + l * 2, 6 + l * 3],
    manaCost: () => 2,
  },
  {
    id: 'power_strike', name: '强力一击', charClass: 'amazon', tab: 2, tier: 1,
    prereqs: ['jab'], maxLevel: 20, damageType: 'lightning', icon: '⚡',
    baseDamage: (l) => [4 + l * 4, 9 + l * 6],
    manaCost: (l) => 3 + l * 0.5,
  },
  {
    id: 'poison_javelin', name: '毒标枪', charClass: 'amazon', tab: 2, tier: 1,
    prereqs: [], maxLevel: 20, damageType: 'poison', icon: '🟢',
    baseDamage: (l) => [2 + l * 3, 4 + l * 5],
    manaCost: (l) => 3 + l * 0.5,
    synergies: [{ skill: 'plague_javelin', perLevel: 0.1 }],
  },
  {
    id: 'lightning_bolt', name: '闪电标枪', charClass: 'amazon', tab: 2, tier: 3,
    prereqs: ['power_strike'], maxLevel: 20, damageType: 'lightning', icon: '🌩',
    baseDamage: (l) => [1, 30 + l * 12],
    manaCost: (l) => 5 + l,
    synergies: [{ skill: 'power_strike', perLevel: 0.08 }],
  },
  {
    id: 'charged_strike', name: '蓄电一击', charClass: 'amazon', tab: 2, tier: 3,
    prereqs: ['power_strike'], maxLevel: 20, damageType: 'lightning', icon: '🔋',
    baseDamage: (l) => [6 + l * 5, 14 + l * 8],
    manaCost: (l) => 5 + l,
  },
  {
    id: 'plague_javelin', name: '瘟疫标枪', charClass: 'amazon', tab: 2, tier: 4,
    prereqs: ['poison_javelin'], maxLevel: 20, damageType: 'poison', icon: '☠',
    baseDamage: (l) => [8 + l * 6, 16 + l * 9],
    manaCost: (l) => 7 + l,
    synergies: [{ skill: 'poison_javelin', perLevel: 0.1 }],
  },
  {
    id: 'lightning_fury', name: '闪电之怒', charClass: 'amazon', tab: 2, tier: 5,
    prereqs: ['lightning_bolt', 'charged_strike'], maxLevel: 20, damageType: 'lightning', icon: '🌟',
    baseDamage: (l) => [1, 40 + l * 15],
    manaCost: (l) => 8 + l,
    synergies: [{ skill: 'lightning_bolt', perLevel: 0.07 }, { skill: 'charged_strike', perLevel: 0.07 }],
  },
];
