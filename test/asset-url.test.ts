import { afterEach, describe, expect, it, vi } from 'vitest';
import { ASSET_REVISION, assetUrl } from '../src/engine/assets/url.ts';

describe('static asset release URLs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the built-in revision outside a browser', () => {
    vi.stubGlobal('location', undefined);
    expect(assetUrl('assets/tile/town.png')).toBe(`assets/tile/town.png?v=${ASSET_REVISION}`);
  });

  it('propagates the page cachebuster to every asset', () => {
    vi.stubGlobal('location', { search: '?v=db13808-online-qa' });
    expect(assetUrl('assets/char/amazon.png')).toBe('assets/char/amazon.png?v=db13808-online-qa');
    expect(assetUrl('assets/audio/bgm.mp3?channel=music')).toBe('assets/audio/bgm.mp3?channel=music&v=db13808-online-qa');
  });
});
