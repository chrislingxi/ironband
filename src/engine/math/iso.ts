import type { Vec2 } from './vec.ts';

// 等距投影常量 (2:1 菱形地砖). 世界用浮点格子坐标, 屏幕用像素.
export const TILE_W = 64;
export const TILE_H = 32;

// 格子坐标 → 屏幕像素 (相机平移前的世界像素)
export function gridToScreen(g: Vec2): Vec2 {
  return {
    x: (g.x - g.y) * (TILE_W / 2),
    y: (g.x + g.y) * (TILE_H / 2),
  };
}

// 屏幕像素 → 格子坐标 (点击/触摸寻路用)
export function screenToGrid(s: Vec2): Vec2 {
  const a = s.x / (TILE_W / 2);
  const b = s.y / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// 深度排序键: 等距下 y 越大越靠前 (后绘制). x 做次级避免抖动.
export function depthKey(g: Vec2): number {
  return (g.x + g.y) * 1000 + g.x;
}
