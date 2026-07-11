import { assetUrl } from '@engine/assets/url.ts';

export const DELIVERED_ITEM_ART = new Set([
  'item/short_bow',
  'item/cap',
  'item/buckler',
  'item/club',
  'item/sash',
  'item/ring',
  'item/hand_axe',
  'item/short_sword',
  'item/mace',
  'item/double_axe',
  'item/skull_cap',
  'item/small_shield',
]);

export function itemArt(sprite: string, fallbackHtml: string, px = 44): string {
  const safeSprite = /^[a-z0-9_/-]+$/.test(sprite) ? sprite : 'item/missing';
  if (!DELIVERED_ITEM_ART.has(safeSprite)) {
    return `<span class="item-art item-art-pending" style="width:${px}px;height:${px}px"><span class="item-art-fallback" style="display:flex">${fallbackHtml}</span></span>`;
  }
  return `<span class="item-art" style="width:${px}px;height:${px}px">` +
    `<img src="${assetUrl(`assets/${safeSprite}.png`)}" alt="" draggable="false" ` +
    `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` +
    `<span class="item-art-fallback" style="display:none">${fallbackHtml}</span></span>`;
}
