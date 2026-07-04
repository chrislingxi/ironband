import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const REQUIRED_ASSETS = [
  'assets/tile/hell.png',
  'assets/tile/snow.png',
  'public/assets/tile/hell.png',
  'public/assets/tile/snow.png',
  'assets/icon/skill-magic-arrow.svg',
  'assets/icon/skill-multiple-arrow.svg',
  'assets/icon/skill-frost-arrow.svg',
  'assets/icon/skill-ice-arrow.svg',
  'assets/icon/skill-exploding-arrow.svg',
  'public/assets/icon/skill-magic-arrow.svg',
  'public/assets/icon/skill-multiple-arrow.svg',
  'public/assets/icon/skill-frost-arrow.svg',
  'public/assets/icon/skill-ice-arrow.svg',
  'public/assets/icon/skill-exploding-arrow.svg',
  'assets/char/amazon.png',
  'assets/char/barbarian.png',
  'assets/char/sorceress.png',
  'public/assets/char/amazon.png',
  'public/assets/char/barbarian.png',
  'public/assets/char/sorceress.png',
  'assets/mon/mephisto.png',
  'assets/mon/diablo.png',
  'assets/mon/baal.png',
  'public/assets/mon/mephisto.png',
  'public/assets/mon/diablo.png',
  'public/assets/mon/baal.png',
];

describe('V4 visual asset pack', () => {
  it('keeps key V4 assets available for dev and GitHub Pages', () => {
    for (const file of REQUIRED_ASSETS) {
      expect(existsSync(file), `${file} should exist`).toBe(true);
      expect(statSync(file).size, `${file} should not be empty`).toBeGreaterThan(512);
    }
  });
});
