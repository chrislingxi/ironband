import type { Vec2 } from '../math/vec.ts';
import { normalize } from '../math/vec.ts';

// 浮动虚拟摇杆 (左半屏按下即生成). 输出归一化方向 + 强度.
// 渲染由 UI 层负责; 本类只管输入状态 (契约: vector / active).
export class Joystick {
  private originX = 0;
  private originY = 0;
  private curX = 0;
  private curY = 0;
  private pointerId: number | null = null;
  private readonly radius = 60;

  active = false;
  vector: Vec2 = { x: 0, y: 0 };
  strength = 0;

  constructor(el: HTMLElement) {
    el.addEventListener('pointerdown', this.onDown, { passive: false });
    el.addEventListener('pointermove', this.onMove, { passive: false });
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
  }

  // 左半屏触发移动摇杆 (右半屏留给技能/瞄准).
  private onDown = (e: PointerEvent) => {
    if (this.pointerId !== null) return;
    if (e.clientX > window.innerWidth * 0.5) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.originX = this.curX = e.clientX;
    this.originY = this.curY = e.clientY;
    this.active = true;
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.curX = e.clientX;
    this.curY = e.clientY;
    this.recompute();
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
    this.vector = { x: 0, y: 0 };
    this.strength = 0;
  };

  private recompute() {
    const dx = this.curX - this.originX;
    const dy = this.curY - this.originY;
    const mag = Math.hypot(dx, dy);
    this.strength = Math.min(1, mag / this.radius);
    this.vector = mag > 1e-3 ? normalize({ x: dx, y: dy }) : { x: 0, y: 0 };
  }

  // 屏幕方向 → 世界格子方向 (等距: 上=-y-x, 需反投影). 这里给出屏幕→世界基向量.
  get position() {
    return { ox: this.originX, oy: this.originY, cx: this.curX, cy: this.curY };
  }
}
