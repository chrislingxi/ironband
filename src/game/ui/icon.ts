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
