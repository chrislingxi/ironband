import { describe, expect, it } from 'vitest';
import { itemArt } from '@game/ui/itemart.ts';

describe('item art route', () => {
  it('uses the item base sprite and keeps a fallback for unfinished art', () => {
    const html = itemArt('item/short_bow', '<span>fallback</span>', 44);
    expect(html).toContain('assets/item/short_bow.png');
    expect(html).toContain('width:44px;height:44px');
    expect(html).toContain('item-art-fallback');
    expect(html).toContain('fallback');
  });

  it('does not interpolate unsafe sprite paths', () => {
    const html = itemArt('item/x\" onerror=alert(1)', 'fallback');
    expect(html).not.toContain('<img');
    expect(html).toContain('item-art-pending');
  });

  it('does not request unfinished item art before it is delivered', () => {
    const html = itemArt('item/leather', '<span>armor</span>');
    expect(html).not.toContain('assets/item/leather.png');
    expect(html).toContain('armor');
  });
});
