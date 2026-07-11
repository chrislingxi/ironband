// 去AI感: UI 图标按 key 用 game-icons 真图标或 V4 PNG 成品图标覆盖 emoji。
// 命中真图即覆盖 emoji, 缺图(onerror)回退 emoji —— 与精灵「真图覆盖矢量」同构, 优雅降级。
import { assetUrl } from '@engine/assets/url.ts';

const PNG_ICON_KEYS = new Set([
  'service_forge',
  'service_shop',
  'service_heal',
  'service_identify',
  'status_burn',
  'status_freeze',
  'status_poison',
  'status_bleed',
  'skill-magic-arrow',
  'skill-multiple-arrow',
  'skill-frost-arrow',
  'skill-fire-arrow',
  'skill-exploding-arrow',
  'skill-ice-arrow',
  'skill-guided-arrow',
  'skill-strafe',
  'skill-inner-sight',
  'skill-critical-strike',
  'skill-dodge',
  'skill-slow-missiles',
  'skill-penetrate',
  'skill-evade',
  'skill-valkyrie',
  'skill-jab',
  'skill-power-strike',
  'skill-poison-javelin',
  'skill-lightning-bolt',
  'skill-charged-strike',
  'skill-plague-javelin',
  'skill-lightning-fury',
  'skill-bash',
  'skill-double-swing',
  'skill-stun',
  'skill-double-throw',
  'skill-concentrate',
  'skill-frenzy',
  'skill-whirlwind',
  'skill-berserk',
  'skill-sword-mastery',
  'skill-axe-mastery',
  'skill-mace-mastery',
  'skill-increased-stamina',
  'skill-increased-speed',
  'skill-iron-skin',
  'skill-natural-resistance',
  'skill-weapon-block',
  'skill-howl',
  'skill-shout',
  'skill-taunt',
  'skill-battle-cry',
  'skill-battle-orders',
  'skill-war-cry',
  'skill-battle-command',
  'skill-ice-bolt',
  'skill-frozen-armor',
  'skill-ice-blast',
  'skill-frost-nova',
  'skill-glacial-spike',
  'skill-blizzard',
  'skill-frozen-orb',
  'skill-fire-bolt',
  'skill-warmth',
  'skill-inferno',
  'skill-fire-ball',
  'skill-fire-wall',
  'skill-enchant',
  'skill-meteor',
  'skill-charged-bolt',
  'skill-static-field',
  'skill-telekinesis',
  'skill-nova',
  'skill-lightning',
  'skill-chain-lightning',
  'skill-teleport',
  'skill-thunder-storm',
]);

const SKILL_ID_ICON: Record<string, string> = {
  bash: 'skill-bash',
  double_swing: 'skill-double-swing',
  stun: 'skill-stun',
  double_throw: 'skill-double-throw',
  concentrate: 'skill-concentrate',
  frenzy: 'skill-frenzy',
  whirlwind: 'skill-whirlwind',
  berserk: 'skill-berserk',
  sword_mastery: 'skill-sword-mastery',
  axe_mastery: 'skill-axe-mastery',
  mace_mastery: 'skill-mace-mastery',
  increased_stamina: 'skill-increased-stamina',
  increased_speed: 'skill-increased-speed',
  iron_skin: 'skill-iron-skin',
  natural_resistance: 'skill-natural-resistance',
  weapon_block: 'skill-weapon-block',
  howl: 'skill-howl',
  shout: 'skill-shout',
  taunt: 'skill-taunt',
  battle_cry: 'skill-battle-cry',
  battle_orders: 'skill-battle-orders',
  war_cry: 'skill-war-cry',
  battle_command: 'skill-battle-command',
  ice_bolt: 'skill-ice-bolt',
  frozen_armor: 'skill-frozen-armor',
  ice_blast: 'skill-ice-blast',
  frost_nova: 'skill-frost-nova',
  glacial_spike: 'skill-glacial-spike',
  blizzard: 'skill-blizzard',
  frozen_orb: 'skill-frozen-orb',
  fire_bolt: 'skill-fire-bolt',
  warmth: 'skill-warmth',
  inferno: 'skill-inferno',
  fire_ball: 'skill-fire-ball',
  meteor: 'skill-meteor',
  charged_bolt: 'skill-charged-bolt',
  static_field: 'skill-static-field',
  telekinesis: 'skill-telekinesis',
  magic_arrow: 'skill-magic-arrow',
  multiple_shot: 'skill-multiple-arrow',
  cold_arrow: 'skill-frost-arrow',
  fire_arrow: 'skill-fire-arrow',
  exploding_arrow: 'skill-exploding-arrow',
  ice_arrow: 'skill-ice-arrow',
  guided_arrow: 'skill-guided-arrow',
  strafe: 'skill-strafe',
  inner_sight: 'skill-inner-sight',
  critical_strike: 'skill-critical-strike',
  dodge: 'skill-dodge',
  slow_missiles: 'skill-slow-missiles',
  penetrate: 'skill-penetrate',
  evade: 'skill-evade',
  valkyrie: 'skill-valkyrie',
  jab: 'skill-jab',
  power_strike: 'skill-power-strike',
  poison_javelin: 'skill-poison-javelin',
  lightning_bolt: 'skill-lightning-bolt',
  charged_strike: 'skill-charged-strike',
  plague_javelin: 'skill-plague-javelin',
  lightning_fury: 'skill-lightning-fury',
  fire_wall: 'skill-fire-wall',
  enchant: 'skill-enchant',
  nova: 'skill-nova',
  lightning: 'skill-lightning',
  chain_lightning: 'skill-chain-lightning',
  teleport: 'skill-teleport',
  thunder_storm: 'skill-thunder-storm',
};

export function iconImg(key: string, emoji: string, px = 28): string {
  const safe = emoji.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const ext = PNG_ICON_KEYS.has(key) ? 'png' : 'svg';
  return (
    `<img src="${assetUrl(`assets/icon/${key}.${ext}`)}" alt="" ` +
    `class="v4-icon v4-icon-${key}" data-format="${ext}" style="width:${px}px;height:${px}px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 2px #000a)" ` +
    `onerror="this.replaceWith(document.createTextNode('${safe}'))">`
  );
}

// 把元素内容设为图标(emoji 回退)。沿用元素原有 flex 居中/尺寸。
export function setIcon(el: HTMLElement, key: string, emoji: string, px = 28): void {
  el.innerHTML = iconImg(key, emoji, px);
}

// 技能 emoji → game-icons key (技能 icon 字段=emoji; 按语义映到真图标, 缺映射/缺图回退 emoji)。
export const EMOJI_ICON: Record<string, string> = {
  '🗡': 'broadsword', '⚔': 'crossed-swords', '💢': 'enrage', '💫': 'knockout', '🪃': 'boomerang',
  '🎯': 'skill-multiple-arrow', '🔥': 'flame', '🌀': 'tornado', '😡': 'angry-eyes', '🪓': 'battle-axe', '🔨': 'thor-hammer',
  '🏃': 'run', '💨': 'wingfoot', '🛡': 'round-shield', '🧱': 'brick-wall', '🤺': 'fencer', '📢': 'megaphone',
  '🗣': 'shouting', '😤': 'screaming', '🎺': 'trumpet', '🔊': 'sonic-shout', '👑': 'crown', '🏹': 'skill-magic-arrow',
  '❄': 'skill-frost-arrow', '🧊': 'skill-ice-arrow', '💥': 'skill-exploding-arrow', '👁': 'eye-target', '⭐': 'star-swirl',
  '🐌': 'snail', '🤸': 'acrobatic', '🦅': 'eagle-emblem', '🔱': 'trident', '⚡': 'lightning-arc', '🟢': 'poison-cloud',
  '🌩': 'lightning-storm', '🔋': 'battery-pack', '☠': 'death-skull', '🌟': 'sparkles', '🔹': 'ice-spear',
  '💠': 'crystal-cluster', '🔮': 'crystal-ball', '🌡': 'flame', '🔆': 'bright-explosion', '☄': 'comet-spark',
  '✨': 'magic-swirl', '🌠': 'meteor-impact', '🌌': 'portal', '🌪': 'tornado', '🔗': 'linked-rings',
  '🌨': 'frozen-orb', '👊': 'fist', '🔵': 'beams-aura', // 暴风雪 + 普攻键(野蛮/法师), 最显眼勿漏
};

// 技能图标 HTML: emoji → 真图标(无映射回退 emoji)。
// FE0F 容错为单向: 源数据 emoji 均为裸码点, 故 EMOJI_ICON 键也用裸码点; 这里去掉传入的变体选择符再查, 保证带/不带 FE0F 都命中。
export function skillIconHtml(emoji: string, px = 30, skillId?: string): string {
  const e = emoji || '';
  const key = (skillId ? SKILL_ID_ICON[skillId] : undefined) ?? EMOJI_ICON[e] ?? EMOJI_ICON[e.replace(/️/g, '')];
  const inner = key ? iconImg(key, e, px) : `<span class="emoji-fallback" style="font-size:${px - 6}px;line-height:1">${e}</span>`;
  return `<span class="skill-glyph" data-icon="${key ?? 'emoji'}">${inner}</span>`;
}
