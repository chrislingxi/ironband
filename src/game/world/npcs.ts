// 第一幕罗格营地核心 NPC. 名字沿用音译专名, 但 greeting 全部原创,
// 不照搬任何原版台词. role 决定其交互功能 (商店/治疗/赌博/传送/任务/雇佣).

export type NpcRole =
  | 'vendor'
  | 'heal'
  | 'gamble'
  | 'travel'
  | 'quest'
  | 'mercenary';

export interface Npc {
  id: string;
  name: string;
  role: NpcRole;
  area: 'rogue_encampment';
  greeting: string; // 原创一句问候
}

export const NPCS: Npc[] = [
  {
    id: 'akara',
    name: '阿卡拉',
    role: 'heal',
    area: 'rogue_encampment',
    greeting: '让我替你压住伤口里的寒意, 旅人, 营地的炉火还为你而燃。',
  },
  {
    id: 'kashya',
    name: '卡夏',
    role: 'mercenary',
    area: 'rogue_encampment',
    greeting: '我的姐妹们能拉弓断敌, 付得起代价, 就带一个上路。',
  },
  {
    id: 'charsi',
    name: '查西',
    role: 'vendor',
    area: 'rogue_encampment',
    greeting: '铁砧还热着, 想买把趁手的家伙, 还是修一修身上的破甲?',
  },
  {
    id: 'gheed',
    name: '吉德',
    role: 'gamble',
    area: 'rogue_encampment',
    greeting: '运气是门生意, 朋友, 押下金币, 看看命运给你什么货色。',
  },
  {
    id: 'warriv',
    name: '沃里夫',
    role: 'travel',
    area: 'rogue_encampment',
    greeting: '我的车队随时能动身, 说一声, 我就带你离开这片血土。',
  },
  {
    id: 'cain',
    name: '迪卡凯恩',
    role: 'quest',
    area: 'rogue_encampment',
    greeting: '把你捡来的怪东西给我看看, 老人的眼睛还认得几样古物。',
  },
];
