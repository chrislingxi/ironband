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
    objective: '深入『血根祭窟』击败血根主母',
    desc: '血根主母用腐化藤脉封死了旧修道院, 斩断她的根心, 取回被夺走的护身符。',
    targetArea: 'andariel_lair',
    giver: 'cain',
    reward: '通往第二幕的车队就此开启。',
    grants: [{ kind: 'gold', amount: 600 }, { kind: 'item', rarityBoost: 4 }],
  },
  {
    id: 'duriel',
    name: '沉沙刑墓',
    objective: '在『沉沙刑墓』击败铁狱刑王',
    desc: '铁狱刑王把流亡者铸进沙海刑具。深入墓室, 在寒铁锁链合拢前终结这头巨兽。',
    targetArea: 'tal_rasha_tomb',
    giver: 'cain',
    reward: '通往第三幕的传送门就此开启。',
    grants: [{ kind: 'gold', amount: 1000 }, { kind: 'perma', stat: 'maxhp', value: 25, label: '+25 生命上限' }],
  },
  {
    id: 'mephisto',
    name: '空骸低语',
    objective: '在『空骸禁宫』击败空骸先知',
    desc: '空骸先知盘踞在沉城之下, 用雷霆驱使无名骸骨。穿过腐林与祭城, 让预言永远沉默。',
    targetArea: 'durance_of_hate',
    giver: 'cain',
    reward: '泰瑞尔的红门将通往第四幕。',
    grants: [{ kind: 'gold', amount: 1500 }, { kind: 'statPoint', amount: 5 }],
  },
  {
    id: 'diablo',
    name: '烬角王座',
    objective: '在『烬火圣所』击败烬角暴君',
    desc: '烬角暴君在圣所撕开熔火裂口。穿过灰烬长河, 击碎他的燃烧王座。',
    targetArea: 'chaos_sanctuary',
    giver: 'cain',
    reward: '红门将通往最终的第五幕。',
    grants: [{ kind: 'gold', amount: 2500 }, { kind: 'item', rarityBoost: 8 }],
  },
  {
    id: 'baal',
    name: '腐冠终局',
    objective: '在『腐冠天阶』击败腐冠之王',
    desc: '腐冠之王登上北境天阶, 以疫毒和寒潮吞没群峰。翻越雪山, 终结最后的王冠。',
    targetArea: 'worldstone_keep',
    giver: 'cain',
    reward: '通关本难度, 解锁更高难度的试炼。',
    grants: [{ kind: 'gold', amount: 4000 }, { kind: 'perma', stat: 'res_all', value: 8, label: '+8% 全抗' }, { kind: 'skillPoint', amount: 2 }],
  },
];
