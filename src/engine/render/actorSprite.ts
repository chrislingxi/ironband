import { Container, Graphics, Sprite } from 'pixi.js';
import { tryLoadTexture } from '@game/assets/loader.ts';

// ── 程序化等距角色精灵 (Q版/Chibi 升级) ──
// 用纯 PixiJS Graphics 画"Q版"风格人形/怪物: 大头(1:2.5 头身比), 粗描边, 班底色彩.
// 三职业有各自独特轮廓 (野蛮人=宽肩大剑, 亚马逊=细长弓, 法师=尖帽法袍).
// 怪物按类型分色 (堕落=橙红, 骷髅=灰蓝, 僵尸=病绿, 等).

export type ActorKind = 'humanoid' | 'beast' | 'caster';

// 可选 subKind 细分职业/怪物外观
export type ActorSubKind =
  | 'barbarian' | 'amazon' | 'sorceress'   // 玩家职业
  | 'fallen' | 'skeleton' | 'zombie' | 'hound' | 'brute' | 'spitter' | 'andariel' | 'duriel' // 怪物
  | undefined;

export interface ActorSpriteOpts {
  kind: ActorKind;
  color: number;      // 主体色 (与数据表 entity.color 对齐)
  size: number;       // 基准半径 (像素), 与 entity.size 对齐
  subKind?: ActorSubKind;
  /** 可选贴图 key (如 'char/barbarian'): 命中 assets/<key>.png 即用真图覆盖矢量, 缺失回退。 */
  textureKey?: string;
}

export interface ActorUpdate {
  facing: number;     // 朝向弧度 (atan2(dy,dx), 0=E)
  moving: boolean;    // 是否在移动 (驱动 bob)
  attacking: boolean; // 是否在挥击 (躯干前倾)
  flash: number;      // 受击白闪强度 0..1
  timeMs: number;     // 全局毫秒时钟 (驱动动画相位)
}

// 按 factor 提亮/压暗
function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// 朝白色插值 t (0..1)
function towardWhite(color: number, t: number): number {
  const r = Math.round(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * t);
  const g = Math.round(((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * t);
  const b = Math.round((color & 0xff) + (255 - (color & 0xff)) * t);
  return (r << 16) | (g << 8) | b;
}

export class ActorSprite {
  readonly container = new Container();

  private readonly shadow = new Graphics();       // 底部椭圆投影
  private readonly bodyHolder = new Container();  // 承载躯干+头, 整体做 bob/前倾
  private readonly body = new Graphics();         // 躯干
  private readonly head = new Graphics();         // 头部
  private readonly accessory = new Graphics();    // 职业/怪物特征件 (武器/帽/弓)
  private readonly pointer = new Graphics();      // 朝向尖角
  private sprite?: Sprite;        // 命中真图时的精灵 (替代矢量)
  private usingTexture = false;   // 是否已切换到真图渲染

  constructor(private readonly opts: ActorSpriteOpts) {
    this.container.addChild(this.shadow);
    this.container.addChild(this.bodyHolder);
    this.bodyHolder.addChild(this.body);
    this.bodyHolder.addChild(this.accessory);
    this.bodyHolder.addChild(this.head);
    this.container.addChild(this.pointer);
    this.drawStatic();
    if (this.opts.textureKey) void this.loadTexture(this.opts.textureKey);
  }

  // 异步加载真图: 命中则切到精灵渲染并隐藏矢量; 缺失静默保持矢量。
  private async loadTexture(key: string): Promise<void> {
    const tex = await tryLoadTexture(key);
    if (!tex) return; // 没这张图 → 维持程序化绘制
    const s = this.opts.size;
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, 0.82); // 脚部近底
    const targetH = s * 2.6;  // 与矢量身高相称
    sp.scale.set(targetH / tex.height);
    this.bodyHolder.addChildAt(sp, 0);
    this.sprite = sp;
    this.usingTexture = true;
    // 隐藏矢量部件 (保留 shadow/bodyHolder 容器以复用 bob/翻转/前倾)
    this.body.visible = false;
    this.head.visible = false;
    this.accessory.visible = false;
    this.pointer.visible = false;
  }

  private drawStatic(): void {
    const s = this.opts.size;
    // 更大、更柔和的阴影 (Q版特征)
    this.shadow
      .ellipse(0, s * 0.6, s * 1.1, s * 0.45)
      .fill({ color: 0x000000, alpha: 0.3 });
    // 朝向尖角
    this.pointer
      .poly([s + 1, 0, s + 9, -4, s + 9, 4])
      .fill({ color: 0x000000, alpha: 0.5 });
  }

  private drawBody(main: number, lit: number, dark: number): void {
    const s = this.opts.size;
    this.body.clear();
    this.head.clear();
    this.accessory.clear();

    const sub = this.opts.subKind;

    // ── 按 subKind 画各职业/怪物 ──
    if (sub === 'barbarian') {
      this.drawBarbarian(s, main, lit, dark);
    } else if (sub === 'amazon') {
      this.drawAmazon(s, main, lit, dark);
    } else if (sub === 'sorceress') {
      this.drawSorceress(s, main, lit, dark);
    } else if (sub === 'fallen') {
      this.drawFallen(s, main, lit, dark);
    } else if (sub === 'skeleton') {
      this.drawSkeleton(s, main, lit, dark);
    } else if (sub === 'zombie') {
      this.drawZombie(s, main, lit, dark);
    } else if (sub === 'andariel') {
      this.drawAndariel(s, main, lit, dark);
    } else if (sub === 'duriel') {
      this.drawDuriel(s, main, lit, dark);
    } else if (sub === 'hound') {
      this.drawHound(s, main, lit, dark);
    } else if (sub === 'brute') {
      this.drawBrute(s, main, lit, dark);
    } else if (sub === 'spitter') {
      this.drawSpitter(s, main, lit, dark);
    } else {
      // fallback: 通用人形/野兽/施法者
      this.drawGeneric(s, main, lit, dark);
    }
  }

  // ── 野蛮人: 宽肩 + 大剑 + 尖发 ──
  private drawBarbarian(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x1a0800;
    // 躯干: 超宽梯形 (比普通宽 40%)
    this.body
      .moveTo(-s * 0.75, -s * 0.6)
      .lineTo(s * 0.75, -s * 0.6)
      .lineTo(s * 0.85, s * 0.55)
      .lineTo(-s * 0.85, s * 0.55)
      .closePath()
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 3 });
    // 受光半身
    this.body.poly([0, -s * 0.6, s * 0.75, -s * 0.6, s * 0.85, s * 0.55, 0, s * 0.55])
      .fill({ color: lit, alpha: 0.3 });
    // 肩甲 (两个突出方块)
    this.body.rect(-s * 0.9, -s * 0.7, s * 0.3, s * 0.3).fill({ color: shade(main, 0.7) }).stroke({ color: OUTLINE, width: 2 });
    this.body.rect(s * 0.6, -s * 0.7, s * 0.3, s * 0.3).fill({ color: shade(main, 0.7) }).stroke({ color: OUTLINE, width: 2 });

    // 大剑 (背部, 右侧)
    this.accessory
      .rect(s * 0.55, -s * 1.5, s * 0.22, s * 1.8)
      .fill({ color: 0x8090a0 })
      .stroke({ color: OUTLINE, width: 2 });
    // 剑护手
    this.accessory.rect(s * 0.4, -s * 0.55, s * 0.5, s * 0.14).fill({ color: 0x6a4a20 }).stroke({ color: OUTLINE, width: 1 });

    // Q版大头 (1:2.5比例)
    this.head
      .circle(0, -s * 1.05, s * 0.52)
      .fill({ color: shade(main, 1.08) })
      .stroke({ color: OUTLINE, width: 3 });
    // 脸光: 高光点
    this.head.circle(s * 0.1, -s * 1.12, s * 0.18).fill({ color: lit, alpha: 0.6 });
    // 尖刺发型 (3根尖角)
    for (let i = -1; i <= 1; i++) {
      this.head
        .poly([
          i * s * 0.28 - s * 0.14, -s * 1.52,
          i * s * 0.28, -s * 1.85,
          i * s * 0.28 + s * 0.14, -s * 1.52,
        ])
        .fill({ color: dark })
        .stroke({ color: OUTLINE, width: 2 });
    }
    // 眼睛 (凶悍)
    this.head.circle(-s * 0.15, -s * 1.08, s * 0.07).fill({ color: 0xff2200 });
    this.head.circle(s * 0.15, -s * 1.08, s * 0.07).fill({ color: 0xff2200 });
  }

  // ── 亚马逊: 细长 + 弓 + 马尾 ──
  private drawAmazon(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x1a0800;
    // 躯干: 修长梯形 (高10%身材)
    this.body
      .moveTo(-s * 0.48, -s * 0.72)
      .lineTo(s * 0.48, -s * 0.72)
      .lineTo(s * 0.58, s * 0.62)
      .lineTo(-s * 0.58, s * 0.62)
      .closePath()
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 3 });
    // 皮甲高光
    this.body.poly([0, -s * 0.72, s * 0.48, -s * 0.72, s * 0.58, s * 0.62, 0, s * 0.62])
      .fill({ color: lit, alpha: 0.25 });
    // 绿色腰带
    this.body.rect(-s * 0.58, s * 0.05, s * 1.16, s * 0.2).fill({ color: 0x3a6a2a }).stroke({ color: OUTLINE, width: 1 });

    // 弓 (背后, 左侧弧形)
    this.accessory
      .arc(-s * 0.75, -s * 0.4, s * 0.55, -0.6, 0.6)
      .stroke({ color: 0x6b4a1a, width: 3 })
      .moveTo(-s * 0.55, -s * 0.7)
      .lineTo(-s * 0.55, s * 0.0)
      .stroke({ color: 0xc0b090, width: 1.5 }); // 弓弦

    // Q版大头
    this.head
      .circle(0, -s * 1.02, s * 0.48)
      .fill({ color: shade(main, 1.06) })
      .stroke({ color: OUTLINE, width: 3 });
    this.head.circle(s * 0.1, -s * 1.08, s * 0.16).fill({ color: lit, alpha: 0.55 });
    // 马尾 (向后甩)
    this.head
      .moveTo(s * 0.3, -s * 1.35)
      .bezierCurveTo(s * 0.7, -s * 1.0, s * 0.8, -s * 0.5, s * 0.5, -s * 0.2)
      .stroke({ color: dark, width: 4 });
    // 发箍
    this.head.rect(-s * 0.25, -s * 1.45, s * 0.5, s * 0.1).fill({ color: 0x4a8a3a }).stroke({ color: OUTLINE, width: 1 });
    // 眼睛 (细长优雅)
    this.head.rect(-s * 0.22, -s * 1.06, s * 0.12, s * 0.055).fill({ color: 0x1a0a00 });
    this.head.rect(s * 0.1, -s * 1.06, s * 0.12, s * 0.055).fill({ color: 0x1a0a00 });
  }

  // ── 法师: 尖帽 + 法袍 + 法球 ──
  private drawSorceress(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x0a0020;
    // 法袍: 上窄下宽钟形 (夸张)
    this.body
      .moveTo(-s * 0.42, -s * 0.8)
      .lineTo(s * 0.42, -s * 0.8)
      .lineTo(s * 1.05, s * 0.65)
      .lineTo(-s * 1.05, s * 0.65)
      .closePath()
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 3 });
    // 袍子受光半身
    this.body.poly([0, -s * 0.8, s * 0.42, -s * 0.8, s * 1.05, s * 0.65, 0, s * 0.65])
      .fill({ color: lit, alpha: 0.3 });
    // 袍边装饰线
    this.body.moveTo(-s * 1.05, s * 0.65).lineTo(-s * 0.42, -s * 0.8).stroke({ color: shade(main, 1.3), width: 2 });
    this.body.moveTo(s * 1.05, s * 0.65).lineTo(s * 0.42, -s * 0.8).stroke({ color: shade(main, 1.3), width: 2 });

    // 法球 (漂浮, 右手)
    const orbColor = 0x40ddff;
    this.accessory
      .circle(s * 0.85, -s * 0.5, s * 0.28)
      .fill({ color: orbColor, alpha: 0.85 })
      .stroke({ color: 0xffffff, width: 2 });
    // 法球高光
    this.accessory.circle(s * 0.75, -s * 0.6, s * 0.1).fill({ color: 0xffffff, alpha: 0.7 });
    // 法杖主体
    this.accessory.moveTo(s * 0.6, -s * 0.3).lineTo(s * 0.85, -s * 0.5).stroke({ color: 0x6a4a1a, width: 4 });

    // Q版大头
    this.head
      .circle(0, -s * 1.0, s * 0.46)
      .fill({ color: shade(main, 1.1) })
      .stroke({ color: OUTLINE, width: 3 });
    this.head.circle(s * 0.08, -s * 1.06, s * 0.15).fill({ color: lit, alpha: 0.5 });
    // 尖帽
    this.head
      .poly([
        -s * 0.52, -s * 1.35,
        0, -s * 2.1,
        s * 0.52, -s * 1.35,
      ])
      .fill({ color: dark })
      .stroke({ color: OUTLINE, width: 3 });
    // 帽子帽沿
    this.head.ellipse(0, -s * 1.38, s * 0.6, s * 0.14).fill({ color: shade(dark, 1.2) }).stroke({ color: OUTLINE, width: 2 });
    // 魔法眼睛 (发光)
    this.head.circle(-s * 0.14, -s * 1.04, s * 0.065).fill({ color: 0x80ffff });
    this.head.circle(s * 0.14, -s * 1.04, s * 0.065).fill({ color: 0x80ffff });
  }

  // ── 堕落者: 小矮人, 橙红 ──
  private drawFallen(s: number, main: number, _lit: number, dark: number): void {
    const OUTLINE = 0x2a0000;
    // 矮胖躯干
    this.body
      .ellipse(0, 0, s * 0.8, s * 0.65)
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 2 });
    // 大耳朵
    this.accessory.ellipse(-s * 0.7, -s * 0.4, s * 0.2, s * 0.32).fill({ color: dark }).stroke({ color: OUTLINE, width: 2 });
    this.accessory.ellipse(s * 0.7, -s * 0.4, s * 0.2, s * 0.32).fill({ color: dark }).stroke({ color: OUTLINE, width: 2 });
    // 大头
    this.head
      .circle(0, -s * 0.78, s * 0.55)
      .fill({ color: shade(main, 0.9) })
      .stroke({ color: OUTLINE, width: 2 });
    // 黄眼睛 (惊吓状)
    this.head.circle(-s * 0.17, -s * 0.82, s * 0.1).fill({ color: 0xffcc00 });
    this.head.circle(s * 0.17, -s * 0.82, s * 0.1).fill({ color: 0xffcc00 });
    // 小刀
    this.accessory.poly([s * 0.7, -s * 0.2, s * 0.9, -s * 0.5, s * 0.8, -s * 0.15]).fill({ color: 0xaaaaaa }).stroke({ color: OUTLINE, width: 1 });
  }

  // ── 骷髅: 灰蓝 ──
  private drawSkeleton(s: number, main: number, lit: number, _dark: number): void {
    const OUTLINE = 0x080818;
    // 骨头躯干 (细长)
    this.body
      .moveTo(-s * 0.35, -s * 0.65)
      .lineTo(s * 0.35, -s * 0.65)
      .lineTo(s * 0.32, s * 0.55)
      .lineTo(-s * 0.32, s * 0.55)
      .closePath()
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 2 });
    // 肋骨线条
    for (let i = 0; i < 3; i++) {
      const y = -s * 0.4 + i * s * 0.28;
      this.body.moveTo(-s * 0.32, y).lineTo(s * 0.32, y).stroke({ color: lit, width: 1.5 });
    }
    // 锈蚀剑
    this.accessory.rect(s * 0.3, -s * 0.8, s * 0.14, s * 1.1).fill({ color: 0x607080 }).stroke({ color: OUTLINE, width: 2 });

    // 骷髅头
    this.head
      .circle(0, -s * 0.95, s * 0.48)
      .fill({ color: shade(main, 1.1) })
      .stroke({ color: OUTLINE, width: 2 });
    // 空洞眼睛 (黑洞)
    this.head.circle(-s * 0.16, -s * 0.98, s * 0.1).fill({ color: 0x000000 });
    this.head.circle(s * 0.16, -s * 0.98, s * 0.1).fill({ color: 0x000000 });
    // 牙齿
    for (let i = -1; i <= 1; i++) {
      this.head.rect(i * s * 0.12 - s * 0.05, -s * 0.72, s * 0.09, s * 0.12).fill({ color: lit });
    }
  }

  // ── 僵尸: 病绿 ──
  private drawZombie(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x0a1a08;
    // 臃肿躯干
    this.body
      .ellipse(s * 0.1, 0, s * 0.85, s * 0.75)
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 2 });
    // 腐烂斑点
    this.body.circle(-s * 0.2, -s * 0.1, s * 0.15).fill({ color: dark, alpha: 0.6 });
    this.body.circle(s * 0.3, s * 0.2, s * 0.12).fill({ color: dark, alpha: 0.6 });
    // 伸出的手臂
    this.accessory
      .moveTo(s * 0.7, -s * 0.3)
      .lineTo(s * 1.2, -s * 0.6)
      .stroke({ color: main, width: s * 0.25 });
    this.accessory.circle(s * 1.2, -s * 0.6, s * 0.15).fill({ color: shade(main, 0.8) }).stroke({ color: OUTLINE, width: 2 });

    // 大头
    this.head
      .circle(0, -s * 0.88, s * 0.5)
      .fill({ color: shade(main, 0.9) })
      .stroke({ color: OUTLINE, width: 2 });
    this.head.circle(s * 0.1, -s * 0.92, s * 0.16).fill({ color: lit, alpha: 0.3 });
    // 腐烂眼睛 (红)
    this.head.circle(-s * 0.15, -s * 0.92, s * 0.09).fill({ color: 0xcc2200 });
    this.head.circle(s * 0.15, -s * 0.92, s * 0.09).fill({ color: 0xcc2200 });
  }

  // ── 恶犬: 四足低伏 + 獠牙 ──
  private drawHound(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x1a0e06;
    // 四条腿
    for (const lx of [-0.55, -0.2, 0.2, 0.55]) {
      this.body.rect(lx * s, s * 0.25, s * 0.14, s * 0.5).fill({ color: dark }).stroke({ color: OUTLINE, width: 1.5 });
    }
    // 横长躯干
    this.body.ellipse(0, -s * 0.05, s * 0.95, s * 0.5).fill({ color: main }).stroke({ color: OUTLINE, width: 2.5 });
    this.body.ellipse(-s * 0.2, -s * 0.2, s * 0.5, s * 0.22).fill({ color: lit, alpha: 0.4 });
    // 鬃毛脊
    this.body.poly([-s * 0.5, -s * 0.45, -s * 0.2, -s * 0.7, 0.1 * s, -s * 0.45]).fill({ color: dark });
    // 前伸犬头
    this.head.ellipse(s * 0.85, -s * 0.15, s * 0.42, s * 0.32).fill({ color: shade(main, 1.05) }).stroke({ color: OUTLINE, width: 2 });
    this.head.poly([s * 1.15, -s * 0.05, s * 1.4, -s * 0.12, s * 1.15, -s * 0.28]).fill({ color: shade(main, 0.85) }); // 吻部
    this.head.circle(s * 0.95, -s * 0.28, s * 0.08).fill({ color: 0xffaa20 }); // 凶目
    this.head.poly([s * 1.18, s * 0.02, s * 1.24, s * 0.12, s * 1.1, s * 0.08]).fill({ color: 0xf0ece0 }); // 獠牙
  }

  // ── 蛮兽: 魁梧巨汉 + 重拳 ──
  private drawBrute(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x140a06;
    // 厚重躯干 (梯形)
    this.body.moveTo(-s * 0.7, -s * 0.7).lineTo(s * 0.7, -s * 0.7).lineTo(s * 0.85, s * 0.5).lineTo(-s * 0.85, s * 0.5).closePath()
      .fill({ color: main }).stroke({ color: OUTLINE, width: 3 });
    this.body.poly([-s * 0.7, -s * 0.7, 0, -s * 0.7, 0, s * 0.5, -s * 0.85, s * 0.5]).fill({ color: lit, alpha: 0.28 });
    // 腰带
    this.body.rect(-s * 0.82, s * 0.2, s * 1.64, s * 0.2).fill({ color: dark }).stroke({ color: OUTLINE, width: 2 });
    // 巨拳 (两侧)
    for (const dir of [-1, 1]) {
      this.accessory.circle(dir * s * 1.0, s * 0.15, s * 0.34).fill({ color: shade(main, 0.85) }).stroke({ color: OUTLINE, width: 2.5 });
    }
    // 小头缩肩
    this.head.circle(0, -s * 0.78, s * 0.4).fill({ color: shade(main, 1.05) }).stroke({ color: OUTLINE, width: 2.5 });
    this.head.circle(-s * 0.14, -s * 0.8, s * 0.07).fill({ color: 0x301810 });
    this.head.circle(s * 0.14, -s * 0.8, s * 0.07).fill({ color: 0x301810 });
    this.head.moveTo(-s * 0.2, -s * 0.62).lineTo(s * 0.2, -s * 0.62).stroke({ color: OUTLINE, width: 2 }); // 怒口
  }

  // ── 吐酸怪: 蹲伏蟾形 + 鼓囊毒囊 ──
  private drawSpitter(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x0c1a06;
    // 宽扁蟾身
    this.body.ellipse(0, s * 0.1, s * 1.05, s * 0.7).fill({ color: main }).stroke({ color: OUTLINE, width: 2.5 });
    // 浅色腹部
    this.body.ellipse(0, s * 0.32, s * 0.7, s * 0.4).fill({ color: lit, alpha: 0.45 });
    // 背部毒疣
    for (const [px, py] of [[-0.4, -0.25], [0.1, -0.4], [0.5, -0.18]]) {
      this.body.circle(px * s, py * s, s * 0.14).fill({ color: shade(main, 1.2) }).stroke({ color: OUTLINE, width: 1.5 });
    }
    // 蹲腿
    this.body.poly([-s * 0.9, s * 0.4, -s * 1.15, s * 0.7, -s * 0.6, s * 0.6]).fill({ color: dark });
    this.body.poly([s * 0.9, s * 0.4, s * 1.15, s * 0.7, s * 0.6, s * 0.6]).fill({ color: dark });
    // 阔嘴大头
    this.head.ellipse(0, -s * 0.5, s * 0.6, s * 0.45).fill({ color: shade(main, 1.05) }).stroke({ color: OUTLINE, width: 2.5 });
    this.head.moveTo(-s * 0.45, -s * 0.45).lineTo(s * 0.45, -s * 0.45).stroke({ color: OUTLINE, width: 2.5 }); // 阔嘴
    this.head.circle(-s * 0.22, -s * 0.7, s * 0.12).fill({ color: 0xbaff5a }).stroke({ color: OUTLINE, width: 1.5 }); // 凸眼
    this.head.circle(s * 0.22, -s * 0.7, s * 0.12).fill({ color: 0xbaff5a }).stroke({ color: OUTLINE, width: 1.5 });
  }

  // ── 安达莉尔 Boss ──
  private drawAndariel(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x1a001a;
    // 大型蜘蛛下身
    this.body
      .ellipse(0, s * 0.3, s * 1.2, s * 0.9)
      .fill({ color: dark })
      .stroke({ color: OUTLINE, width: 3 });
    // 上身 (女性形态)
    this.body
      .moveTo(-s * 0.65, -s * 0.7)
      .lineTo(s * 0.65, -s * 0.7)
      .lineTo(s * 0.75, s * 0.3)
      .lineTo(-s * 0.75, s * 0.3)
      .closePath()
      .fill({ color: main })
      .stroke({ color: OUTLINE, width: 3 });
    // 毒腺高光
    this.body.circle(0, s * 0.4, s * 0.35).fill({ color: 0x60d040, alpha: 0.6 });

    // 触角/爪子 (4根)
    for (let i = 0; i < 4; i++) {
      const angle = (-0.6 + i * 0.4) * Math.PI;
      const x1 = Math.cos(angle) * s * 0.7, y1 = Math.sin(angle) * s * 0.4 + s * 0.2;
      const x2 = Math.cos(angle) * s * 1.5, y2 = Math.sin(angle) * s * 0.6 + s * 0.2;
      this.accessory.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: dark, width: 3 });
      this.accessory.circle(x2, y2, s * 0.1).fill({ color: 0x80ff40 });
    }

    // 大头 (皇冠)
    this.head
      .circle(0, -s * 1.1, s * 0.6)
      .fill({ color: shade(main, 1.1) })
      .stroke({ color: OUTLINE, width: 3 });
    this.head.circle(s * 0.1, -s * 1.18, s * 0.2).fill({ color: lit, alpha: 0.5 });
    // 皇冠
    this.head
      .poly([-s * 0.4, -s * 1.65, -s * 0.2, -s * 1.85, 0, -s * 1.65, s * 0.2, -s * 1.85, s * 0.4, -s * 1.65])
      .fill({ color: 0xffd700 })
      .stroke({ color: OUTLINE, width: 2 });
    // 恶魔眼睛
    this.head.circle(-s * 0.2, -s * 1.14, s * 0.1).fill({ color: 0xff0080 });
    this.head.circle(s * 0.2, -s * 1.14, s * 0.1).fill({ color: 0xff0080 });
  }

  // ── 督瑞尔: 矮壮蛆形痛苦之王 (寒冷苍白 + 巨颚 + 短角 + 钳爪) ──
  private drawDuriel(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x0a1420;
    // 臃肿蛆形下身 (分节)
    this.body.ellipse(0, s * 0.45, s * 1.35, s * 0.95).fill({ color: dark }).stroke({ color: OUTLINE, width: 3 });
    for (let i = -1; i <= 1; i++) {
      this.body.ellipse(i * s * 0.55, s * 0.6, s * 0.32, s * 0.5).fill({ color: shade(main, 0.85), alpha: 0.5 });
    }
    // 厚实上身
    this.body
      .moveTo(-s * 0.8, -s * 0.55).lineTo(s * 0.8, -s * 0.55)
      .lineTo(s * 1.0, s * 0.35).lineTo(-s * 1.0, s * 0.35).closePath()
      .fill({ color: main }).stroke({ color: OUTLINE, width: 3 });
    // 受光面 (苍白寒光)
    this.body.ellipse(-s * 0.25, -s * 0.2, s * 0.6, s * 0.4).fill({ color: towardWhite(lit, 0.5), alpha: 0.45 });

    // 短粗钳爪 (两侧各一)
    for (const dir of [-1, 1]) {
      const bx = dir * s * 0.9;
      this.accessory.moveTo(dir * s * 0.7, -s * 0.2).lineTo(bx, s * 0.1).stroke({ color: dark, width: 5 });
      this.accessory.poly([bx, s * 0.1, bx + dir * s * 0.32, s * 0.0, bx + dir * s * 0.18, s * 0.28])
        .fill({ color: shade(main, 1.1) }).stroke({ color: OUTLINE, width: 2 });
    }

    // 大头 (与身一体感, 低伏)
    this.head.circle(0, -s * 0.95, s * 0.62).fill({ color: shade(main, 1.05) }).stroke({ color: OUTLINE, width: 3 });
    this.head.ellipse(-s * 0.15, -s * 1.05, s * 0.28, s * 0.18).fill({ color: towardWhite(lit, 0.6), alpha: 0.5 });
    // 一对短角
    this.head.poly([-s * 0.5, -s * 1.3, -s * 0.66, -s * 1.7, -s * 0.3, -s * 1.4]).fill({ color: 0xe8e0d0 }).stroke({ color: OUTLINE, width: 2 });
    this.head.poly([s * 0.5, -s * 1.3, s * 0.66, -s * 1.7, s * 0.3, -s * 1.4]).fill({ color: 0xe8e0d0 }).stroke({ color: OUTLINE, width: 2 });
    // 巨颚 (上下獠牙)
    this.head.poly([-s * 0.4, -s * 0.62, -s * 0.18, -s * 0.32, -s * 0.02, -s * 0.62]).fill({ color: 0xf0ece0 }).stroke({ color: OUTLINE, width: 1.5 });
    this.head.poly([s * 0.4, -s * 0.62, s * 0.18, -s * 0.32, s * 0.02, -s * 0.62]).fill({ color: 0xf0ece0 }).stroke({ color: OUTLINE, width: 1.5 });
    // 冷光眼 (一对)
    this.head.circle(-s * 0.22, -s * 1.0, s * 0.11).fill({ color: 0x8ff0ff });
    this.head.circle(s * 0.22, -s * 1.0, s * 0.11).fill({ color: 0x8ff0ff });
  }

  // ── 通用 fallback ──
  private drawGeneric(s: number, main: number, lit: number, dark: number): void {
    const OUTLINE = 0x000000;
    switch (this.opts.kind) {
      case 'beast': {
        this.body
          .ellipse(0, 0, s * 1.15, s * 0.85)
          .fill({ color: main })
          .stroke({ color: OUTLINE, width: 2 });
        this.body.ellipse(-s * 0.2, -s * 0.3, s * 0.7, s * 0.35).fill({ color: lit, alpha: 0.5 });
        this.head
          .circle(s * 0.8, -s * 0.1, s * 0.45)
          .fill({ color: dark })
          .stroke({ color: OUTLINE, width: 2 });
        break;
      }
      case 'caster': {
        this.body
          .moveTo(-s * 0.5, -s * 0.9)
          .lineTo(s * 0.5, -s * 0.9)
          .lineTo(s * 0.95, s * 0.7)
          .lineTo(-s * 0.95, s * 0.7)
          .closePath()
          .fill({ color: main })
          .stroke({ color: OUTLINE, width: 2 });
        this.body.poly([0, -s * 0.9, s * 0.5, -s * 0.9, s * 0.95, s * 0.7, 0, s * 0.7])
          .fill({ color: lit, alpha: 0.35 });
        this.head
          .circle(0, -s * 0.95, s * 0.5)
          .fill({ color: dark })
          .stroke({ color: OUTLINE, width: 2 });
        this.head.circle(s * 0.08, -s * 0.9, s * 0.22).fill({ color: lit, alpha: 0.7 });
        break;
      }
      case 'humanoid':
      default: {
        // Q版加大头 (1:2.5)
        this.body
          .moveTo(-s * 0.55, -s * 0.62)
          .lineTo(s * 0.55, -s * 0.62)
          .lineTo(s * 0.7, s * 0.55)
          .lineTo(-s * 0.7, s * 0.55)
          .closePath()
          .fill({ color: main })
          .stroke({ color: OUTLINE, width: 2 });
        this.body.poly([0, -s * 0.62, s * 0.55, -s * 0.62, s * 0.7, s * 0.55, 0, s * 0.55])
          .fill({ color: lit, alpha: 0.35 });
        this.body.poly([0, -s * 0.62, -s * 0.55, -s * 0.62, -s * 0.7, s * 0.55, 0, s * 0.55])
          .fill({ color: dark, alpha: 0.3 });
        // 大头 (更圆更大)
        this.head
          .circle(0, -s * 1.08, s * 0.5)
          .fill({ color: shade(main, 1.05) })
          .stroke({ color: OUTLINE, width: 2 });
        this.head.circle(s * 0.12, -s * 1.14, s * 0.2).fill({ color: lit, alpha: 0.5 });
        break;
      }
    }
  }

  update(u: ActorUpdate): void {
    const { facing, moving, attacking, flash, timeMs } = u;

    const faceLeft = Math.cos(facing) < 0;
    this.bodyHolder.scale.x = faceLeft ? -1 : 1;

    if (this.usingTexture) {
      // 真图: 不重绘矢量; 受击轻微提亮 (tint 只能压暗, 故用 alpha 微闪近似)
      if (this.sprite) this.sprite.alpha = flash > 0 ? 0.7 + 0.3 * (1 - Math.min(1, flash)) : 1;
    } else {
      const lightFactor = 1 + 0.18 * Math.sin(facing);
      const base = flash > 0 ? towardWhite(this.opts.color, Math.min(1, flash)) : this.opts.color;
      const main = shade(base, lightFactor);
      const lit = shade(base, 1.45);
      const dark = shade(base, 0.55);
      this.drawBody(main, lit, dark);
    }

    // 走动 bob
    const bob = moving
      ? Math.sin(timeMs / 90) * this.opts.size * 0.12
      : Math.sin(timeMs / 600) * this.opts.size * 0.04;
    this.bodyHolder.position.y = bob;

    // 攻击前倾
    const lunge = attacking ? this.opts.size * 0.35 : 0;
    this.bodyHolder.position.x = (faceLeft ? -lunge : lunge);

    this.pointer.rotation = facing;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

export function createActorSprite(opts: ActorSpriteOpts): ActorSprite {
  return new ActorSprite(opts);
}
