// 野蛮人主动技能 (M1 切片: 3 个技能键). 机制对标 D2 战斗系野蛮人原型,
// 数值后续随技能树(T6)精调. 当前以冷却驱动(无蓝耗), 后续接入法力.
export interface SkillMeta {
  id: 'bash' | 'double_swing' | 'war_cry';
  name: string;
  icon: string;
  cooldown: number; // 秒
  desc: string;
}

export const BARB_SKILLS: SkillMeta[] = [
  { id: 'bash', name: '猛击', icon: '🗡', cooldown: 0.9, desc: '单体重击, 高伤+强击退' },
  { id: 'double_swing', name: '双挥', icon: '⚔', cooldown: 1.4, desc: '横扫身前一片敌人' },
  { id: 'war_cry', name: '战嚎', icon: '💢', cooldown: 5, desc: '环身AoE, 伤害+震慑' },
];
