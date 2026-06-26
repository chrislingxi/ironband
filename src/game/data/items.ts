import type { ItemBase, Affix } from './schema.ts';

// 物品基础 (第一幕量级). type 用槽位字符串; 词缀按 type 适配. 名称为通用物品名.
export const ITEM_BASES: ItemBase[] = [
  // 武器
  { id: 'hand_axe', name: '手斧', slot: 'weapon', type: 'weapon', baseDamage: [3, 7], reqLevel: 1, reqStr: 12, sprite: 'item/hand_axe' },
  { id: 'short_sword', name: '短剑', slot: 'weapon', type: 'weapon', baseDamage: [2, 7], reqLevel: 1, reqStr: 10, sprite: 'item/short_sword' },
  { id: 'club', name: '棍棒', slot: 'weapon', type: 'weapon', baseDamage: [1, 6], reqLevel: 1, sprite: 'item/club' },
  { id: 'mace', name: '钉头锤', slot: 'weapon', type: 'weapon', baseDamage: [3, 10], reqLevel: 6, reqStr: 27, sprite: 'item/mace' },
  { id: 'double_axe', name: '双刃斧', slot: 'weapon', type: 'weapon', baseDamage: [5, 13], reqLevel: 10, reqStr: 43, sprite: 'item/double_axe' },
  // 头盔
  { id: 'cap', name: '皮帽', slot: 'helm', type: 'helm', baseDefense: [3, 5], reqLevel: 1, sprite: 'item/cap' },
  { id: 'skull_cap', name: '头盔', slot: 'helm', type: 'helm', baseDefense: [8, 11], reqLevel: 5, reqStr: 15, sprite: 'item/skull_cap' },
  // 盔甲
  { id: 'quilted', name: '绗缝甲', slot: 'armor', type: 'armor', baseDefense: [8, 11], reqLevel: 1, sprite: 'item/quilted' },
  { id: 'leather', name: '皮甲', slot: 'armor', type: 'armor', baseDefense: [14, 17], reqLevel: 3, reqStr: 15, sprite: 'item/leather' },
  { id: 'chain', name: '锁子甲', slot: 'armor', type: 'armor', baseDefense: [30, 35], reqLevel: 9, reqStr: 41, sprite: 'item/chain' },
  // 盾
  { id: 'buckler', name: '小圆盾', slot: 'shield', type: 'shield', baseDefense: [4, 6], reqLevel: 1, sprite: 'item/buckler' },
  { id: 'small_shield', name: '小盾', slot: 'shield', type: 'shield', baseDefense: [8, 12], reqLevel: 5, reqStr: 22, sprite: 'item/small_shield' },
  // 其他
  { id: 'leather_gloves', name: '皮手套', slot: 'gloves', type: 'gloves', baseDefense: [2, 3], reqLevel: 1, sprite: 'item/gloves' },
  { id: 'leather_boots', name: '皮靴', slot: 'boots', type: 'boots', baseDefense: [2, 3], reqLevel: 1, sprite: 'item/boots' },
  { id: 'sash', name: '布腰带', slot: 'belt', type: 'belt', baseDefense: [1, 2], reqLevel: 1, sprite: 'item/sash' },
  { id: 'ring', name: '戒指', slot: 'ring', type: 'ring', reqLevel: 1, sprite: 'item/ring' },
  { id: 'amulet', name: '护符', slot: 'amulet', type: 'amulet', reqLevel: 1, sprite: 'item/amulet' },
];

// 词缀池 (原创通用名). appliesTo: ['any'] 或具体槽位.
const ANY = ['any'];
export const AFFIXES: Affix[] = [
  // 前缀
  { id: 'p_ed1', name: '锋锐', kind: 'prefix', level: 1, rarity: ['magic', 'rare'], appliesTo: ['weapon'], stat: 'dmg_perc', range: [10, 20], frequency: 8 },
  { id: 'p_ed2', name: '凶蛮', kind: 'prefix', level: 8, rarity: ['magic', 'rare'], appliesTo: ['weapon'], stat: 'dmg_perc', range: [25, 45], frequency: 5 },
  { id: 'p_maxdam', name: '沉重', kind: 'prefix', level: 1, rarity: ['magic', 'rare'], appliesTo: ['weapon'], stat: 'maxdam', range: [1, 4], frequency: 6 },
  { id: 'p_def1', name: '坚固', kind: 'prefix', level: 1, rarity: ['magic', 'rare'], appliesTo: ['armor', 'helm', 'shield'], stat: 'defense_perc', range: [10, 30], frequency: 8 },
  { id: 'p_defflat', name: '镶钢', kind: 'prefix', level: 1, rarity: ['magic', 'rare'], appliesTo: ['armor', 'helm', 'shield', 'gloves', 'boots', 'belt'], stat: 'defense', range: [4, 14], frequency: 6 },
  { id: 'p_str', name: '蛮力', kind: 'prefix', level: 3, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'str', range: [1, 5], frequency: 5 },
  { id: 'p_dex', name: '灵巧', kind: 'prefix', level: 3, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'dex', range: [1, 5], frequency: 5 },
  { id: 'p_ar', name: '精准', kind: 'prefix', level: 1, rarity: ['magic', 'rare'], appliesTo: ['weapon', 'gloves', 'ring', 'amulet'], stat: 'tohit', range: [10, 45], frequency: 7 },
  { id: 'p_life', name: '壮硕', kind: 'prefix', level: 1, rarity: ['magic', 'rare'], appliesTo: ['armor', 'belt', 'amulet'], stat: 'maxhp', range: [5, 15], frequency: 6 },
  // 后缀
  { id: 's_resf', name: '抗火', kind: 'suffix', level: 1, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'res_fire', range: [5, 18], frequency: 7 },
  { id: 's_resc', name: '抗寒', kind: 'suffix', level: 1, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'res_cold', range: [5, 18], frequency: 7 },
  { id: 's_resl', name: '抗电', kind: 'suffix', level: 1, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'res_lght', range: [5, 18], frequency: 7 },
  { id: 's_resp', name: '抗毒', kind: 'suffix', level: 1, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'res_pois', range: [5, 18], frequency: 7 },
  { id: 's_resall', name: '守护', kind: 'suffix', level: 5, rarity: ['magic', 'rare'], appliesTo: ['armor', 'shield', 'amulet', 'ring'], stat: 'res_all', range: [3, 9], frequency: 4 },
  { id: 's_life', name: '活力', kind: 'suffix', level: 1, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'maxhp', range: [5, 20], frequency: 7 },
  { id: 's_mana', name: '智慧', kind: 'suffix', level: 1, rarity: ['magic', 'rare'], appliesTo: ANY, stat: 'maxmana', range: [5, 15], frequency: 5 },
  { id: 's_leech', name: '嗜血', kind: 'suffix', level: 6, rarity: ['magic', 'rare'], appliesTo: ['weapon', 'ring'], stat: 'lifeleech', range: [2, 6], frequency: 4 },
  { id: 's_vit', name: '健壮', kind: 'suffix', level: 4, rarity: ['magic', 'rare'], appliesTo: ['armor', 'belt', 'amulet'], stat: 'vit', range: [1, 4], frequency: 5 },
];

// 稀有名词库 (原创, 拼装稀有装备名)
export const RARE_WORDS = ['凛冬', '厄运', '战痕', '幽冥', '赤焰', '风暴', '碎骨', '荒野', '暗影', '黎明', '怒涛', '裂魂'];

// 暗金专名库 (原创, 单词命名程序化暗金)
export const UNIQUE_NAMES = ['噬魂', '陨铁之誓', '血月遗物', '亡者低语', '寒霜王座', '烈阳余烬', '永夜', '断罪者'];
