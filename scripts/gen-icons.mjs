// 去AI感图标生成: 从 Iconify game-icons(CC-BY 3.0) 拉取 → 染金 → 写 public/assets/icon/<key>.svg。
// 渲染层按 key 用 <img>, 缺则回退 emoji。重跑: node scripts/gen-icons.mjs (需代理)。
// 映射: UI key -> iconify game-icons 名。新增图标在此加一行后重跑。
export const ICON_MAP = {
  // 战斗页功能按钮
  'ui/bag': 'knapsack', 'ui/char': 'muscle-up', 'ui/skilltree': 'spell-book',
  'ui/quest': 'scroll-unfurled', 'ui/camp': 'campfire', 'ui/waypoint': 'magic-portal',
  'ui/menu': 'hamburger', 'ui/audio': 'speaker', 'ui/help': 'help',
  'ui/settings': 'gears', 'ui/potion': 'health-potion',
  // 技能图标 (按 emoji 语义; icon.ts 的 EMOJI_ICON 把技能 emoji 映到这些名)
  'broadsword': 'broadsword', 'crossed-swords': 'crossed-swords', 'enrage': 'enrage',
  'knockout': 'knockout', 'boomerang': 'boomerang', 'bullseye': 'bullseye', 'flame': 'flame',
  'tornado': 'tornado', 'angry-eyes': 'angry-eyes', 'battle-axe': 'battle-axe', 'thor-hammer': 'thor-hammer',
  'run': 'run', 'wingfoot': 'wingfoot', 'round-shield': 'round-shield', 'brick-wall': 'brick-wall',
  'fencer': 'fencer', 'megaphone': 'megaphone', 'shouting': 'shouting', 'screaming': 'screaming',
  'trumpet': 'trumpet', 'sonic-shout': 'sonic-shout', 'crown': 'crown', 'high-shot': 'high-shot',
  'snowflake-1': 'snowflake-1', 'ice-cube': 'ice-cube', 'explosion-rays': 'explosion-rays',
  'eye-target': 'eye-target', 'star-swirl': 'star-swirl', 'snail': 'snail', 'acrobatic': 'acrobatic',
  'eagle-emblem': 'eagle-emblem', 'trident': 'trident', 'lightning-arc': 'lightning-arc',
  'poison-cloud': 'poison-cloud', 'lightning-storm': 'lightning-storm', 'battery-pack': 'battery-pack',
  'death-skull': 'death-skull', 'sparkles': 'sparkles', 'ice-spear': 'ice-spear',
  'crystal-cluster': 'crystal-cluster', 'crystal-ball': 'crystal-ball', 'bright-explosion': 'bright-explosion',
  'comet-spark': 'comet-spark', 'magic-swirl': 'magic-swirl', 'meteor-impact': 'meteor-impact',
  'portal': 'portal', 'linked-rings': 'linked-rings',
  'fist': 'fist', 'beams-aura': 'beams-aura', 'frozen-orb': 'frozen-orb',
  // 装备槽 + 面板标题图标
  'slot/helm': 'crested-helmet', 'slot/armor': 'breastplate', 'slot/shield': 'winged-shield',
  'slot/gloves': 'gloves', 'slot/boots': 'boots', 'slot/belt': 'belt', 'slot/ring': 'ring', 'slot/amulet': 'necklace',
  'broom': 'broom', 'book-cover': 'book-cover', 'trash-can': 'trash-can', 'light-bulb': 'light-bulb',
};
