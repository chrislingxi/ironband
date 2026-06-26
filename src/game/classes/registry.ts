import type { SkillDef, CharClass } from '@game/data/schema.ts';
import { BARBARIAN_SKILLS } from './barbarianTree.ts';
import { AMAZON_SKILLS } from './amazon.ts';
import { SORCERESS_SKILLS } from './sorceress.ts';

// 职业→完整技能树数据. 技能树面板按当前职业取用.
export const CLASS_SKILLS: Record<CharClass, SkillDef[]> = {
  barbarian: BARBARIAN_SKILLS,
  amazon: AMAZON_SKILLS,
  sorceress: SORCERESS_SKILLS,
};

// 三系页签标题 (按职业)
export const TAB_NAMES: Record<CharClass, [string, string, string]> = {
  barbarian: ['战斗技能', '战斗精通', '战吼'],
  amazon: ['弓与十字弓', '被动与魔法', '标枪与长矛'],
  sorceress: ['寒冰', '火焰', '闪电'],
};
