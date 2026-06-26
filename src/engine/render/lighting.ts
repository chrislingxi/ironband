import { Application, Container, Graphics, FillGradient } from 'pixi.js';

// ── 全屏光照 / 暗角遮罩 ──
// 在 app.stage 顶层叠一个屏幕空间的暗角层: 玩家周围亮、四周渐暗,
// 强化哥特地牢氛围 (类似 D2 的可视半径). 用 PixiJS v8 的径向 FillGradient.
// 注意: 本层加在 stage 顶层、不进 world, 因此不随相机平移 (始终覆盖整屏).

export class Lighting {
  readonly container = new Container();
  private readonly mask = new Graphics();

  // 当前光照参数 (resize 时需要重画, 故缓存)
  private cx = 0;
  private cy = 0;
  private radius = 320;

  constructor(private readonly app: Application) {
    this.container.addChild(this.mask);
    // 顶层叠加; 不接收交互, 避免吞掉摇杆/点击.
    this.container.eventMode = 'none';
    this.app.stage.addChild(this.container);
    // 初始居中
    this.cx = this.app.renderer.width / 2;
    this.cy = this.app.renderer.height / 2;
    this.redraw();
  }

  // 重画径向渐变暗角: 中心透明 → 边缘近全黑.
  private redraw(): void {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    // 渐变需覆盖到屏幕最远角, 半径取对角线一半保证四角全暗.
    const outer = Math.hypot(w, h);

    const grad = new FillGradient({
      type: 'radial',
      center: { x: this.cx, y: this.cy },
      innerRadius: 0,
      outerCenter: { x: this.cx, y: this.cy },
      outerRadius: outer,
      // 用全局坐标空间, 渐变中心跟随 cx/cy 像素.
      textureSpace: 'global',
      colorStops: [
        { offset: 0, color: 'rgba(0,0,0,0)' },                  // 玩家脚下: 全亮
        { offset: clamp01(this.radius / outer), color: 'rgba(0,0,0,0)' }, // 亮圈边界
        { offset: clamp01((this.radius * 1.6) / outer), color: 'rgba(12,8,18,0.55)' }, // 过渡
        { offset: 1, color: 'rgba(4,2,8,0.92)' },               // 屏幕边缘: 近全黑
      ],
    });

    this.mask.clear();
    this.mask.rect(0, 0, w, h).fill(grad);
  }

  // 窗口尺寸变化后调用 (renderer 已 resize). 重新铺满并重画渐变.
  resize(): void {
    // 默认把光心拉回屏幕中心, 调用方下一帧会用 update 再修正.
    this.cx = this.app.renderer.width / 2;
    this.cy = this.app.renderer.height / 2;
    this.redraw();
  }

  // 每帧调用: centerX/Y 为光心屏幕像素 (通常屏幕中心/玩家屏幕位置), radiusPx 为亮圈半径.
  update(centerX: number, centerY: number, radiusPx: number): void {
    // 仅在参数有明显变化时重画, 省开销.
    if (
      Math.abs(centerX - this.cx) < 0.5 &&
      Math.abs(centerY - this.cy) < 0.5 &&
      Math.abs(radiusPx - this.radius) < 0.5
    ) {
      return;
    }
    this.cx = centerX;
    this.cy = centerY;
    this.radius = Math.max(40, radiusPx);
    this.redraw();
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
