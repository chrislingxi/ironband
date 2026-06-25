import { describe, it, expect } from 'vitest';
import { gridToScreen, screenToGrid, depthKey } from '../src/engine/math/iso.ts';

describe('iso projection', () => {
  it('grid→screen→grid 往返一致', () => {
    for (const g of [{ x: 0, y: 0 }, { x: 3, y: 7 }, { x: 12.5, y: 4.25 }]) {
      const back = screenToGrid(gridToScreen(g));
      expect(back.x).toBeCloseTo(g.x, 6);
      expect(back.y).toBeCloseTo(g.y, 6);
    }
  });

  it('原点投影到屏幕 (0,0)', () => {
    expect(gridToScreen({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('深度键: 越靠前 (x+y 越大) 键越大', () => {
    expect(depthKey({ x: 5, y: 5 })).toBeGreaterThan(depthKey({ x: 1, y: 1 }));
  });
});
