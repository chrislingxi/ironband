// 女法师技能树数据. 三系: tab0 冷 / tab1 火 / tab2 电.
// 名称对标 D2 (结构性专有名词), 数值与描述原创、量级合理. 配合 skilltree.ts 使用.
import type { SkillDef } from '@game/data/schema.ts';

export const SORCERESS_SKILLS: SkillDef[] = [
  // === tab 0: 冷系 ===
  {
    id: 'ice_bolt', name: '冰弹', charClass: 'sorceress', tab: 0, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'cold', icon: '🔹',
    baseDamage: (l) => [3 + l * 2, 5 + l * 3],
    manaCost: () => 3,
    synergies: [{ skill: 'glacial_spike', perLevel: 0.1 }, { skill: 'blizzard', perLevel: 0.1 }],
  },
  {
    id: 'frozen_armor', name: '冰封护甲', charClass: 'sorceress', tab: 0, tier: 0,
    prereqs: [], maxLevel: 20, passive: false, icon: '🛡',
    manaCost: () => 7,
  },
  {
    id: 'ice_blast', name: '冰爆', charClass: 'sorceress', tab: 0, tier: 1,
    prereqs: ['ice_bolt'], maxLevel: 20, damageType: 'cold', icon: '💠',
    baseDamage: (l) => [5 + l * 3, 9 + l * 4],
    manaCost: (l) => 4 + l * 0.5,
    synergies: [{ skill: 'ice_bolt', perLevel: 0.08 }],
  },
  {
    id: 'frost_nova', name: '冰霜新星', charClass: 'sorceress', tab: 0, tier: 2,
    prereqs: ['frozen_armor'], maxLevel: 20, damageType: 'cold', icon: '❄',
    baseDamage: (l) => [4 + l * 3, 8 + l * 5],
    manaCost: (l) => 6 + l,
  },
  {
    id: 'glacial_spike', name: '冰川尖刺', charClass: 'sorceress', tab: 0, tier: 3,
    prereqs: ['ice_blast'], maxLevel: 20, damageType: 'cold', icon: '🧊',
    baseDamage: (l) => [8 + l * 5, 14 + l * 7],
    manaCost: (l) => 7 + l,
    synergies: [{ skill: 'ice_bolt', perLevel: 0.05 }],
  },
  {
    id: 'blizzard', name: '暴风雪', charClass: 'sorceress', tab: 0, tier: 4,
    prereqs: ['glacial_spike'], maxLevel: 20, damageType: 'cold', icon: '🌨',
    baseDamage: (l) => [12 + l * 7, 22 + l * 10],
    manaCost: (l) => 10 + l * 1.5,
    synergies: [{ skill: 'ice_blast', perLevel: 0.05 }, { skill: 'glacial_spike', perLevel: 0.05 }],
  },
  {
    id: 'frozen_orb', name: '寒冰宝珠', charClass: 'sorceress', tab: 0, tier: 5,
    prereqs: ['blizzard'], maxLevel: 20, damageType: 'cold', icon: '🔮',
    baseDamage: (l) => [10 + l * 6, 18 + l * 9],
    manaCost: (l) => 12 + l * 1.5,
    synergies: [{ skill: 'ice_bolt', perLevel: 0.02 }],
  },

  // === tab 1: 火系 ===
  {
    id: 'fire_bolt', name: '火弹', charClass: 'sorceress', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'fire', icon: '🔥',
    baseDamage: (l) => [3 + l * 3, 6 + l * 4],
    manaCost: () => 3,
    synergies: [{ skill: 'fire_ball', perLevel: 0.1 }, { skill: 'meteor', perLevel: 0.1 }],
  },
  {
    id: 'warmth', name: '温暖', charClass: 'sorceress', tab: 1, tier: 0,
    prereqs: [], maxLevel: 20, passive: true, icon: '🌡',
  },
  {
    id: 'inferno', name: '地狱火', charClass: 'sorceress', tab: 1, tier: 1,
    prereqs: ['fire_bolt'], maxLevel: 20, damageType: 'fire', icon: '🔆',
    baseDamage: (l) => [2 + l * 2, 4 + l * 3],
    manaCost: (l) => 4 + l * 0.4,
  },
  {
    id: 'fire_ball', name: '火球', charClass: 'sorceress', tab: 1, tier: 3,
    prereqs: ['fire_bolt'], maxLevel: 20, damageType: 'fire', icon: '☄',
    baseDamage: (l) => [9 + l * 5, 15 + l * 7],
    manaCost: (l) => 6 + l,
    synergies: [{ skill: 'fire_bolt', perLevel: 0.07 }],
  },
  {
    id: 'fire_wall', name: '火墙', charClass: 'sorceress', tab: 1, tier: 4,
    prereqs: ['fire_ball'], maxLevel: 20, damageType: 'fire', icon: '🧱',
    baseDamage: (l) => [11 + l * 6, 20 + l * 9],
    manaCost: (l) => 9 + l * 1.2,
  },
  {
    id: 'enchant', name: '附魔', charClass: 'sorceress', tab: 1, tier: 4,
    prereqs: ['warmth', 'fire_ball'], maxLevel: 20, damageType: 'fire', icon: '✨',
    manaCost: () => 25,
  },
  {
    id: 'meteor', name: '陨石', charClass: 'sorceress', tab: 1, tier: 5,
    prereqs: ['fire_wall'], maxLevel: 20, damageType: 'fire', icon: '🌠',
    baseDamage: (l) => [16 + l * 8, 28 + l * 12],
    manaCost: (l) => 13 + l * 1.5,
    synergies: [{ skill: 'fire_ball', perLevel: 0.05 }],
  },

  // === tab 2: 电系 ===
  {
    id: 'charged_bolt', name: '充能弹', charClass: 'sorceress', tab: 2, tier: 0,
    prereqs: [], maxLevel: 20, damageType: 'lightning', icon: '⚡',
    baseDamage: (l) => [2 + l * 2, 4 + l * 3],
    manaCost: () => 3,
    synergies: [{ skill: 'lightning', perLevel: 0.08 }],
  },
  {
    id: 'static_field', name: '静电力场', charClass: 'sorceress', tab: 2, tier: 1,
    prereqs: [], maxLevel: 20, damageType: 'lightning', icon: '🔆',
    manaCost: () => 9,
  },
  {
    id: 'telekinesis', name: '心灵传动', charClass: 'sorceress', tab: 2, tier: 1,
    prereqs: [], maxLevel: 20, damageType: 'magic', icon: '🌀',
    baseDamage: (l) => [1 + l, 3 + l * 2],
    manaCost: () => 7,
  },
  {
    id: 'nova', name: '新星', charClass: 'sorceress', tab: 2, tier: 2,
    prereqs: ['static_field'], maxLevel: 20, damageType: 'lightning', icon: '💫',
    baseDamage: (l) => [1, 14 + l * 8],
    manaCost: (l) => 8 + l,
  },
  {
    id: 'lightning', name: '闪电', charClass: 'sorceress', tab: 2, tier: 3,
    prereqs: ['charged_bolt', 'nova'], maxLevel: 20, damageType: 'lightning', icon: '🌩',
    baseDamage: (l) => [1, 30 + l * 12],
    manaCost: (l) => 8 + l,
    synergies: [{ skill: 'charged_bolt', perLevel: 0.06 }],
  },
  {
    id: 'chain_lightning', name: '连锁闪电', charClass: 'sorceress', tab: 2, tier: 4,
    prereqs: ['lightning'], maxLevel: 20, damageType: 'lightning', icon: '🔗',
    baseDamage: (l) => [1, 36 + l * 14],
    manaCost: (l) => 10 + l * 1.2,
    synergies: [{ skill: 'nova', perLevel: 0.05 }, { skill: 'lightning', perLevel: 0.05 }],
  },
  {
    id: 'teleport', name: '传送', charClass: 'sorceress', tab: 2, tier: 4,
    prereqs: ['telekinesis'], maxLevel: 20, passive: false, icon: '🌌',
    manaCost: (l) => Math.max(8, 24 - l),
  },
  {
    id: 'thunder_storm', name: '雷霆风暴', charClass: 'sorceress', tab: 2, tier: 5,
    prereqs: ['chain_lightning'], maxLevel: 20, damageType: 'lightning', icon: '🌪',
    baseDamage: (l) => [1, 40 + l * 16],
    manaCost: () => 30,
    synergies: [{ skill: 'chain_lightning', perLevel: 0.07 }],
  },
];
