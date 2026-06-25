// 数据驱动契约 — 语义对齐 D2 的 .txt 数据表 (MonStats / Skills / Levels / ...).
// 数值实现时对照 Arreat Summit / 公开 D2 数据填充. 这是并行任务的共享契约, 改动需同步.

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'poison' | 'magic';
export type CharClass = 'barbarian' | 'amazon' | 'sorceress';
export type Difficulty = 'normal' | 'nightmare' | 'hell';
export type Rarity = 'normal' | 'magic' | 'rare' | 'set' | 'unique';

// 三难度分段数值 (D2 MonStats 风格).
export interface PerDifficulty<T> {
  normal: T;
  nightmare: T;
  hell: T;
}

// MonStats.txt 对齐
export interface MonStat {
  id: string;
  name: string;
  sprite: string; // 资产 key
  ai: string; // AI 行为 key (T4 实现: fallen/shaman/skeleton/...)
  level: PerDifficulty<number>;
  hp: PerDifficulty<[number, number]>; // [min,max]
  attackRating: PerDifficulty<number>;
  defense: PerDifficulty<number>;
  damage: PerDifficulty<[number, number]>;
  resist: Partial<Record<DamageType, PerDifficulty<number>>>; // 抗性%, hell 可 100 = 免疫
  exp: PerDifficulty<number>;
  speed: number; // 格/秒
  radius: number;
  flags?: { boss?: boolean; champion?: boolean; ranged?: boolean };
}

// Skills.txt 对齐 (含 synergy)
export interface SkillDef {
  id: string;
  name: string;
  charClass: CharClass;
  tab: 0 | 1 | 2; // 三系技能树页
  tier: number; // 解锁层 (需求等级 = tier*6 之类)
  prereqs: string[]; // 前置技能 id
  maxLevel: number;
  damageType?: DamageType;
  baseDamage?: (skillLevel: number) => [number, number];
  manaCost?: (skillLevel: number) => number;
  synergies?: { skill: string; perLevel: number }[];
  passive?: boolean;
  icon: string;
}

// ItemTypes/Weapons/Armor 对齐 (装备简化为单格)
export interface ItemBase {
  id: string;
  name: string;
  slot: 'weapon' | 'helm' | 'armor' | 'shield' | 'gloves' | 'boots' | 'belt' | 'ring' | 'amulet';
  type: string; // itemtype 链 (词缀适用判定)
  baseDamage?: [number, number];
  baseDefense?: [number, number];
  reqLevel: number;
  reqStr?: number;
  reqDex?: number;
  sockets?: number;
  sprite: string;
}

// MagicPrefix/Suffix 对齐
export interface Affix {
  id: string;
  name: string;
  kind: 'prefix' | 'suffix';
  level: number; // affix level (受 ilvl 限制)
  rarity: ('magic' | 'rare')[];
  appliesTo: string[]; // itemtype
  stat: string; // ItemStatCost key
  range: [number, number];
  frequency: number; // 权重
}

// Levels.txt 对齐 (区域)
export interface LevelDef {
  id: string;
  name: string;
  act: number;
  monLevel: PerDifficulty<number>;
  monsters: string[]; // 可生成的 MonStat id
  size: [number, number]; // 格
  waypoint?: boolean;
  isTown?: boolean;
  connects: string[]; // 相邻区域 id
}

// TreasureClassEx 对齐 (掉落表)
export interface TreasureClass {
  id: string;
  picks: number;
  noDrop: number; // 权重
  items: { ref: string; weight: number }[]; // ref = item id 或 子 TC id
}
