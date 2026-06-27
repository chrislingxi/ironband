// 第一幕三条主线任务. 任务名对标 D2 结构, 但 desc 描述全部原创。
// giver 引用 npcs.ts 的 NPC id, targetArea 引用 act1.ts 的区域 id。

// 任务奖励 (结构化, 由 Game.completeAndReward 实际发放)。
export type QuestReward =
  | { kind: 'gold'; amount: number }
  | { kind: 'skillPoint'; amount: number }
  | { kind: 'statPoint'; amount: number }
  | { kind: 'item'; rarityBoost: number } // 保底掉落一件 (rarityBoost 放大稀有度)
  | { kind: 'perma'; stat: 'maxhp' | 'res_all' | 'str' | 'dex' | 'vit' | 'energy'; value: number; label: string };

export interface Quest {
  id: string;
  name: string;
  objective: string; // 一行目标短句 (任务日志默认显示, 瞄一眼就懂)
  desc: string; // 原创任务说明 (剧情, 默认折叠)
  targetArea: string; // 目标区域 id
  giver: string; // 发布任务的 NPC id
  reward: string; // 奖励描述 (展示用)
  grants: QuestReward[]; // 实际发放的奖励
}

export const QUESTS: Quest[] = [
  {
    id: 'den_of_evil',
    name: '净化邪恶巢穴',
    objective: '清空『邪恶巢穴』洞窟内所有怪物',
    desc: '旷野下的洞窟里盘踞着一窝畸物, 把它们连根清光, 营地才能喘口气。',
    targetArea: 'den_of_evil',
    giver: 'akara',
    reward: '阿卡拉赠予一次免费的技能领悟。',
    grants: [{ kind: 'skillPoint', amount: 1 }],
  },
  {
    id: 'sisters_burial',
    name: '姐妹的安息之地',
    objective: '前往『墓园』, 击杀作祟的源头',
    desc: '坠落的罗格姐妹在墓园里被人扯成行尸, 找到作祟的源头, 还她们一份安宁。',
    targetArea: 'burial_grounds',
    giver: 'kashya',
    reward: '卡夏许诺一名免费的雇佣弓手随你出征。',
    grants: [{ kind: 'gold', amount: 300 }],
  },
  {
    id: 'andariel',
    name: '夺回护身符',
    objective: '深入『修道院地窟』击败安达莉尔',
    desc: '修道院深处的恶魔安达莉尔封住了去路, 击败她, 取回被夺走的护身符。',
    targetArea: 'andariel_lair',
    giver: 'cain',
    reward: '通往第二幕的车队就此开启。',
    grants: [{ kind: 'gold', amount: 600 }, { kind: 'item', rarityBoost: 4 }],
  },
  {
    id: 'duriel',
    name: '痛苦之王',
    objective: '在『塔拉夏古墓』击败督瑞尔',
    desc: '塔拉夏的古墓被痛苦之王督瑞尔占据。深入沙海尽头的墓室, 终结这头巨兽。',
    targetArea: 'tal_rasha_tomb',
    giver: 'cain',
    reward: '通往第三幕的传送门就此开启。',
    grants: [{ kind: 'gold', amount: 1000 }, { kind: 'perma', stat: 'maxhp', value: 25, label: '+25 生命上限' }],
  },
  {
    id: 'mephisto',
    name: '憎恨之王',
    objective: '在『仇恨监狱』击败梅菲斯特',
    desc: '憎恨之王梅菲斯特盘踞在库拉斯特城底的仇恨监狱。穿过丛林与崔凡克, 将他击杀。',
    targetArea: 'durance_of_hate',
    giver: 'cain',
    reward: '泰瑞尔的红门将通往第四幕。',
    grants: [{ kind: 'gold', amount: 1500 }, { kind: 'statPoint', amount: 5 }],
  },
  {
    id: 'diablo',
    name: '恐惧之王',
    objective: '在『混沌避难所』击败暗黑破坏神',
    desc: '暗黑破坏神在混沌避难所撕开了通往地狱的裂口。穿过烈焰之河, 击碎这头恐惧之王。',
    targetArea: 'chaos_sanctuary',
    giver: 'cain',
    reward: '红门将通往最终的第五幕。',
    grants: [{ kind: 'gold', amount: 2500 }, { kind: 'item', rarityBoost: 8 }],
  },
  {
    id: 'baal',
    name: '毁灭之王',
    objective: '在『世界石要塞』击败巴尔',
    desc: '毁灭之王巴尔已抵达世界石要塞之巅。翻越亚瑞特雪山, 终结这最后的恶魔。',
    targetArea: 'worldstone_keep',
    giver: 'cain',
    reward: '通关本难度, 解锁更高难度的试炼。',
    grants: [{ kind: 'gold', amount: 4000 }, { kind: 'perma', stat: 'res_all', value: 8, label: '+8% 全抗' }, { kind: 'skillPoint', amount: 2 }],
  },
];
