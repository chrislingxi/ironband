// 2D 向量 (世界坐标用浮点格子坐标, 非像素)
export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });

export const len = (v: Vec2): number => Math.hypot(v.x, v.y);

export function normalize(v: Vec2): Vec2 {
  const l = len(v);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
}

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });

// 8 向 facing (用于精灵动画方向). 0=E, 逆时针. 角度=atan2(dy,dx)
export function angleToDir8(angleRad: number): number {
  let i = Math.round(angleRad / (Math.PI / 4));
  return ((i % 8) + 8) % 8;
}
