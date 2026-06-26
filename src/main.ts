import { Application, Container, Graphics, Text } from 'pixi.js';
import { IsoScene } from '@engine/render/IsoScene.ts';
import { GameLoop } from '@engine/loop.ts';
import { Joystick } from '@engine/input/joystick.ts';
import { gridToScreen, screenToGrid, depthKey } from '@engine/math/iso.ts';
import { normalize } from '@engine/math/vec.ts';
import { mulberry32 } from '@engine/math/rng.ts';
import { buildGround } from '@engine/render/groundTiles.ts';
import { createActorSprite, type ActorSprite, type ActorKind } from '@engine/render/actorSprite.ts';
import { Lighting } from '@engine/render/lighting.ts';
import { Game } from '@game/sim/Game.ts';
import type { Entity } from '@game/entities/entity.ts';
import { HUD } from '@game/ui/hud.ts';
import { InventoryPanel } from '@game/ui/inventory.ts';
import { SkillTreePanel } from '@game/ui/skilltree.ts';
import { NPCS } from '@game/world/npcs.ts';
import { AREAS } from '@game/world/act1.ts';
import { TitleScreen } from '@game/ui/titlescreen.ts';
import { QuestLogPanel } from '@game/ui/questlog.ts';
import { TownPanel, type TownData } from '@game/ui/town.ts';
import { QUESTS } from '@game/world/quests.ts';
import { buyPrice, sellPrice, gambleCost } from '@game/systems/town/economy.ts';
import { hireCost, reviveCost } from '@game/systems/merc/merc.ts';
import { GameAudio } from '@engine/audio/index.ts';
import { serializeGame, applySave, saveToDB, loadFromDB } from '@game/systems/save/index.ts';
import { WaypointPanel } from '@game/ui/waypoint.ts';
import { listWaypoints } from '@game/systems/waypoint/waypoint.ts';
import type { CharClass } from '@game/data/schema.ts';
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
    background: '#0a0a0f', resizeTo: window, antialias: true,
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

  // 选职界面 (Promise 化: 选定后再开局)
  const cls = await new Promise<CharClass>((res) => {
    const title = new TitleScreen((c) => res(c));
    title.show();
  });
  const game = new Game(0xC0FFEE, cls); // 构造时自动加载罗格营地

  // ----- 渲染层 -----
  const sprites = new Map<number, Container>();
  const actors = new Map<number, ActorSprite>();
  const corpseLayer = new Container();
  const goldLayer = new Container();
  const itemLayer = new Container();
  const swingLayer = new Container();
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
  scene.entityLayer.addChild(missileLayer);
  scene.entityLayer.addChild(mercLayer);
  // 区域切换时重建的静态内容
  let lastAreaId = '';
  let npcMarkers: { name: string; greeting: string; x: number; y: number }[] = [];
  function syncArea(): void {
    const a = game.currentArea;
    if (a.id === lastAreaId) return;
    lastAreaId = a.id;
    // 重建地砖 (区域尺寸+主题)
    let h = 2166136261;
    for (let i = 0; i < a.id.length; i++) h = (Math.imul(h ^ a.id.charCodeAt(i), 16777619)) >>> 0;
    scene.ground.removeChildren();
    buildGround(scene.ground, a.size[0], a.size[1], mulberry32(h), a.isTown ? 'town' : 'wilderness');
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
        npcMarkers.push({ name: npc.name, greeting: npc.greeting, x: nx, y: ny });
        const s = gridToScreen({ x: nx, y: ny });
        const g = new Graphics().circle(0, 0, 8).fill({ color: 0xe8d27a }).stroke({ color: 0x000000, width: 2 });
        const t = new Text({ text: npc.name, style: { fontFamily: 'Georgia,serif', fontSize: 11, fill: 0xffe08a, stroke: { color: 0x000000, width: 3 } } });
        t.anchor.set(0.5, 1); t.position.set(s.x, s.y - 12);
        g.position.set(s.x, s.y); g.zIndex = depthKey({ x: nx, y: ny }); t.zIndex = depthKey({ x: nx, y: ny });
        npcLayer.addChild(g, t);
      });
    }
  }
  const damageTexts: { t: Text; life: number }[] = [];
  let shakeMag = 0; // 屏震强度(衰减)
  let hitstop = 0; // 顿帧(秒), >0 时冻结模拟
  let prevGold = 0; // 上帧金币(检测拾取播币音)
  let prevInv = 0; // 上帧背包数(检测拾物)

  function actorKind(e: Entity): ActorKind {
    if (e.kind === 'player') return 'humanoid';
    if (e.defId === 'andariel') return 'caster';
    if (e.ai === 'shaman') return 'caster';
    if (e.ai === 'zombie' || e.ai === 'fallen' || e.defId === 'brute' || e.defId === 'hound' || e.defId === 'spitter') return 'beast';
    return 'humanoid';
  }

  function makeSprite(e: Entity): Container {
    const c = new Container();
    const actor = createActorSprite({ kind: actorKind(e), color: e.color, size: e.size });
    actors.set(e.id, actor);
    c.addChild(actor.container);
    // 精英描边光环 + 名牌
    if (e.elite) {
      const ring = new Graphics().ellipse(0, e.size * 0.5, e.size * 1.35, e.size * 0.72).stroke({ color: e.elite.color, width: 3, alpha: 0.9 });
      c.addChild(ring);
      const nm = new Text({ text: e.elite.name, style: { fontFamily: 'Georgia,serif', fontSize: 11, fill: e.elite.color, stroke: { color: 0x000000, width: 3 } } });
      nm.anchor.set(0.5, 1); nm.position.set(0, -e.size - 20);
      c.addChild(nm);
    }
    // 血条 (受伤才显)
    const hpbg = new Graphics().rect(-14, -e.size - 16, 28, 4).fill({ color: 0x000000, alpha: 0.6 });
    const hp = new Graphics().rect(-13, -e.size - 15, 26, 2).fill({ color: 0x6ee08a });
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
    hp.tint = ratio > 0.5 ? 0x6ee08a : ratio > 0.25 ? 0xe0c020 : 0xe23a3a;
  }

  function spawnDamageText(): void {
    for (const ev of game.events) {
      const s = gridToScreen(ev.pos);
      const t = new Text({
        text: ev.killed ? `${ev.amount}!` : `${ev.amount}`,
        style: {
          fontFamily: 'Georgia, serif',
          fontSize: ev.killed ? 22 : 16,
          fill: ev.toPlayer ? 0xff5e4a : ev.killed ? 0xffd76b : 0xffffff,
          stroke: { color: 0x000000, width: 3 },
          fontWeight: '700',
        },
      });
      t.anchor.set(0.5);
      t.position.set(s.x, s.y - 18);
      t.zIndex = 1e9;
      scene.entityLayer.addChild(t);
      damageTexts.push({ t, life: 0.8 });
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
      g.position.set(s.x, s.y - 6);
      g.zIndex = depthKey(sw.pos) + 0.5;
      swingLayer.addChild(g);
    }
  }

  const RARITY_COLOR: Record<string, number> = {
    normal: 0xc8c8c8, magic: 0x6a8cff, rare: 0xffe85a, set: 0x33cc33, unique: 0xb8843a,
  };
  function syncGroundItems(): void {
    itemLayer.removeChildren();
    for (const gi of game.groundItems) {
      const s = gridToScreen(gi.pos);
      const col = RARITY_COLOR[gi.item.rarity] ?? 0xc8c8c8;
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
      const rad = m.kind === 'fireball' || m.kind === 'nova' ? 8 : 5;
      const g = new Graphics().circle(0, 0, rad).fill({ color: m.color }).stroke({ color: 0x000000, width: 1 });
      // 拖尾
      g.circle(-m.vel.x * 6, -m.vel.y * 3, rad * 0.6).fill({ color: m.color, alpha: 0.4 });
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
  const hud = new HUD(game, (slot) => game.useSkill(slot));

  // 背包/装备面板 (打开时暂停模拟)
  let paused = false;
  const panel = new InventoryPanel(game, () => { panel.hide(); paused = false; });
  const bagBtn = document.createElement('div');
  bagBtn.textContent = '🎒';
  bagBtn.style.cssText =
    'position:absolute;left:calc(14px + env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom));' +
    'width:54px;height:54px;border-radius:12px;background:#1a1a24cc;border:2px solid #6a5a3a;display:flex;' +
    'align-items:center;justify-content:center;font-size:26px;pointer-events:auto;z-index:40;box-shadow:0 3px 8px #000a;';
  const skillPanel = new SkillTreePanel(game, () => { skillPanel.hide(); paused = false; });
  function closePanels(): void { panel.hide(); skillPanel.hide(); questLog.hide(); town.hide(); wp.hide(); paused = false; }
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
    'position:absolute;left:calc(78px + env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom));' +
    'width:54px;height:54px;border-radius:12px;background:#1a1a24cc;border:2px solid #6a5a3a;display:flex;' +
    'align-items:center;justify-content:center;font-size:26px;pointer-events:auto;z-index:40;box-shadow:0 3px 8px #000a;';
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
    'position:absolute;left:calc(142px + env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom));' +
    'width:54px;height:54px;border-radius:12px;background:#1a1a24cc;border:2px solid #6a5a3a;display:flex;' +
    'align-items:center;justify-content:center;font-size:26px;pointer-events:auto;z-index:40;box-shadow:0 3px 8px #000a;';
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
    };
  }
  const town = new TownPanel({
    onBuy: (uid) => { game.buyItem(uid); town.refresh(buildTownData()); },
    onSell: (uid) => { game.sellItem(uid); town.refresh(buildTownData()); },
    onGamble: () => { game.gamble(); town.refresh(buildTownData()); },
    onIdentify: (uid) => { game.identifyItem(uid); town.refresh(buildTownData()); },
    onHireMerc: () => { game.hireMerc(); town.refresh(buildTownData()); },
    onReviveMerc: () => { game.reviveMerc(); town.refresh(buildTownData()); },
    onClose: () => { town.hide(); paused = false; },
  });
  const townBtn = document.createElement('div');
  townBtn.textContent = '🏛';
  townBtn.style.cssText =
    'position:absolute;left:calc(206px + env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom));' +
    'width:54px;height:54px;border-radius:12px;background:#1a1a24cc;border:2px solid #6a5a3a;display:flex;' +
    'align-items:center;justify-content:center;font-size:24px;pointer-events:auto;z-index:40;box-shadow:0 3px 8px #000a;';
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

  // 顶部右侧功能按钮 (航点/存档/读档)
  function topBtn(emoji: string, topPx: number, onTap: () => void): void {
    const b = document.createElement('div');
    b.textContent = emoji;
    b.style.cssText =
      `position:absolute;right:calc(12px + env(safe-area-inset-right));top:calc(${topPx}px + env(safe-area-inset-top));` +
      'width:42px;height:42px;border-radius:10px;background:#1a1a24cc;border:2px solid #6a5a3a;display:flex;' +
      'align-items:center;justify-content:center;font-size:20px;pointer-events:auto;z-index:40;box-shadow:0 2px 6px #000a;';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); audio.sfx('select'); onTap(); });
    document.body.appendChild(b);
  }
  // 航点
  const wp = new WaypointPanel((id) => { game.loadArea(id); wp.hide(); paused = false; }, () => { wp.hide(); paused = false; });
  topBtn('🗺', 70, () => {
    if (wp.open) { wp.hide(); paused = false; }
    else { closePanels(); wp.show(listWaypoints(game.discoveredWaypoints, AREAS)); paused = true; }
  });
  // 存档 / 读档
  topBtn('💾', 120, () => { saveToDB(serializeGame(game)).then(() => game.notices.push('已保存进度')); });
  topBtn('📂', 170, () => {
    loadFromDB().then((d) => { if (d) { applySave(game, d); game.notices.push('已读取存档'); } else game.notices.push('暂无存档'); });
  });
  let audioOn = true;
  topBtn('🔊', 220, () => { audioOn = !audioOn; audio.setEnabled(audioOn); game.notices.push(audioOn ? '音效开' : '音效关'); });

  // 小地图 (区域俯瞰: 玩家/怪/出口/雇佣兵)
  const mm = document.createElement('canvas');
  mm.width = 140; mm.height = 104;
  mm.style.cssText =
    'position:absolute;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top));' +
    'width:140px;height:104px;border:1px solid #6a5a3a99;background:#0009;border-radius:6px;pointer-events:none;z-index:35;';
  document.body.appendChild(mm);
  const mmctx = mm.getContext('2d');
  function syncMinimap(): void {
    if (!mmctx) return;
    mmctx.clearRect(0, 0, 140, 104);
    const [aw, ah] = game.currentArea.size;
    const sx = 140 / aw, sy = 104 / ah;
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

  // NPC 问候 (营地靠近时显示)
  const npcEl = document.createElement('div');
  npcEl.style.cssText =
    'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));max-width:80%;' +
    'padding:8px 14px;border-radius:10px;background:#0c0c12d8;border:1px solid #6a5a3a;color:#e8e0d0;font-size:13px;' +
    'text-align:center;pointer-events:none;display:none;z-index:45;';
  document.body.appendChild(npcEl);

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
        if (ev.killed) { hitstop = Math.max(hitstop, 0.05); shakeMag = Math.max(shakeMag, 7); }
        else if (ev.toPlayer) shakeMag = Math.max(shakeMag, 6);
        else shakeMag = Math.max(shakeMag, 2.5);
      }
    },
    (_alpha) => {
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
      // 音效: 命中/受击/升级/拾取
      if (game.events.length) {
        if (game.events.some((e) => e.toPlayer)) audio.sfx('hurt');
        else audio.sfx('hit');
      }
      if (game.notices.some((n) => n.includes('升级'))) audio.sfx('levelup');
      if (game.goldTotal > prevGold) audio.sfx('coin');
      if (game.inventory.length > prevInv) audio.sfx('pickup');
      prevGold = game.goldTotal;
      prevInv = game.inventory.length;
      spawnDamageText();
      // 伤害数字漂浮淡出
      for (const d of damageTexts) {
        d.life -= 1 / 60;
        d.t.position.y -= 0.6;
        d.t.alpha = Math.max(0, d.life / 0.8);
      }
      for (let i = damageTexts.length - 1; i >= 0; i--) {
        if (damageTexts[i].life <= 0) { damageTexts[i].t.destroy(); damageTexts.splice(i, 1); }
      }
      hud.update();
      syncMinimap();
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
        if (near) { npcEl.style.display = 'block'; npcEl.innerHTML = `<b style="color:#ffe08a">${near.name}</b>：${near.greeting}`; }
        else npcEl.style.display = 'none';
      } else npcEl.style.display = 'none';
      if (game.state === 'dead') {
        banner.style.display = 'flex';
        banner.innerHTML = '☠ 你已阵亡<div style="font-size:15px;opacity:.85">点击重生</div>';
      } else if (game.state === 'cleared' && !game.currentArea.isTown) {
        banner.style.display = 'flex';
        banner.innerHTML = '⚔ 区域肃清!<div style="font-size:15px;opacity:.85">走到发光出口前往相邻区域</div>';
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
    },
  );
  loop.start();

  (window as unknown as { __iron: unknown }).__iron = { app, game, scene, joy };
}

main().catch((e) => {
  console.error(e);
  showError('运行出错:\n' + errText(e));
});
