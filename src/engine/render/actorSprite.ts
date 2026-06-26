import { Container, Graphics } from 'pixi.js';

// ── 程序化等距角色精灵 ──
// 用纯 PixiJS Graphics 画一个"有体型"的人形/怪物, 替代 main.ts 的占位圆形.
// 组成: 底部椭圆阴影 + 躯干 + 头 + 朝向尖角. 8 向靠 facing 决定左右翻转与受光明暗,
// 走动时整体上下轻微 bob, 受击 flash 把身体染白. 真实 FLARE/原版精灵接入后可整体替换.

export type ActorKind = 'humanoid' | 'beast' | 'caster';

export interface ActorSpriteOpts {
  kind: ActorKind;
  color: number;   // 主体色 (与数据表 entity.color 对齐)
  size: number;    // 基准半径 (像素), 与 entity.size 对齐
}

export interface ActorUpdate {
  facing: number;    // 朝向弧度 (atan2(dy,dx), 0=E)
  moving: boolean;   // 是否在移动 (驱动 bob)
  attacking: boolean;// 是否在挥击 (躯干前倾)
  flash: number;     // 受击白闪强度 0..1
  timeMs: number;    // 全局毫秒时钟 (驱动动画相位)
}

// 把颜色按 factor 提亮/压暗 (factor<1 变暗, >1 变亮), 用于受光面/背光面.
function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// 把颜色朝白色插值 t (0..1), 用于受击 flash.
function towardWhite(color: number, t: number): number {
  const r = Math.round(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * t);
  const g = Math.round(((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * t);
  const b = Math.round((color & 0xff) + (255 - (color & 0xff)) * t);
  return (r << 16) | (g << 8) | b;
}

export class ActorSprite {
  readonly container = new Container();

  private readonly shadow = new Graphics();   // 底部椭圆投影
  private readonly bodyHolder = new Container(); // 承载躯干+头, 整体做 bob/前倾
  private readonly body = new Graphics();      // 躯干
  private readonly head = new Graphics();      // 头部
  private readonly pointer = new Graphics();   // 朝向尖角 (传达打击方向)

  constructor(private readonly opts: ActorSpriteOpts) {
    this.container.addChild(this.shadow);
    this.container.addChild(this.bodyHolder);
    this.bodyHolder.addChild(this.body);
    this.bodyHolder.addChild(this.head);
    this.container.addChild(this.pointer);
    this.drawStatic();
  }

  // 画与动画无关的静态部件 (阴影/朝向角). 只在构造时画一次.
  private drawStatic(): void {
    const s = this.opts.size;
    this.shadow
      .ellipse(0, s * 0.55, s * 1.05, s * 0.5)
      .fill({ color: 0x000000, alpha: 0.35 });
    // 朝向尖角: 后续靠 container.rotation? 不, 用单独旋转保持躯干不歪.
    this.pointer
      .poly([s + 1, 0, s + 9, -4, s + 9, 4])
      .fill({ color: 0x000000, alpha: 0.5 });
  }

  // 按 kind 画躯干轮廓 (人形=梯形+肩; beast=低矮宽身; caster=带兜帽长袍).
  private drawBody(main: number, lit: number, dark: number): void {
    const s = this.opts.size;
    this.body.clear();
    this.head.clear();
    switch (this.opts.kind) {
      case 'beast': {
        // 低矮宽厚的四足/野兽轮廓
        this.body
          .ellipse(0, 0, s * 1.15, s * 0.85)
          .fill({ color: main })
          .stroke({ color: 0x000000, width: 2 });
        // 背脊高光
        this.body.ellipse(-s * 0.2, -s * 0.3, s * 0.7, s * 0.35).fill({ color: lit, alpha: 0.5 });
        // 头 (前突)
        this.head
          .circle(s * 0.8, -s * 0.1, s * 0.45)
          .fill({ color: dark })
          .stroke({ color: 0x000000, width: 2 });
        break;
      }
      case 'caster': {
        // 长袍: 上窄下宽的钟形 + 兜帽
        this.body
          .moveTo(-s * 0.5, -s * 0.9)
          .lineTo(s * 0.5, -s * 0.9)
          .lineTo(s * 0.95, s * 0.7)
          .lineTo(-s * 0.95, s * 0.7)
          .closePath()
          .fill({ color: main })
          .stroke({ color: 0x000000, width: 2 });
        // 受光侧袍褶
        this.body.poly([0, -s * 0.9, s * 0.5, -s * 0.9, s * 0.95, s * 0.7, 0, s * 0.7])
          .fill({ color: lit, alpha: 0.35 });
        // 兜帽 (暗) + 内部脸 (高光点)
        this.head
          .circle(0, -s * 0.95, s * 0.5)
          .fill({ color: dark })
          .stroke({ color: 0x000000, width: 2 });
        this.head.circle(s * 0.08, -s * 0.9, s * 0.22).fill({ color: lit, alpha: 0.7 });
        break;
      }
      case 'humanoid':
      default: {
        // 躯干: 上窄下宽的梯形 + 肩部圆弧
        this.body
          .moveTo(-s * 0.55, -s * 0.7)
          .lineTo(s * 0.55, -s * 0.7)
          .lineTo(s * 0.7, s * 0.6)
          .lineTo(-s * 0.7, s * 0.6)
          .closePath()
          .fill({ color: main })
          .stroke({ color: 0x000000, width: 2 });
        // 受光半身 (右侧偏亮)
        this.body.poly([0, -s * 0.7, s * 0.55, -s * 0.7, s * 0.7, s * 0.6, 0, s * 0.6])
          .fill({ color: lit, alpha: 0.35 });
        // 背光半身 (左侧偏暗)
        this.body.poly([0, -s * 0.7, -s * 0.55, -s * 0.7, -s * 0.7, s * 0.6, 0, s * 0.6])
          .fill({ color: dark, alpha: 0.3 });
        // 头部
        this.head
          .circle(0, -s * 1.05, s * 0.42)
          .fill({ color: shade(main, 1.05) })
          .stroke({ color: 0x000000, width: 2 });
        this.head.circle(s * 0.12, -s * 1.1, s * 0.18).fill({ color: lit, alpha: 0.5 });
        break;
      }
    }
  }

  // 每帧调用: 更新朝向翻转、明暗、bob、攻击前倾、受击白闪.
  update(u: ActorUpdate): void {
    const { facing, moving, attacking, flash, timeMs } = u;

    // 8 向: 用 cos(facing) 的符号决定整体左右翻转 (朝左镜像).
    const faceLeft = Math.cos(facing) < 0;
    this.bodyHolder.scale.x = faceLeft ? -1 : 1;

    // 受光/背光: 朝向越偏向"上方"(背对光源)越暗, 朝下越亮 (简单顶光近似).
    const lightFactor = 1 + 0.18 * Math.sin(facing); // sin>0 即朝下方, 偏亮
    const base = flash > 0 ? towardWhite(this.opts.color, Math.min(1, flash)) : this.opts.color;
    const main = shade(base, lightFactor);
    const lit = shade(base, 1.4);
    const dark = shade(base, 0.6);
    this.drawBody(main, lit, dark);

    // 走动 bob: 上下小幅正弦; 静止则缓慢呼吸.
    const bob = moving
      ? Math.sin(timeMs / 90) * this.opts.size * 0.12
      : Math.sin(timeMs / 600) * this.opts.size * 0.04;
    this.bodyHolder.position.y = bob;

    // 攻击前倾: 沿朝向方向轻推躯干 (镜像后用本地 x).
    const lunge = attacking ? this.opts.size * 0.35 : 0;
    this.bodyHolder.position.x = (faceLeft ? -lunge : lunge);

    // 朝向尖角: 跟随 facing 旋转 (独立于躯干镜像).
    this.pointer.rotation = facing;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// 简单工厂: 与 new ActorSprite(opts) 等价, 方便 main.ts 一行创建.
export function createActorSprite(opts: ActorSpriteOpts): ActorSprite {
  return new ActorSprite(opts);
}
