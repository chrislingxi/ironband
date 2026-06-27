// 第一幕三条主线任务. 任务名对标 D2 结构, 但 desc 描述全部原创。
// giver 引用 npcs.ts 的 NPC id, targetArea 引用 act1.ts 的区域 id。

export interface Quest {
  id: string;
  name: string;
  desc: string; // 原创任务说明
  targetArea: string; // 目标区域 id
  giver: string; // 发布任务的 NPC id
  reward: string; // 奖励描述
}

export const QUESTS: Quest[] = [
  {
    id: 'den_of_evil',
    name: '净化邪恶巢穴',
    desc: '旷野下的洞窟里盘踞着一窝畸物, 把它们连根清光, 营地才能喘口气。',
    targetArea: 'den_of_evil',
    giver: 'akara',
    reward: '阿卡拉赠予一次免费的技能领悟。',
  },
  {
    id: 'sisters_burial',
    name: '姐妹的安息之地',
    desc: '坠落的罗格姐妹在墓园里被人扯成行尸, 找到作祟的源头, 还她们一份安宁。',
    targetArea: 'burial_grounds',
    giver: 'kashya',
    reward: '卡夏许诺一名免费的雇佣弓手随你出征。',
  },
  {
    id: 'andariel',
    name: '夺回护身符',
    desc: '修道院深处的恶魔安达莉尔封住了去路, 击败她, 取回被夺走的护身符。',
    targetArea: 'andariel_lair',
    giver: 'cain',
    reward: '通往第二幕的车队就此开启。',
  },
  {
    id: 'duriel',
    name: '痛苦之王',
    desc: '塔拉夏的古墓被痛苦之王督瑞尔占据。深入沙海尽头的墓室, 终结这头巨兽。',
    targetArea: 'tal_rasha_tomb',
    giver: 'cain',
    reward: '通往第三幕的传送门就此开启。',
  },
  {
    id: 'mephisto',
    name: '憎恨之王',
    desc: '憎恨之王梅菲斯特盘踞在库拉斯特城底的仇恨监狱。穿过丛林与崔凡克, 将他击杀。',
    targetArea: 'durance_of_hate',
    giver: 'cain',
    reward: '通关本难度, 解锁更高难度的试炼。',
  },
];
