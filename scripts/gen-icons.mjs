// 去AI感图标生成: 从 Iconify game-icons(CC-BY 3.0) 拉取 → 染金 → 写 public/assets/icon/<key>.svg。
// 渲染层按 key 用 <img>, 缺则回退 emoji。重跑: node scripts/gen-icons.mjs (需代理)。
// 映射: UI key -> iconify game-icons 名。新增图标在此加一行后重跑。
export const ICON_MAP = {
  // 战斗页功能按钮
  'ui/bag': 'knapsack', 'ui/char': 'muscle-up', 'ui/skilltree': 'spell-book',
  'ui/quest': 'scroll-unfurled', 'ui/camp': 'campfire', 'ui/waypoint': 'magic-portal',
  'ui/menu': 'hamburger', 'ui/audio': 'speaker', 'ui/help': 'help',
  'ui/settings': 'gears', 'ui/potion': 'health-potion',
};
