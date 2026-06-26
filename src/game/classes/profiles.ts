// 逐职业战斗档案 — 让亚马逊/法师也能像野蛮人一样用 3 个技能键作战.
//
// 本模块只描述"职业起手"与"3 技能键行为", 不改任何已有系统.
// - makeAmazon / makeSorceress 仿 makeBarbarian: 给出起手属性 + 起手武器.
// - CLASS_KEYS 给出每个职业的 3 个技能键 (与槽位一一对应), 用数据描述行为,
//   让 Game.useSkill 能按 kind 泛化执行 (近战弧形 / 生成 missile / 环身 nova).
//
// 设计约束: Character 由 character.ts 定义, 其 cls 字段当前为字面量 'barbarian'.
// 为了在不改动 character.ts 的前提下产出 amazon/sorceress 角色, 这里用一个
// 轻量构造器在内部组装对象, 再按 Character 形状导出 (cls 以 CharClass 收窄).

import type { Character } from '@game/systems/stats/character.ts';
import { makeBarbarian } from '@game/systems/stats/character.ts';
import { makeNormalItem } from '@game/systems/items/index.ts';
import type { CharClass, DamageType } from '@game/data/schema.ts';

// Character.cls 当前被声明为字面量 'barbarian'. 为了复用同一形状承载三个职业,
// 这里定义一个把 cls 放宽到 CharClass 的别名 — 字段与 Character 完全一致,
// 仅 cls 的可取值更宽, 保证严格 tsc 下 amazon/sorceress 也能构造.
type ClassCharacter = Omit<Character, 'cls'> & { cls: CharClass };

// 内部通用构造: 起手属性 + 起手武器 base id.
function makeProfile(
  cls: CharClass,
  base: { str: number; dex: number; vit: number; energy: number },
  weaponId: string,
): Character {
  const ch: ClassCharacter = {
    cls,
    level: 1,
    xp: 0,
    base,
    equipment: { weapon: makeNormalItem(weaponId) },
  };
  // ClassCharacter 与 Character 字段一致, 仅 cls 更宽; 对外按 Character 暴露.
  return ch as Character;
}

// 亚马逊起手: 力20敏25体20精15, 偏敏捷的攻击型, 起手短剑.
export function makeAmazon(): Character {
  return makeProfile('amazon', { str: 20, dex: 25, vit: 20, energy: 15 }, 'short_sword');
}

// 法师起手: 力10敏15体10精35, 高精力低体格, 起手棍棒 (近战很弱, 靠技能输出).
export function makeSorceress(): Character {
  return makeProfile('sorceress', { str: 10, dex: 15, vit: 10, energy: 35 }, 'club');
}

// 一个"技能键"的行为描述 — Game.useSkill 据此泛化执行.
export interface ClassSkillKey {
  id: string; // 技能稳定标识 (用于资产/日志/存档)
  name: string; // 显示名 (对标 D2 专名)
  icon: string; // UI 图标
  cooldown: number; // 冷却 (秒)
  // 执行形态:
  //  melee      近战单体/小弧 (走近战路径)
  //  arc        近战横扫弧 (走近战路径, 较宽)
  //  aoe        环身范围 (走近战路径, 落点=自身)
  //  projectile 单发投射物 (生成 missile)
  //  spread     扇形多发投射物 (生成 count 个 missile)
  //  nova       环身放射 (生成环形 missile / 即时环身判定)
  kind: 'melee' | 'arc' | 'aoe' | 'projectile' | 'spread' | 'nova';
  damageMult: number; // 伤害系数 (相对武器/技能基础, 0.8~2.6)
  damageType?: DamageType; // 元素类型 (缺省=physical)
  missileKind?: 'arrow' | 'fireball' | 'iceball' | 'bolt' | 'nova'; // 投射物外观/资产
  count?: number; // 多重投射数 (spread 用)
  radius?: number; // 作用半径 (aoe/nova/落点爆炸用, 单位=格)
  stun?: number; // 震慑/减速时长 (秒), >0 表示命中后施加控制
}

// 每个职业的 3 个技能键 (顺序对应 3 个技能槽位).
// damageMult 控制相对强度: 近战受武器加成大故偏低, 法术自带倍率故偏高.
export const CLASS_KEYS: Record<CharClass, [ClassSkillKey, ClassSkillKey, ClassSkillKey]> = {
  // 野蛮人 — 与现有 BARB_SKILLS 一致: 猛击 / 双挥 / 战嚎.
  barbarian: [
    {
      id: 'bash',
      name: '猛击',
      icon: '🗡',
      cooldown: 0.9,
      kind: 'melee',
      damageMult: 1.6, // 单体重击
      damageType: 'physical',
      stun: 0.4, // 强击退/短震慑
    },
    {
      id: 'double_swing',
      name: '双挥',
      icon: '⚔',
      cooldown: 1.4,
      kind: 'arc',
      damageMult: 1.1, // 横扫多目标, 单体略低
      damageType: 'physical',
      radius: 1.5,
    },
    {
      id: 'war_cry',
      name: '战嚎',
      icon: '💢',
      cooldown: 5,
      kind: 'aoe',
      damageMult: 0.9, // 环身 AoE, 主控场
      damageType: 'physical',
      radius: 3,
      stun: 1.2, // 震慑
    },
  ],

  // 亚马逊 — 物理/魔法投射: 魔法箭 / 多重箭 / 投枪.
  amazon: [
    {
      id: 'magic_arrow',
      name: '魔法箭',
      icon: '🏹',
      cooldown: 0.5,
      kind: 'projectile',
      damageMult: 1.0, // 单发, 短冷却, 主力点射
      damageType: 'magic',
      missileKind: 'arrow',
    },
    {
      id: 'multi_shot',
      name: '多重箭',
      icon: '🎯',
      cooldown: 1.6,
      kind: 'spread',
      damageMult: 0.8, // 扇形覆盖, 单发偏低
      damageType: 'physical',
      missileKind: 'arrow',
      count: 5, // 5 发扇形
    },
    {
      id: 'jab_spear',
      name: '投枪',
      icon: '🔱',
      cooldown: 1.2,
      kind: 'projectile',
      damageMult: 2.2, // 高伤单发
      damageType: 'physical',
      missileKind: 'bolt',
    },
  ],

  // 法师 — 三系法术: 冰弹(冷,减速) / 火球(火,落点爆炸) / 闪电新星(电,环身).
  sorceress: [
    {
      id: 'ice_bolt',
      name: '冰弹',
      icon: '❄',
      cooldown: 0.7,
      kind: 'projectile',
      damageMult: 1.2,
      damageType: 'cold',
      missileKind: 'iceball',
      stun: 1.5, // 冷伤减速/短冻结
    },
    {
      id: 'fire_ball',
      name: '火球',
      icon: '🔥',
      cooldown: 1.3,
      kind: 'aoe',
      damageMult: 1.8, // 落点爆炸群伤
      damageType: 'fire',
      missileKind: 'fireball',
      radius: 2.5, // 爆炸半径
    },
    {
      id: 'lightning_nova',
      name: '闪电新星',
      icon: '⚡',
      cooldown: 2.6,
      kind: 'nova',
      damageMult: 1.4, // 环身放射
      damageType: 'lightning',
      missileKind: 'nova',
      radius: 4,
    },
  ],
};

// 按职业分派到对应起手构造器.
export function makeCharacterFor(cls: CharClass): Character {
  switch (cls) {
    case 'amazon':
      return makeAmazon();
    case 'sorceress':
      return makeSorceress();
    case 'barbarian':
    default:
      return makeBarbarian();
  }
}
