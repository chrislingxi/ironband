import { Application, Container, Graphics, Text, type Texture } from 'pixi.js';
import { tryLoadTexture } from '@game/assets/loader.ts';
import { IsoScene } from '@engine/render/IsoScene.ts';
import { GameLoop } from '@engine/loop.ts';
import { Joystick } from '@engine/input/joystick.ts';
import { gridToScreen, screenToGrid, depthKey } from '@engine/math/iso.ts';
import { normalize } from '@engine/math/vec.ts';
import { mulberry32 } from '@engine/math/rng.ts';
import { buildGround } from '@engine/render/groundTiles.ts';
import { createActorSprite, type ActorSprite, type ActorKind, type ActorSubKind } from '@engine/render/actorSprite.ts';
import { buildNpcSprite } from '@engine/render/npcSprite.ts';
import { Lighting } from '@engine/render/lighting.ts';
import { Game } from '@game/sim/Game.ts';
import type { Entity } from '@game/entities/entity.ts';
import { HUD } from '@game/ui/hud.ts';
import { InventoryPanel } from '@game/ui/inventory.ts';
import { SkillTreePanel } from '@game/ui/skilltree.ts';
import { NPCS, type NpcRole } from '@game/world/npcs.ts';
import { AREAS } from '@game/world/act1.ts';
import { TitleScreen, type BootChoice } from '@game/ui/titlescreen.ts';
import { QuestLogPanel } from '@game/ui/questlog.ts';
import { maybeShowTutorial, showTutorial } from '@game/ui/tutorial.ts';
import { SettingsPanel } from '@game/ui/settings.ts';
import { TownPanel, type TownData } from '@game/ui/town.ts';
import { QUESTS } from '@game/world/quests.ts';
import { buyPrice, sellPrice, gambleCost } from '@game/systems/town/economy.ts';
import { hireCost, reviveCost } from '@game/systems/merc/merc.ts';
import { GameAudio } from '@engine/audio/index.ts';
import { serializeGame, applySave, saveToDB, loadFromDB, listSlots, nextFreeSlot, deleteSlot } from '@game/systems/save/index.ts';
import { WaypointPanel } from '@game/ui/waypoint.ts';
import { WorldMapPanel, type WorldArea } from '@game/ui/worldmap.ts';
import { listWaypoints } from '@game/systems/waypoint/waypoint.ts';
import { dist } from '@engine/math/vec.ts';

const areaName = (id: string): string => AREAS[id]?.name ?? id;

function errText(e: unknown): string {
  if (e instanceof Error) return (e.message || '') + '\n' + (e.stack || '');
  return String(e);
}
// 可见错误浮层: 任何启动失败都显示文字而非纯黑屏 (便于真机定位)
function showError(msg: string): void {
  let d = document.getElementById('booterr');
  if (!d) {
    d = document.createElement('div');
    d.id = 'booterr';
    d.style.cssText =
      'position:fixed;inset:0;padding:18px;color:#ffd27a;background:#120a0a;font:12px/1.5 monospace;' +
      'white-space:pre-wrap;overflow:auto;z-index:99999;-webkit-user-select:text;user-select:text;';
    document.body.appendChild(d);
  }
  d.textContent = 'Ironband 启动信息:\n' + msg;
}

// ── M1 战斗沙盒 ──
// Phase0 等距脊柱 + T3 战斗内核 + T4 怪物AI 的可玩集成.
// 占位形状渲染 (T1 并行会替换为 FLARE 等距精灵 + 光照).

async function main() {
  const app = new Application();
  // iOS Safari 的 WebGPU 不稳定 → 强制 WebGL; 失败再退默认(自动选择)
  const initOpts = {
    background: '#1a0f0a', resizeTo: window, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
  };
  try {
    await app.init({ ...initOpts, preference: 'webgl' as const });
  } catch (err) {
    showError('WebGL 初始化失败, 尝试默认渲染器…\n' + errText(err));
    await app.init(initOpts); // 回退: 让 Pixi 自动选 (可能 WebGPU)
  }
  document.getElementById('boot')?.remove(); // 移除"加载中"指示
  document.getElementById('app')!.appendChild(app.canvas);

  const scene = new IsoScene(app);
  const lighting = new Lighting(app); // 哥特暗角光照(玩家居中)
  window.addEventListener('resize', () => lighting.resize());
  // 地砖由 syncArea() 按当前区域尺寸/主题构建

  // 开局界面 (Promise 化): 存档槽选择 → 续玩 或 新建(选职+命名)
  const slots = await listSlots();
  const choice = await new Promise<BootChoice>((res) => {
    const title = new TitleScreen(slots, nextFreeSlot(slots), (c) => res(c), (id) => { void deleteSlot(id); });
    title.show();
  });

  // 当前激活的存档槽与角色名 (供存/读档按钮复用, 保持续存时不丢名字)
  let activeSlot = choice.slotId;
  let activeName: string;
  let game: Game;
  if (choice.kind === 'continue') {
    const data = await loadFromDB(choice.slotId);
    if (data) {
      game = new Game(0xC0FFEE, data.cls);
      applySave(game, data);
      activeName = data.name;
    } else {
      // 理论不会发生 (列表来自已存在的槽); 兜底新建一个野蛮人。
      game = new Game(0xC0FFEE, 'barbarian');
      activeName = '野蛮人';
    }
  } else {
    game = new Game(0xC0FFEE, choice.cls); // 构造时自动加载罗格营地
    activeName = choice.name;
    void saveToDB(serializeGame(game, activeName), activeSlot); // 立即落一份初始存档, 占住槽位
  }

  // ----- 渲染层 -----
  const sprites = new Map<number, Container>();
  const actors = new Map<number, ActorSprite>();
  const corpseLayer = new Container();
  const goldLayer = new Container();
  const itemLayer = new Container();
  const swingLayer = new Container();
  const particleLayer = new Container();
  const missileLayer = new Container();
  const mercLayer = new Container();
  const exitLayer = new Container();
  const npcLayer = new Container();
  scene.entityLayer.addChild(exitLayer);
  scene.entityLayer.addChild(npcLayer);
  scene.entityLayer.addChild(corpseLayer);
  scene.entityLayer.addChild(goldLayer);
  scene.entityLayer.addChild(itemLayer);
  scene.entityLayer.addChild(swingLayer);
  scene.entityLayer.addChild(particleLayer);
  scene.entityLayer.addChild(missileLayer);
  scene.entityLayer.addChild(mercLayer);
  // 区域切换时重建的静态内容
  let lastAreaId = '';
  // 地砖真图 (按主题预加载; 缺失则 buildGround 回退程序化菱形)
  const tileTextures = new Map<string, Texture | null>();
  await Promise.all(
    ['wilderness', 'town', 'desert', 'hell', 'snow'].map(async (t) => tileTextures.set(t, await tryLoadTexture(`tile/${t}`))),
  );
  let npcMarkers: { name: string; greeting: string; role: NpcRole; x: number; y: number }[] = [];
  function syncArea(): void {
    const a = game.currentArea;
    if (a.id === lastAreaId) return;
    lastAreaId = a.id;
    // 重建地砖 (区域尺寸+主题)
    let h = 2166136261;
    for (let i = 0; i < a.id.length; i++) h = (Math.imul(h ^ a.id.charCodeAt(i), 16777619)) >>> 0;
    scene.ground.removeChildren();
    // 主题: 城镇暖石 / 二幕沙漠 / 四幕地狱 / 五幕雪山 / 其余荒野绿(一三幕林野)
    const act = AREAS[a.id]?.act;
    const groundTheme = a.isTown ? 'town'
      : act === 2 ? 'desert'
      : act === 4 ? 'hell'
      : act === 5 ? 'snow'
      : 'wilderness';
    buildGround(scene.ground, a.size[0], a.size[1], mulberry32(h), groundTheme, tileTextures.get(groundTheme));
    // 出口标记
    exitLayer.removeChildren();
    for (const ex of a.exits) {
      const s = gridToScreen(ex.pos);
      const g = new Graphics().circle(0, 0, 11).fill({ color: 0x3ad6ff, alpha: 0.32 }).stroke({ color: 0x9af0ff, width: 2 });
      g.position.set(s.x, s.y); g.zIndex = depthKey(ex.pos);
      const t = new Text({ text: '▸ ' + areaName(ex.toId), style: { fontFamily: 'Georgia,serif', fontSize: 12, fill: 0x9af0ff, stroke: { color: 0x000000, width: 3 } } });
      t.anchor.set(0.5, 1); t.position.set(s.x, s.y - 14); t.zIndex = depthKey(ex.pos);
      exitLayer.addChild(g, t);
    }
    // 营地 NPC (围绕中心环形排布)
    npcLayer.removeChildren();
    npcMarkers = [];
    if (a.isTown) {
      const cx = a.size[0] / 2, cy = a.size[1] / 2;
      NPCS.forEach((npc, i) => {
        const ang = (i / NPCS.length) * Math.PI * 2;
        const nx = cx + Math.cos(ang) * 6, ny = cy + Math.sin(ang) * 6;
        npcMarkers.push({ name: npc.name, greeting: npc.greeting, role: npc.role, x: nx, y: ny });
        const s = gridToScreen({ x: nx, y: ny });
        const g = buildNpcSprite(npc.role); // Q版长袍立绘 (按身份配色+道具)
        const t = new Text({ text: npc.name, style: { fontFamily: 'Georgia,serif', fontSize: 11, fill: 0xffe08a, stroke: { color: 0x000000, width: 3 } } });
        t.anchor.set(0.5, 1); t.position.set(s.x, s.y - 24);
        g.position.set(s.x, s.y); g.zIndex = depthKey({ x: nx, y: ny }); t.zIndex = depthKey({ x: nx, y: ny });
        npcLayer.addChild(g, t);
      });
    }
  }
  const damageTexts: { t: Text; life: number; vy: number; pop: number }[] = [];
  const flashedSwings = new WeakSet<object>(); // 已放过施法迸发的挥砍 (防重复)
  // 打击粒子: 受击迸溅 / 击杀爆裂. 屏幕空间, 整体随相机平移。
  const particles: { g: Graphics; vx: number; vy: number; life: number; max: number; grav: number }[] = [];
  function burst(sx: number, sy: number, color: number, count: number, power: number, grav: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = power * (0.4 + Math.random() * 0.6);
      const r = 1.2 + Math.random() * 2.2;
      const g = new Graphics().circle(0, 0, r).fill({ color });
      g.position.set(sx, sy);
      g.zIndex = 1e9;
      particleLayer.addChild(g);
      particles.push({ g, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - power * 0.3, life: 0, max: 0.34 + Math.random() * 0.3, grav });
    }
  }
  // 投射物拖尾: 在弹道当前位置留一团柔光, 原地淡出 → 形成发光残影。
  function trailPuff(sx: number, sy: number, color: number, r: number): void {
    const g = new Graphics().circle(0, 0, r).fill({ color, alpha: 0.6 });
    g.position.set(sx, sy); g.zIndex = 1e9 - 1; particleLayer.addChild(g);
    particles.push({ g, vx: 0, vy: 0, life: 0, max: 0.22, grav: 0 });
  }
  // 击杀冲击环: 一圈快速扩张并淡出的亮环 (最易读的"爆头"反馈)。
  const rings: { g: Graphics; life: number; max: number; from: number; to: number }[] = [];
  // to = 最终半径 (像素). 环从半径 4 扩张到 to。
  function ring(sx: number, sy: number, color: number, to: number): void {
    const g = new Graphics().circle(0, 0, 1).stroke({ color, width: 3, alpha: 1 });
    g.position.set(sx, sy); g.zIndex = 1e9; particleLayer.addChild(g);
    rings.push({ g, life: 0, max: 0.34, from: 4, to });
  }
  function updateParticles(dt: number): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) { p.g.destroy(); particles.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = 1 - p.life / p.max;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt;
      if (r.life >= r.max) { r.g.destroy(); rings.splice(i, 1); continue; }
      const t = r.life / r.max;
      r.g.scale.set(r.from + (r.to - r.from) * t);
      r.g.alpha = (1 - t) * 0.9;
    }
  }
  let shakeMag = 0; // 屏震强度(衰减)
  let redHit = 0; // 受击红屏强度(衰减)
  // 红屏 vignette: 受击脉冲 + 低血常驻警示
  const redVig = document.createElement('div');
  redVig.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70;opacity:0;' +
    'background:radial-gradient(ellipse at center, transparent 45%, #c0101099 100%);transition:opacity .08s;';
  document.body.appendChild(redVig);
  let lastRenderMs = 0; // 上一渲染帧时间戳 (粒子用)
  let hitstop = 0; // 顿帧(秒), >0 时冻结模拟
  let prevGold = 0; // 上帧金币(检测拾取播币音)
  let prevInv = 0; // 上帧背包数(检测拾物)
  let prevState = game.state; // 上帧状态(检测阵亡转换播死亡音)

  function actorKind(e: Entity): ActorKind {
    if (e.kind === 'player') return 'humanoid';
    if (e.defId === 'andariel' || e.defId === 'duriel' || e.defId === 'mephisto' || e.defId === 'diablo' || e.defId === 'baal') return 'caster';
    if (e.ai === 'shaman') return 'caster';
    if (e.ai === 'zombie' || e.ai === 'fallen' || e.defId === 'brute' || e.defId === 'hound' || e.defId === 'spitter') return 'beast';
    return 'humanoid';
  }

  function actorSubKind(e: Entity): ActorSubKind {
    if (e.kind === 'player') return game.character.cls as ActorSubKind;
    // 各幕 Boss 暂复用现有 Boss 立绘 (真图 mon/<id>.png 将覆盖); 督瑞尔有专属矢量
    if (e.defId === 'duriel') return 'duriel';
    if (e.defId === 'andariel' || e.defId === 'mephisto' || e.defId === 'diablo' || e.defId === 'baal') return 'andariel';
    if (e.ai === 'fallen') return 'fallen';
    if (e.ai === 'skeleton') return 'skeleton';
    if (e.ai === 'zombie') return 'zombie';
    if (e.defId === 'hound') return 'hound';
    if (e.defId === 'brute') return 'brute';
    if (e.defId === 'spitter') return 'spitter';
    return undefined;
  }

  function makeSprite(e: Entity): Container {
    const c = new Container();
    // 贴图 key: 玩家=char/<职业>, 怪物/Boss=mon/<defId>。命中 assets/<key>.png 即用真图。
    const textureKey = e.kind === 'player' ? `char/${game.character.cls}` : `mon/${e.defId}`;
    const actor = createActorSprite({ kind: actorKind(e), color: e.color, size: e.size, subKind: actorSubKind(e), textureKey });
    actors.set(e.id, actor);
    c.addChild(actor.container);
    // 精英描边光环 + 名牌
    if (e.elite) {
      const ring = new Graphics().ellipse(0, e.size * 0.5, e.size * 1.5, e.size * 0.8).stroke({ color: e.elite.color, width: 4, alpha: 0.9 });
      ring.label = 'eliteRing';
      c.addChild(ring);
      const nm = new Text({ text: e.elite.name, style: { fontFamily: 'Georgia,serif', fontSize: 11, fill: e.elite.color, stroke: { color: 0x000000, width: 3 } } });
      nm.anchor.set(0.5, 1); nm.position.set(0, -e.size - 20);
      c.addChild(nm);
    }
    // 血条 (受伤才显)
    const hpbg = new Graphics().rect(-14, -e.size - 16, 28, 4).fill({ color: 0x000000, alpha: 0.6 });
    const hp = new Graphics().rect(-13, -e.size - 15, 26, 2).fill({ color: 0xcc2200 });
    hpbg.label = 'hpbg'; hp.label = 'hp';
    hpbg.visible = false;
    c.addChild(hpbg, hp);
    scene.entityLayer.addChild(c);
    return c;
  }

  function syncEntity(e: Entity): void {
    let c = sprites.get(e.id);
    if (!c) { c = makeSprite(e); sprites.set(e.id, c); }
    const s = gridToScreen(e.pos);
    c.position.set(s.x, s.y);
    c.zIndex = depthKey(e.pos);
    const actor = actors.get(e.id);
    if (actor) {
      actor.update({
        facing: e.facing,
        moving: e.moving,
        attacking: e.attackInterval > 0 && e.attackCd > e.attackInterval - 0.18,
        flash: e.hitFlash > 0 ? Math.min(1, e.hitFlash) : 0,
        timeMs: performance.now(),
      });
    }
    const ratio = Math.max(0, e.combat.hp / e.combat.maxHp);
    const hpbg = c.getChildByLabel('hpbg') as Graphics;
    const hp = c.getChildByLabel('hp') as Graphics;
    const damaged = ratio < 0.999;
    hpbg.visible = hp.visible = damaged;
    hp.scale.x = ratio;
    hp.tint = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xe0c020 : 0xff2200;
    // Elite 光环脉冲
    const ring = c.getChildByLabel('eliteRing') as Graphics | null;
    if (ring) ring.alpha = 0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 400));
  }

    // 元素飘字配色 (与投射物 missileColor 同系)
    const ELEM_COLOR: Record<string, number> = { fire: 0xff7a2a, cold: 0x7ac8ff, lightning: 0xffe24a, poison: 0x7ad04a, magic: 0xc89cff, physical: 0xffffff };
    function spawnDamageText(): void {
    for (const ev of game.events) {
      const s = gridToScreen(ev.pos);
      // 文本与配色: miss/免疫/回血/经验 各有专属表现
      let text: string, fill: number, size: number;
      if (ev.miss) { text = 'Miss'; fill = 0xb0b0b0; size = 14; }
      else if (ev.immune) { text = '免疫'; fill = 0x9aa0a8; size = 15; }
      else if (ev.heal) { text = `+${ev.heal}`; fill = 0x5fe06a; size = 15; }
      else if (ev.xp) { text = `+${ev.xp} XP`; fill = 0xa0e060; size = 13; }
      else {
        text = ev.crit ? `${ev.amount}‼` : ev.killed ? `${ev.amount}!` : `${ev.amount}`;
        size = ev.crit ? 26 : ev.killed ? 22 : 16;
        // 元素伤害按系着色; 玩家受击红; 物理普通命中白; 击杀金
        fill = ev.toPlayer ? 0xff5e4a
          : ev.crit ? 0xff9a30
          : ev.dmgType && ev.dmgType !== 'physical' ? ELEM_COLOR[ev.dmgType]
          : ev.killed ? 0xffd76b : 0xffffff;
      }
      const t = new Text({ text, style: { fontFamily: 'Georgia, serif', fontSize: size, fill, stroke: { color: 0x000000, width: 3 }, fontWeight: '700' } });
      t.anchor.set(0.5);
      t.position.set(s.x, s.y - 18);
      t.zIndex = 1e9;
      scene.entityLayer.addChild(t);
      // 弹跳上抛: 初速向上, 暴击/击杀字号 pop 放大回落
      t.scale.set(ev.crit ? 1.5 : ev.killed ? 1.25 : 1);
      damageTexts.push({ t, life: ev.miss || ev.heal || ev.xp || ev.immune ? 0.6 : 0.8, vy: -1.6, pop: ev.crit || ev.killed ? 1 : 0 });
      // 粒子: miss/回血/经验 不迸溅; 击杀=金红大爆裂; 玩家受击=红; 元素命中=元素色; 物理=白
      if (ev.miss || ev.heal || ev.xp || ev.immune) { /* 无迸溅 */ }
      else if (ev.killed) {
        burst(s.x, s.y - 8, 0xffe9a0, 16, 175, 380);
        burst(s.x, s.y - 8, 0xd8442e, 10, 130, 380);
        ring(s.x, s.y - 8, 0xffe08a, 30); // 金色冲击环 (扩张到 30px)
      } else if (ev.toPlayer) { burst(s.x, s.y - 8, 0xff5e4a, 8, 100, 300); ring(s.x, s.y - 8, 0xff5e4a, 20); }
      else burst(s.x, s.y - 8, ev.dmgType && ev.dmgType !== 'physical' ? ELEM_COLOR[ev.dmgType] : 0xffffff, 7, 110, 320);
    }
    game.events.length = 0;
  }

  function syncCorpses(): void {
    corpseLayer.removeChildren();
    for (const c of game.corpses) {
      const s = gridToScreen(c.pos);
      const g = new Graphics().ellipse(0, 0, c.size, c.size * 0.5).fill({ color: c.color, alpha: Math.max(0.1, 1 - c.ageMs / 12000) * 0.7 });
      g.position.set(s.x, s.y + c.size * 0.4);
      g.zIndex = depthKey(c.pos) - 0.5;
      corpseLayer.addChild(g);
    }
  }

  function syncSwings(): void {
    swingLayer.removeChildren();
    for (const sw of game.swings) {
      const s = gridToScreen(sw.pos);
      const prog = sw.ageMs / 220; // 0→1
      const alpha = (1 - prog) * 0.8;
      const reach = sw.kind === 'skill' ? 52 : 38;
      // 沿朝向画一道扫击弧 (用多边形近似)
      const g = new Graphics();
      const half = sw.kind === 'skill' ? 1.1 : 0.8; // 弧张角(rad)
      const a0 = sw.facing - half, a1 = sw.facing + half;
      g.moveTo(0, 0);
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        // 等距压扁 y
        g.lineTo(Math.cos(a) * reach, Math.sin(a) * reach * 0.5);
      }
      g.closePath().fill({ color: sw.kind === 'skill' ? 0xffe08a : 0xffffff, alpha: alpha * 0.5 });
      // 技能弧叠一层更亮的内弧 + 起手中心辉光, 显得更"满"
      if (sw.kind === 'skill') {
        g.moveTo(0, 0);
        for (let i = 0; i <= steps; i++) {
          const a = a0 + ((a1 - a0) * i) / steps;
          g.lineTo(Math.cos(a) * reach * 0.6, Math.sin(a) * reach * 0.5 * 0.6);
        }
        g.closePath().fill({ color: 0xffffff, alpha: alpha * 0.55 });
        g.circle(0, 0, 10 * (1 - prog)).fill({ color: 0xfff0b0, alpha: alpha * 0.5 });
      }
      g.position.set(s.x, s.y - 6);
      g.zIndex = depthKey(sw.pos) + 0.5;
      swingLayer.addChild(g);
      // 起手一次性施法迸发 (每个 swing 只放一次)
      if (sw.kind === 'skill' && !flashedSwings.has(sw)) {
        flashedSwings.add(sw);
        burst(s.x, s.y - 6, 0xffe9a0, 12, 150, 200);
        ring(s.x, s.y - 6, 0xfff0b0, 40);
      }
    }
  }

  const RARITY_COLOR: Record<string, number> = {
    normal: 0xc8c8c8, magic: 0x6a8cff, rare: 0xffe85a, set: 0x33cc33, unique: 0xb8843a,
  };
  function syncGroundItems(): void {
    itemLayer.removeChildren();
    for (const gi of game.groundItems) {
      const s = gridToScreen(gi.pos);
      // 未鉴定掉落统一显示基础色 (不剧透稀有度; 鉴定后才显金/绿)
      const col = RARITY_COLOR[gi.item.identified ? gi.item.rarity : 'normal'] ?? 0xc8c8c8;
      const g = new Graphics()
        .poly([0, -7, 5, 0, 0, 7, -5, 0]).fill({ color: col }).stroke({ color: 0x000000, width: 1 });
      g.position.set(s.x, s.y);
      g.zIndex = depthKey(gi.pos);
      itemLayer.addChild(g);
    }
  }

  function syncMerc(): void {
    mercLayer.removeChildren();
    const m = game.merc;
    if (!m || m.dead) return;
    const s = gridToScreen(m.pos);
    const g = new Graphics().circle(0, 0, 9).fill({ color: 0x4ad06a }).stroke({ color: 0x0a3a18, width: 2 });
    const ratio = Math.max(0, m.hp / m.maxHp);
    g.rect(-12, -22, 24, 3).fill({ color: 0x000000, alpha: 0.6 });
    g.rect(-11, -21.5, 22 * ratio, 2).fill({ color: 0x6ee08a });
    g.position.set(s.x, s.y);
    g.zIndex = depthKey(m.pos);
    mercLayer.addChild(g);
  }

  function syncMissiles(): void {
    missileLayer.removeChildren();
    for (const m of game.missiles) {
      const s = gridToScreen(m.pos);
      // 发光拖尾: 每帧在弹道处留一团柔光残影 (法术/箭矢都更"酷")
      const trailCol = m.kind === 'fireball' ? 0xff7a20 : m.kind === 'iceball' ? 0x7ad0ff : m.kind === 'bolt' ? m.color : 0xffe0a0;
      trailPuff(s.x, s.y - 6, trailCol, m.kind === 'arrow' ? 2.4 : 4.5);
      const g = new Graphics();
      // 速度方向 (用于定向绘制)
      const vx = m.vel.x, vy = m.vel.y;
      const vlen = Math.hypot(vx, vy) || 1;
      const nx = vx / vlen, ny = vy / vlen; // 归一化朝向
      const angle = Math.atan2(ny, nx);

      if (m.kind === 'arrow') {
        // 箭: 细长菱形 (4:1 纵横比)
        g.rotation = angle;
        g.poly([16, 0, 2, 3, -6, 0, 2, -3]).fill({ color: m.color }).stroke({ color: 0x3a2800, width: 1 });
        // 拖尾 (半透明)
        g.poly([-6, 0, -18, 2, -18, -2]).fill({ color: m.color, alpha: 0.35 });
      } else if (m.kind === 'fireball') {
        // 火球: 橙色圆 + 光晕 + 拖尾
        g.circle(0, 0, 9).fill({ color: 0xff8800 }).stroke({ color: 0xff3300, width: 2 });
        g.circle(0, 0, 14).fill({ color: 0xff6600, alpha: 0.25 }); // 外光晕
        // 火焰拖尾 (逆速度方向)
        g.circle(-nx * 10, -ny * 10, 6).fill({ color: 0xff4400, alpha: 0.5 });
        g.circle(-nx * 18, -ny * 18, 4).fill({ color: 0xff2200, alpha: 0.3 });
      } else if (m.kind === 'iceball') {
        // 冰弹: 蓝白色菱形碎片
        g.rotation = angle;
        g.poly([10, 0, 2, 4, -5, 0, 2, -4]).fill({ color: 0xd0f0ff }).stroke({ color: 0x4080cc, width: 1 });
        g.poly([10, 0, 5, 1.5, 6, 4]).fill({ color: 0xffffff, alpha: 0.6 }); // 冰晶高光
        // 霜迹拖尾
        g.circle(-nx * 8, -ny * 8, 4).fill({ color: 0x8fd6ff, alpha: 0.4 });
      } else if (m.kind === 'nova' || m.kind === 'bolt') {
        // 闪电: 黄色小球 + 电光
        g.circle(0, 0, 6).fill({ color: 0xffff40 }).stroke({ color: 0xffcc00, width: 1 });
        g.circle(-nx * 7, -ny * 7, 4).fill({ color: 0xffee00, alpha: 0.5 });
      } else {
        // 默认: 简单圆
        const rad = 5;
        g.circle(0, 0, rad).fill({ color: m.color }).stroke({ color: 0x000000, width: 1 });
        g.circle(-vx * 6, -vy * 3, rad * 0.6).fill({ color: m.color, alpha: 0.4 });
      }
      g.position.set(s.x, s.y - 8);
      g.zIndex = 1e8;
      missileLayer.addChild(g);
    }
  }

  function syncGold(): void {
    goldLayer.removeChildren();
    for (const gd of game.gold) {
      const s = gridToScreen(gd.pos);
      const g = new Graphics().circle(0, 0, 4).fill({ color: 0xffd24a }).stroke({ color: 0x8a5a10, width: 1 });
      g.position.set(s.x, s.y);
      g.zIndex = depthKey(gd.pos);
      goldLayer.addChild(g);
    }
  }

  const joy = new Joystick(document.body);
  const hud = new HUD(game, (slot) => { const ok = game.useSkill(slot); if (ok) audio.sfx('skill'); return ok; });

  // 背包/装备面板 (打开时暂停模拟)
  let paused = false;
  const panel = new InventoryPanel(game, () => { panel.hide(); paused = false; });
  const bagBtn = document.createElement('div');
  bagBtn.textContent = '🎒';
  bagBtn.style.cssText =
    'position:absolute;left:calc(10px + env(safe-area-inset-left));top:calc(60px + env(safe-area-inset-top));' +
    'width:48px;height:48px;border-radius:11px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:flex;' +
    'align-items:center;justify-content:center;font-size:23px;pointer-events:auto;z-index:40;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
  const skillPanel = new SkillTreePanel(game, () => { skillPanel.hide(); paused = false; });
  function closePanels(): void { panel.hide(); skillPanel.hide(); questLog.hide(); town.hide(); wp.hide(); worldMap.hide(); paused = false; }
  bagBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (panel.open) closePanels();
    else { skillPanel.hide(); panel.show(); paused = true; }
  });
  document.body.appendChild(bagBtn);

  // 技能树按钮
  const skillBtn = document.createElement('div');
  skillBtn.textContent = '📖';
  skillBtn.style.cssText =
    'position:absolute;left:calc(10px + env(safe-area-inset-left));top:calc(114px + env(safe-area-inset-top));' +
    'width:48px;height:48px;border-radius:11px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:flex;' +
    'align-items:center;justify-content:center;font-size:23px;pointer-events:auto;z-index:40;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
  skillBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (skillPanel.open) closePanels();
    else { panel.hide(); skillPanel.show(); paused = true; }
  });
  document.body.appendChild(skillBtn);

  // 任务日志按钮
  const questLog = new QuestLogPanel(() => { questLog.hide(); paused = false; });
  const questBtn = document.createElement('div');
  questBtn.textContent = '📜';
  questBtn.style.cssText =
    'position:absolute;left:calc(10px + env(safe-area-inset-left));top:calc(168px + env(safe-area-inset-top));' +
    'width:48px;height:48px;border-radius:11px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:flex;' +
    'align-items:center;justify-content:center;font-size:23px;pointer-events:auto;z-index:40;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
  questBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (questLog.open) { questLog.hide(); paused = false; }
    else { panel.hide(); skillPanel.hide(); questLog.show(QUESTS, game.questProgress); paused = true; }
  });
  document.body.appendChild(questBtn);

  // 营地服务面板 (商店/赌博/雇佣兵/鉴定)
  function buildTownData(): TownData {
    return {
      gold: game.goldTotal,
      shop: game.shopStock.map((i) => ({ uid: i.uid, name: i.name, rarity: i.rarity, price: buyPrice(i) })),
      inventory: game.inventory.map((i) => ({
        uid: i.uid, name: i.identified ? i.name : i.base.name,
        rarity: i.identified ? i.rarity : 'normal', sellPrice: sellPrice(i), identified: i.identified,
      })),
      gambleCost: gambleCost(game.character.level),
      merc: { hired: !!game.merc, dead: !!game.merc?.dead, hireCost: hireCost(), reviveCost: reviveCost(game.merc?.level ?? game.character.level) },
      stash: game.stash.map((i) => ({
        uid: i.uid, name: i.identified ? i.name : i.base.name,
        rarity: i.identified ? i.rarity : 'normal',
      })),
    };
  }
  const town = new TownPanel({
    onBuy: (uid) => { game.buyItem(uid); town.refresh(buildTownData()); },
    onSell: (uid) => { game.sellItem(uid); town.refresh(buildTownData()); },
    onGamble: () => { game.gamble(); town.refresh(buildTownData()); },
    onIdentify: (uid) => { game.identifyItem(uid); town.refresh(buildTownData()); },
    onHireMerc: () => { game.hireMerc(); town.refresh(buildTownData()); },
    onReviveMerc: () => { game.reviveMerc(); town.refresh(buildTownData()); },
    onDeposit: (uid) => { game.depositToStash(uid); town.refresh(buildTownData()); },
    onWithdraw: (uid) => { game.withdrawFromStash(uid); town.refresh(buildTownData()); },
    onClose: () => { town.hide(); paused = false; },
  });
  const townBtn = document.createElement('div');
  townBtn.textContent = '🏛';
  townBtn.style.cssText =
    'position:absolute;left:calc(10px + env(safe-area-inset-left));top:calc(222px + env(safe-area-inset-top));' +
    'width:48px;height:48px;border-radius:11px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:flex;' +
    'align-items:center;justify-content:center;font-size:22px;pointer-events:auto;z-index:40;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
  townBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!game.currentArea.isTown) { game.notices.push('营地服务仅在罗格营地可用'); return; }
    if (town.open) { town.hide(); paused = false; }
    else { panel.hide(); skillPanel.hide(); questLog.hide(); town.show(buildTownData()); paused = true; }
  });
  document.body.appendChild(townBtn);

  // 程序化音频: 首个手势解锁 + 起氛围 BGM
  const audio = new GameAudio();
  window.addEventListener('pointerdown', () => { audio.unlock(); audio.startBgm(); }, { once: true });

  // 顶部右侧次级功能按钮 (航点/存档/读档/音效) — 收纳进可折叠的 ☰ 菜单, 减少常驻按钮。
  const utilBtns: HTMLElement[] = [];
  function topBtn(emoji: string, slot: number, onTap: () => void): HTMLElement {
    const b = document.createElement('div');
    b.textContent = emoji;
    const topPx = 156 + slot * 48; // ☰ 菜单按钮之下依次排列 (小地图在右上角)
    b.style.cssText =
      `position:absolute;right:calc(12px + env(safe-area-inset-right));top:calc(${topPx}px + env(safe-area-inset-top));` +
      'width:42px;height:42px;border-radius:10px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:none;' +
      'align-items:center;justify-content:center;font-size:20px;pointer-events:auto;z-index:40;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); audio.sfx('select'); onTap(); menuToggle(false); });
    document.body.appendChild(b);
    utilBtns.push(b);
    return b;
  }
  // 航点: 提为常驻左侧按钮 (高频核心移动手段, 不再藏进菜单)
  const wp = new WaypointPanel((id) => { game.loadArea(id); wp.hide(); paused = false; }, () => { wp.hide(); paused = false; });
  const wpBtn = document.createElement('div');
  wpBtn.textContent = '🗺';
  wpBtn.style.cssText =
    'position:absolute;left:calc(10px + env(safe-area-inset-left));top:calc(276px + env(safe-area-inset-top));' +
    'width:48px;height:48px;border-radius:11px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:flex;' +
    'align-items:center;justify-content:center;font-size:22px;pointer-events:auto;z-index:40;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
  wpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (wp.open) { wp.hide(); paused = false; }
    else { closePanels(); wp.show(listWaypoints(game.discoveredWaypoints, AREAS)); paused = true; }
  });
  document.body.appendChild(wpBtn);
  // 存档 / 读档 (针对当前激活槽位, 保留角色名)
  topBtn('💾', 0, () => { saveToDB(serializeGame(game, activeName), activeSlot).then(() => game.notices.push('已保存进度')); });
  topBtn('📂', 1, () => {
    loadFromDB(activeSlot).then((d) => { if (d) { applySave(game, d); activeName = d.name; game.notices.push('已读取存档'); } else game.notices.push('暂无存档'); });
  });
  let audioOn = true;
  topBtn('🔊', 2, () => { audioOn = !audioOn; audio.setEnabled(audioOn); game.notices.push(audioOn ? '音效开' : '音效关'); });
  // 帮助: 重看新手引导 (暂停模拟, 关闭后恢复)
  topBtn('❓', 3, () => { paused = true; showTutorial(() => { paused = false; }); });
  // 设置: 音量/音效/BGM/自动饮药/重置存档
  let masterVol = 0.6, bgmOn = true;
  const settings = new SettingsPanel({
    getVolume: () => masterVol,
    setVolume: (v) => { masterVol = v; audio.setVolume(v); },
    getSfxOn: () => audioOn,
    setSfxOn: (on) => { audioOn = on; audio.setEnabled(on); },
    getBgmOn: () => bgmOn,
    setBgmOn: (on) => { bgmOn = on; if (on) audio.startBgm(); else audio.stopBgm(); },
    getAutoQuaff: () => game.autoQuaff,
    setAutoQuaff: (on) => { game.autoQuaff = on; },
    onResetSave: () => { void deleteSlot(activeSlot).then(() => location.reload()); },
    onClose: () => { paused = false; },
  });
  topBtn('⚙', 4, () => { paused = true; settings.show(); });
  // ☰ 菜单开关: 折叠/展开上述次级按钮 (默认折叠, 只占一个角)
  let menuOpen = false;
  function menuToggle(open?: boolean): void {
    menuOpen = open ?? !menuOpen;
    for (const b of utilBtns) b.style.display = menuOpen ? 'flex' : 'none';
    menuBtn.textContent = menuOpen ? '✕' : '☰';
  }
  const menuBtn = document.createElement('div');
  menuBtn.textContent = '☰';
  menuBtn.style.cssText =
    'position:absolute;right:calc(12px + env(safe-area-inset-right));top:calc(108px + env(safe-area-inset-top));' +
    'width:42px;height:42px;border-radius:10px;background:radial-gradient(circle at 50% 30%,#2c2638,#15121c 80%);border:1.5px solid #c79433;display:flex;' +
    'align-items:center;justify-content:center;font-size:20px;color:#e8d8a8;pointer-events:auto;z-index:41;box-shadow:0 4px 10px #000b,inset 0 1px 4px #ffffff16,inset 0 -3px 7px #00000050;';
  menuBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); audio.sfx('select'); menuToggle(); });
  document.body.appendChild(menuBtn);

  // 小地图 (区域俯瞰: 玩家/怪/出口/雇佣兵)
  const mm = document.createElement('canvas');
  mm.width = 124; mm.height = 88;
  mm.className = 'hud-mini';
  mm.style.cssText =
    'position:absolute;right:calc(12px + env(safe-area-inset-right));top:calc(14px + env(safe-area-inset-top));' +
    'width:118px;height:84px;border:1.5px solid #6a5a3a;background:#0009;border-radius:8px;pointer-events:auto;z-index:35;box-shadow:0 3px 8px #000a;';
  document.body.appendChild(mm);
  // 点击小地图 → 展开世界地图 (关卡链路 + 航点传送)
  const BOSS_AREA_IDS = new Set(['andariel_lair', 'tal_rasha_tomb', 'durance_of_hate', 'chaos_sanctuary', 'worldstone_keep']);
  const worldMap = new WorldMapPanel((id) => { game.loadArea(id); worldMap.hide(); paused = false; }, () => { paused = false; });
  function worldAreas(): WorldArea[] {
    return Object.keys(AREAS).map((id) => {
      const a = AREAS[id];
      return { id, name: a.name, act: a.act ?? 1, isTown: !!a.isTown, waypoint: !!a.waypoint, isBoss: BOSS_AREA_IDS.has(id) };
    });
  }
  mm.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (worldMap.open) { worldMap.hide(); paused = false; }
    else { closePanels(); worldMap.show({ currentId: game.currentArea.id, discovered: game.discoveredWaypoints, areas: worldAreas() }); paused = true; }
  });

  // 竖屏适配: 小地图已在右上角(不再压血条); 技能簇上抬避开底部功能栏。
  const respStyle = document.createElement('style');
  respStyle.textContent = `
    @media (orientation: portrait) {
      #hud .skills { bottom: calc(104px + env(safe-area-inset-bottom)) !important; }
    }`;
  document.head.appendChild(respStyle);
  const mmctx = mm.getContext('2d');

  // 出口方向箭头 (野外指向最近出口, 解决"出口太远找不到")
  const exitArrow = document.createElement('div');
  exitArrow.textContent = '➤';
  exitArrow.style.cssText =
    'position:absolute;left:50%;top:50%;font-size:30px;color:#9af0ff;text-shadow:0 0 10px #3ad6ff;' +
    'pointer-events:none;z-index:38;display:none;will-change:transform;';
  document.body.appendChild(exitArrow);
  function syncExitArrow(): void {
    if (game.currentArea.isTown || !game.currentArea.exits.length) { exitArrow.style.display = 'none'; return; }
    let near = game.currentArea.exits[0], nd = Infinity;
    for (const ex of game.currentArea.exits) { const d = dist(game.player.pos, ex.pos); if (d < nd) { nd = d; near = ex; } }
    if (nd <= 4) { exitArrow.style.display = 'none'; return; }
    const ps = gridToScreen(game.player.pos), es = gridToScreen(near.pos);
    const ang = Math.atan2(es.y - ps.y, es.x - ps.x);
    const r = Math.min(app.renderer.width, app.renderer.height) * 0.33;
    exitArrow.style.display = 'block';
    exitArrow.style.transform = `translate(-50%,-50%) translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r}px) rotate(${ang}rad)`;
  }
  function syncMinimap(): void {
    if (!mmctx) return;
    mmctx.clearRect(0, 0, 124, 88);
    const [aw, ah] = game.currentArea.size;
    const sx = 124 / aw, sy = 88 / ah;
    mmctx.fillStyle = '#3ad6ff';
    for (const ex of game.currentArea.exits) mmctx.fillRect(ex.pos.x * sx - 2, ex.pos.y * sy - 2, 4, 4);
    mmctx.fillStyle = '#e23a3a';
    for (const e of game.monsters) mmctx.fillRect(e.pos.x * sx - 1, e.pos.y * sy - 1, 2, 2);
    if (game.merc && !game.merc.dead) { mmctx.fillStyle = '#4ad06a'; mmctx.fillRect(game.merc.pos.x * sx - 1, game.merc.pos.y * sy - 1, 3, 3); }
    mmctx.fillStyle = '#ffd76b';
    mmctx.fillRect(game.player.pos.x * sx - 2, game.player.pos.y * sy - 2, 4, 4);
  }

  // 升级等提示
  const noticeEl = document.createElement('div');
  noticeEl.style.cssText =
    'position:absolute;top:28%;left:0;width:100%;text-align:center;font-family:Georgia,serif;font-size:34px;' +
    'font-weight:800;color:#ffe08a;text-shadow:0 2px 10px #000;pointer-events:none;opacity:0;transition:opacity .4s;z-index:60;';
  document.body.appendChild(noticeEl);
  let noticeUntil = 0;

  // NPC 交互气泡 (营地靠近时显示, 可点击触发该 NPC 的功能)
  const npcEl = document.createElement('div');
  npcEl.style.cssText =
    'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));max-width:86%;' +
    'padding:10px 16px;border-radius:12px;background:#0c0c12ee;border:1px solid #c79433;color:#e8e0d0;font-size:13px;' +
    'text-align:center;pointer-events:auto;display:none;z-index:45;box-shadow:0 4px 16px #000a;cursor:pointer;';
  document.body.appendChild(npcEl);
  let nearNpcRole: NpcRole | null = null;
  // 每个身份的交互动作与按钮文案。
  const NPC_ACTION: Record<NpcRole, { label: string; run: () => void }> = {
    heal: { label: '治疗 (恢复全部生命)', run: () => {
      game.player.combat.hp = game.player.combat.maxHp; game.notices.push('阿卡拉治愈了你的伤势');
    } },
    vendor: { label: '打开商店', run: () => { closePanels(); town.show(buildTownData(), 'shop'); paused = true; } },
    gamble: { label: '赌一把', run: () => { closePanels(); town.show(buildTownData(), 'gamble'); paused = true; } },
    mercenary: { label: '雇佣兵', run: () => { closePanels(); town.show(buildTownData(), 'merc'); paused = true; } },
    quest: { label: '鉴定物品', run: () => { closePanels(); town.show(buildTownData(), 'identify'); paused = true; } },
    travel: { label: '传送出行', run: () => { closePanels(); wp.show(listWaypoints(game.discoveredWaypoints, AREAS)); paused = true; } },
  };
  npcEl.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (nearNpcRole) { audio.sfx('select'); NPC_ACTION[nearNpcRole].run(); }
  });

  // 阵亡/清场横幅 (点击重生/续战)
  const banner = document.createElement('div');
  banner.style.cssText =
    'position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;' +
    'background:#000a;color:#ffd76b;font-family:Georgia,serif;font-size:30px;font-weight:800;text-align:center;' +
    'text-shadow:0 2px 8px #000;pointer-events:auto;z-index:50;gap:8px;';
  banner.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (game.state === 'dead') game.respawn();
  });
  document.body.appendChild(banner);

  const loop = new GameLoop(
    (dt) => {
      if (paused) return; // 背包打开时暂停
      // 顿帧: 击杀瞬间冻结模拟 (打击重量感)
      if (hitstop > 0) { hitstop -= dt; return; }
      // 摇杆屏幕方向 → 世界格子方向
      let move = { x: 0, y: 0 };
      if (joy.active && joy.strength > 0.05) {
        const g = normalize(screenToGrid(joy.vector));
        move = { x: g.x * joy.strength, y: g.y * joy.strength };
      }
      game.update(dt, { move });
      // 事件驱动: 击杀→顿帧+强屏震; 玩家受击→屏震
      for (const ev of game.events) {
        if (ev.miss || ev.heal || ev.xp) continue; // 非伤害事件不震屏/不红屏
        if (ev.killed) { hitstop = Math.max(hitstop, 0.05); shakeMag = Math.max(shakeMag, 7); }
        else if (ev.toPlayer) {
          // 受击屏震+红屏按伤害占比缩放 (重击更震更红)
          const frac = Math.min(1, ev.amount / Math.max(1, game.player.combat.maxHp));
          shakeMag = Math.max(shakeMag, 4 + frac * 18);
          redHit = Math.max(redHit, Math.min(0.7, 0.18 + frac * 2));
        } else shakeMag = Math.max(shakeMag, 2.5);
      }
    },
    (_alpha) => {
      // 渲染帧时间 (performance.now, 非 Date): 驱动粒子动画
      const nowP = performance.now();
      const rdt = lastRenderMs ? Math.min(0.05, (nowP - lastRenderMs) / 1000) : 1 / 60;
      lastRenderMs = nowP;
      updateParticles(rdt);
      syncArea(); // 区域切换 → 重建地砖/出口/NPC
      // 同步实体精灵 (清理已死/已移除)
      const live = new Set<number>([game.player.id, ...game.monsters.map((m) => m.id)]);
      for (const [id, c] of sprites) {
        if (!live.has(id)) { c.destroy({ children: true }); sprites.delete(id); actors.delete(id); }
      }
      syncEntity(game.player);
      for (const m of game.monsters) syncEntity(m);
      syncCorpses();
      syncGold();
      syncGroundItems();
      syncSwings();
      syncMissiles();
      syncMerc();
      // 音效: 命中/受击 (仅真实伤害事件; miss/回血/经验不发声)
      const dmgEvents = game.events.filter((e) => e.amount > 0 && !e.miss);
      if (dmgEvents.length) {
        if (dmgEvents.some((e) => e.toPlayer)) audio.sfx('hurt');
        else audio.sfx('hit');
      }
      if (game.notices.some((n) => n.includes('升级'))) audio.sfx('levelup');
      if (game.goldTotal > prevGold) audio.sfx('coin');
      if (game.inventory.length > prevInv) audio.sfx('pickup');
      if (game.state === 'dead' && prevState !== 'dead') audio.sfx('death');
      prevGold = game.goldTotal;
      prevInv = game.inventory.length;
      prevState = game.state;
      // 技能落点冲击环 (按技能半径放大; 格→像素约 ×24)
      for (const fx of game.castFx) {
        const s = gridToScreen(fx.pos);
        ring(s.x, s.y, fx.color, fx.radius * 24);
      }
      game.castFx.length = 0;
      spawnDamageText();
      // 伤害数字漂浮淡出
      for (const d of damageTexts) {
        d.life -= 1 / 60;
        d.vy += 0.14; // 重力: 上抛后回落
        d.t.position.y += d.vy;
        d.t.alpha = Math.max(0, d.life / 0.8);
        if (d.pop > 0) { d.pop = Math.max(0, d.pop - 0.12); d.t.scale.set(1 + d.pop * 0.5); } // pop 缩放回落
      }
      for (let i = damageTexts.length - 1; i >= 0; i--) {
        if (damageTexts[i].life <= 0) { damageTexts[i].t.destroy(); damageTexts.splice(i, 1); }
      }
      hud.update();
      syncMinimap();
      syncExitArrow();
      if (game.notices.length) {
        noticeEl.textContent = game.notices[game.notices.length - 1];
        noticeEl.style.opacity = '1';
        noticeUntil = performance.now() + 1400;
        game.notices.length = 0;
      }
      if (noticeUntil && performance.now() > noticeUntil) { noticeEl.style.opacity = '0'; noticeUntil = 0; }
      // 营地 NPC 邻近问候
      if (game.currentArea.isTown && npcMarkers.length) {
        let near: typeof npcMarkers[number] | null = null;
        let nd = 2.4;
        for (const m of npcMarkers) {
          const d = dist(game.player.pos, { x: m.x, y: m.y });
          if (d < nd) { nd = d; near = m; }
        }
        if (near && !paused) {
          nearNpcRole = near.role;
          npcEl.style.display = 'block';
          npcEl.innerHTML =
            `<b style="color:#ffe08a">${near.name}</b>：${near.greeting}` +
            `<div style="margin-top:6px;color:#c79433;font-weight:700">▸ ${NPC_ACTION[near.role].label}</div>`;
        } else { nearNpcRole = null; npcEl.style.display = 'none'; }
      } else { nearNpcRole = null; npcEl.style.display = 'none'; }
      if (game.state === 'dead') {
        // 阵亡: 全屏暗幕 + 可点击重生 (拦截输入是对的)
        banner.style.display = 'flex';
        banner.style.pointerEvents = 'auto';
        banner.style.background = '#000a';
        banner.style.justifyContent = 'center';
        const penaltyText = game.difficulty === 'hell'
          ? `<div style="font-size:14px;color:#ff8888;margin:4px 0">⚠ 惩罚: -20% 金币 · 装备耐久-20 · 重生于营地</div>`
          : game.difficulty === 'nightmare'
          ? `<div style="font-size:14px;color:#ffaa44;margin:4px 0">⚠ 惩罚: -10% 金币 · 50% HP · 重生于区域入口</div>`
          : `<div style="font-size:14px;color:#88ff88;margin:4px 0">普通模式: 无惩罚, 原地复活</div>`;
        banner.innerHTML = `☠ 你已阵亡${penaltyText}<div style="font-size:13px;opacity:.7;margin-top:8px">点击重生</div>`;
      } else if (game.state === 'cleared' && !game.currentArea.isTown) {
        // 区域肃清: 仅顶部提示条, 不暗幕、不拦截输入 (否则摇杆被吃, 走不到出口 → 卡死)
        banner.style.display = 'flex';
        banner.style.pointerEvents = 'none';
        banner.style.background = 'transparent';
        banner.style.justifyContent = 'flex-start';
        banner.innerHTML = '<div style="margin-top:16%;font-size:26px">⚔ 区域肃清!<div style="font-size:15px;opacity:.85">走到蓝色发光出口前往相邻区域</div></div>';
      } else {
        banner.style.display = 'none';
      }
      scene.centerOn(game.player.pos);
      lighting.update(app.renderer.width / 2, app.renderer.height / 2, Math.max(app.renderer.width, app.renderer.height) * 0.5); // 亮圈随屏幕
      // 屏震: 在相机居中后叠加随机偏移并衰减
      if (shakeMag > 0.1) {
        scene.world.position.x += (Math.random() - 0.5) * shakeMag * 2;
        scene.world.position.y += (Math.random() - 0.5) * shakeMag * 2;
        shakeMag *= 0.85;
      }
      // 红屏: 受击脉冲衰减 + 低于25%血常驻警示脉冲
      redHit *= 0.86;
      const hpRatio = game.player.combat.hp / Math.max(1, game.player.combat.maxHp);
      const lowPulse = !game.player.dead && hpRatio < 0.25 ? 0.12 + 0.10 * (0.5 + 0.5 * Math.sin(performance.now() / 180)) : 0;
      redVig.style.opacity = String(Math.min(0.7, Math.max(redHit, lowPulse)));
    },
  );
  loop.start();

  // 首次启动: 弹出新手引导(暂停模拟), 看完/跳过后恢复。
  if (maybeShowTutorial(() => { paused = false; })) paused = true;

  (window as unknown as { __iron: unknown }).__iron = { app, game, scene, joy };
}

main().catch((e) => {
  console.error(e);
  showError('运行出错:\n' + errText(e));
});
