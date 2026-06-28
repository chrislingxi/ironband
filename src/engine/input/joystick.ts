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

  // 可视化: 按下处生成底环 + 跟手摇杆头 (浮动摇杆手感地基, 原本零反馈)
  private base?: HTMLDivElement;
  private thumb?: HTMLDivElement;

  constructor(el: HTMLElement) {
    el.addEventListener('pointerdown', this.onDown, { passive: false });
    el.addEventListener('pointermove', this.onMove, { passive: false });
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    this.buildVisual(el);
  }

  private buildVisual(parent: HTMLElement) {
    const mk = (css: string) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;display:none;pointer-events:none;transform:translate(-50%,-50%);' + css;
      parent.appendChild(d);
      return d;
    };
    this.base = mk(`width:${this.radius * 2}px;height:${this.radius * 2}px;border-radius:50%;z-index:30;`
      + 'border:2px solid rgba(199,148,51,.45);background:radial-gradient(circle,rgba(255,255,255,.06),rgba(0,0,0,.22));box-shadow:0 0 16px #00000050;');
    this.thumb = mk('width:54px;height:54px;border-radius:50%;z-index:31;'
      + 'border:2px solid #e7c66a;background:radial-gradient(circle at 40% 35%,#6a5d40,#1a140a);box-shadow:0 3px 10px #000b,inset 0 2px 4px #ffffff22;');
  }

  private updateVisual() {
    if (!this.base || !this.thumb) return;
    if (!this.active) { this.base.style.display = 'none'; this.thumb.style.display = 'none'; return; }
    this.base.style.left = `${this.originX}px`; this.base.style.top = `${this.originY}px`; this.base.style.display = 'block';
    const dx = this.curX - this.originX, dy = this.curY - this.originY;
    const mag = Math.hypot(dx, dy), k = mag > this.radius ? this.radius / mag : 1;
    this.thumb.style.left = `${this.originX + dx * k}px`; this.thumb.style.top = `${this.originY + dy * k}px`; this.thumb.style.display = 'block';
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
    this.updateVisual();
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.curX = e.clientX;
    this.curY = e.clientY;
    this.recompute();
    this.updateVisual();
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
    this.vector = { x: 0, y: 0 };
    this.strength = 0;
    this.updateVisual();
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
