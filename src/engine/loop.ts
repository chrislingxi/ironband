// 固定步长游戏循环 (确定性逻辑) + 可变插值渲染.
// 逻辑跑在固定 dt (默认 1/60s), 渲染每帧调用一次.

export type UpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number) => void;

const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.25; // 防止卡顿后追帧爆炸 (spiral of death)

export class GameLoop {
  private acc = 0;
  private last = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private update: UpdateFn,
    private render: RenderFn,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now() / 1000;
    const tick = () => {
      if (!this.running) return;
      const now = performance.now() / 1000;
      let frame = now - this.last;
      this.last = now;
      if (frame > MAX_FRAME) frame = MAX_FRAME;
      this.acc += frame;
      while (this.acc >= FIXED_DT) {
        this.update(FIXED_DT);
        this.acc -= FIXED_DT;
      }
      this.render(this.acc / FIXED_DT);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
