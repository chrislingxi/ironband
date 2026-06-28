// 去AI感: UI 图标按 key 用 game-icons 真图标(public/assets/icon/<key>.svg, 染金, CC-BY)。
// 命中真图即覆盖 emoji, 缺图(onerror)回退 emoji —— 与精灵「真图覆盖矢量」同构, 优雅降级。
export function iconImg(key: string, emoji: string, px = 28): string {
  const safe = emoji.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return (
    `<img src="assets/icon/${key}.svg" alt="" ` +
    `style="width:${px}px;height:${px}px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 2px #000a)" ` +
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
  '🎯': 'bullseye', '🔥': 'flame', '🌀': 'tornado', '😡': 'angry-eyes', '🪓': 'battle-axe', '🔨': 'thor-hammer',
  '🏃': 'run', '💨': 'wingfoot', '🛡': 'round-shield', '🧱': 'brick-wall', '🤺': 'fencer', '📢': 'megaphone',
  '🗣': 'shouting', '😤': 'screaming', '🎺': 'trumpet', '🔊': 'sonic-shout', '👑': 'crown', '🏹': 'high-shot',
  '❄': 'snowflake-1', '🧊': 'ice-cube', '💥': 'explosion-rays', '👁': 'eye-target', '⭐': 'star-swirl',
  '🐌': 'snail', '🤸': 'acrobatic', '🦅': 'eagle-emblem', '🔱': 'trident', '⚡': 'lightning-arc', '🟢': 'poison-cloud',
  '🌩': 'lightning-storm', '🔋': 'battery-pack', '☠': 'death-skull', '🌟': 'sparkles', '🔹': 'ice-spear',
  '💠': 'crystal-cluster', '🔮': 'crystal-ball', '🌡': 'flame', '🔆': 'bright-explosion', '☄': 'comet-spark',
  '✨': 'magic-swirl', '🌠': 'meteor-impact', '🌌': 'portal', '🌪': 'tornado', '🔗': 'linked-rings',
  '🌨': 'frozen-orb', '👊': 'fist', '🔵': 'beams-aura', // 暴风雪 + 普攻键(野蛮/法师), 最显眼勿漏
};

// 技能图标 HTML: emoji → 真图标(无映射回退 emoji)。
// FE0F 容错为单向: 源数据 emoji 均为裸码点, 故 EMOJI_ICON 键也用裸码点; 这里去掉传入的变体选择符再查, 保证带/不带 FE0F 都命中。
export function skillIconHtml(emoji: string, px = 30): string {
  const e = emoji || '';
  const key = EMOJI_ICON[e] ?? EMOJI_ICON[e.replace(/️/g, '')];
  return key ? iconImg(key, e, px) : `<span style="font-size:${px - 6}px;line-height:1">${e}</span>`;
}
