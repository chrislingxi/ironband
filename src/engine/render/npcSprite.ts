import { Container, Graphics } from 'pixi.js';
import type { NpcRole } from '@game/world/npcs.ts';

// 营地 NPC 的 Q 版立绘 (纯 Graphics): 大头长袍小人, 粗描边, 按身份配色 + 主题道具。
// 与 ActorSprite 同语言 (1:2.5 头身比, OUTLINE 描边), 但为静立镇民, 无朝向尖角。

const OUTLINE = 0x1a0800;
const SKIN = 0xe8b890;

// 按角色身份给出 长袍主色 / 头罩(发)色 / 主题道具类型。
interface RoleStyle {
  robe: number;
  hood: number;
  prop: 'orb' | 'bow' | 'hammer' | 'coin' | 'hat' | 'book';
}
const ROLE_STYLE: Record<NpcRole, RoleStyle> = {
  heal: { robe: 0xe8e0d0, hood: 0xc9b86a, prop: 'orb' }, // 阿卡拉 女祭司 白金
  mercenary: { robe: 0xb83a3a, hood: 0x6a1a1a, prop: 'bow' }, // 卡夏 弓队长 红
  vendor: { robe: 0x8a6a3a, hood: 0x4a3420, prop: 'hammer' }, // 查西 铁匠 棕
  gamble: { robe: 0x7a4a9a, hood: 0x3a2050, prop: 'coin' }, // 吉德 赌商 紫
  travel: { robe: 0x3a6a9a, hood: 0x1a3a5a, prop: 'hat' }, // 沃里夫 车队 蓝
  quest: { robe: 0x9a9a8a, hood: 0xb0b0a0, prop: 'book' }, // 凯恩 智者 灰
};

function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

/**
 * 构建一个营地 NPC 立绘 Container (锚定在脚下, 即原圆点位置)。
 * @param role 身份 → 决定配色与道具
 * @param s    基准半径像素 (默认 11, 与原圆点观感相称但更有体量)
 */
export function buildNpcSprite(role: NpcRole, s = 11): Container {
  const st = ROLE_STYLE[role];
  const c = new Container();

  // 投影
  c.addChild(new Graphics().ellipse(0, s * 0.62, s * 1.0, s * 0.4).fill({ color: 0x000000, alpha: 0.32 }));

  // 长袍 (上窄下宽梯形 + 受光面 + 描边)
  const robe = new Graphics();
  robe.poly([-s * 0.42, -s * 0.5, s * 0.42, -s * 0.5, s * 0.7, s * 0.62, -s * 0.7, s * 0.62])
    .fill({ color: st.robe }).stroke({ color: OUTLINE, width: 3 });
  robe.poly([-s * 0.42, -s * 0.5, 0, -s * 0.5, 0, s * 0.62, -s * 0.7, s * 0.62])
    .fill({ color: shade(st.robe, 1.18), alpha: 0.35 });
  // 袍褶
  robe.moveTo(0, -s * 0.4).lineTo(0, s * 0.55).stroke({ color: shade(st.robe, 0.7), width: 1.5 });
  c.addChild(robe);

  // 道具 (在头之前画, 多数置于体侧)
  c.addChild(buildProp(st.prop, s));

  // 头 (大头 Q 版) + 头罩/兜帽
  const head = new Graphics();
  head.circle(0, -s * 0.82, s * 0.5).fill({ color: SKIN }).stroke({ color: OUTLINE, width: 2.5 });
  // 兜帽/头发: 头顶弧盖
  head.arc(0, -s * 0.82, s * 0.54, Math.PI, Math.PI * 2).fill({ color: st.hood }).stroke({ color: OUTLINE, width: 2 });
  // 眼睛 (两点)
  head.circle(-s * 0.16, -s * 0.8, s * 0.07).fill({ color: 0x201010 });
  head.circle(s * 0.16, -s * 0.8, s * 0.07).fill({ color: 0x201010 });
  c.addChild(head);

  return c;
}

// 主题道具: 各身份一件小特征件。
function buildProp(prop: RoleStyle['prop'], s: number): Graphics {
  const g = new Graphics();
  switch (prop) {
    case 'orb': // 发光宝珠 (女祭司)
      g.circle(s * 0.72, -s * 0.2, s * 0.26).fill({ color: 0x9fe8ff, alpha: 0.5 });
      g.circle(s * 0.72, -s * 0.2, s * 0.16).fill({ color: 0xeaffff }).stroke({ color: 0x4aa0c0, width: 1.5 });
      break;
    case 'bow': // 弓 (弓队长)
      g.arc(s * 0.7, -s * 0.05, s * 0.6, -Math.PI * 0.45, Math.PI * 0.45).stroke({ color: 0x6a3a18, width: 3 });
      g.moveTo(s * 0.7 + Math.cos(-Math.PI * 0.45) * s * 0.6, -s * 0.05 + Math.sin(-Math.PI * 0.45) * s * 0.6)
        .lineTo(s * 0.7 + Math.cos(Math.PI * 0.45) * s * 0.6, -s * 0.05 + Math.sin(Math.PI * 0.45) * s * 0.6)
        .stroke({ color: 0xd8d0c0, width: 1 });
      break;
    case 'hammer': // 铁锤 (铁匠)
      g.rect(s * 0.6, -s * 0.5, s * 0.14, s * 0.8).fill({ color: 0x6a4a28 }).stroke({ color: OUTLINE, width: 1.5 });
      g.rect(s * 0.45, -s * 0.6, s * 0.44, s * 0.22).fill({ color: 0x9098a0 }).stroke({ color: OUTLINE, width: 2 });
      break;
    case 'coin': // 金币 (赌商)
      g.circle(s * 0.74, -s * 0.05, s * 0.2).fill({ color: 0xffd24a }).stroke({ color: 0x9a6a10, width: 2 });
      break;
    case 'hat': // 宽檐帽 (车队)
      g.ellipse(0, -s * 1.18, s * 0.62, s * 0.16).fill({ color: 0x2a1810 }).stroke({ color: OUTLINE, width: 2 });
      g.rect(-s * 0.28, -s * 1.5, s * 0.56, s * 0.32).fill({ color: 0x3a2418 }).stroke({ color: OUTLINE, width: 2 });
      break;
    case 'book': // 古卷 (智者)
      g.rect(s * 0.5, -s * 0.15, s * 0.4, s * 0.32).fill({ color: 0xc8b070 }).stroke({ color: OUTLINE, width: 2 });
      g.moveTo(s * 0.7, -s * 0.15).lineTo(s * 0.7, s * 0.17).stroke({ color: 0x8a6a30, width: 1.5 });
      break;
  }
  return g;
}
