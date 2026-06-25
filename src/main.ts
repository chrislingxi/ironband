import { Application, Container, Graphics, Text } from 'pixi.js';
import { IsoScene } from '@engine/render/IsoScene.ts';
import { GameLoop } from '@engine/loop.ts';
import { Joystick } from '@engine/input/joystick.ts';
import { gridToScreen, screenToGrid, depthKey } from '@engine/math/iso.ts';
import { normalize } from '@engine/math/vec.ts';
import { Game } from '@game/sim/Game.ts';
import type { Entity } from '@game/entities/entity.ts';
import { HUD } from '@game/ui/hud.ts';
import { InventoryPanel } from '@game/ui/inventory.ts';

// ── M1 战斗沙盒 ──
// Phase0 等距脊柱 + T3 战斗内核 + T4 怪物AI 的可玩集成.
// 占位形状渲染 (T1 并行会替换为 FLARE 等距精灵 + 光照).

async function main() {
  const app = new Application();
  await app.init({
    background: '#0a0a0f', resizeTo: window, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  const scene = new IsoScene(app);
  const COLS = 40, ROWS = 40;
  scene.buildPlaceholderGround(COLS, ROWS);

  const game = new Game(0xC0FFEE);
  game.player.pos = { x: COLS / 2, y: ROWS / 2 };

  // 布置一波怪 (血色荒野式): 骷髅 + 行尸 + 带萨满的堕落者群
  const cx = COLS / 2, cy = ROWS / 2;
  game.spawnMonster('skeleton', cx + 6, cy - 4);
  game.spawnMonster('skeleton', cx + 7, cy + 3);
  game.spawnMonster('zombie', cx - 5, cy + 6);
  game.spawnMonster('zombie', cx + 4, cy + 7);
  game.spawnMonster('shaman', cx - 8, cy - 7);
  for (let i = 0; i < 4; i++) game.spawnMonster('fallen', cx - 7 + i, cy - 6 + (i % 2));

  // ----- 渲染层 -----
  const sprites = new Map<number, Container>();
  const corpseLayer = new Container();
  const goldLayer = new Container();
  const itemLayer = new Container();
  const swingLayer = new Container();
  scene.entityLayer.addChild(corpseLayer);
  scene.entityLayer.addChild(goldLayer);
  scene.entityLayer.addChild(itemLayer);
  scene.entityLayer.addChild(swingLayer);
  const damageTexts: { t: Text; life: number }[] = [];
  let shakeMag = 0; // 屏震强度(衰减)
  let hitstop = 0; // 顿帧(秒), >0 时冻结模拟

  function makeSprite(e: Entity): Container {
    const c = new Container();
    const body = new Graphics().circle(0, 0, e.size).fill({ color: e.color }).stroke({ color: 0x000000, width: 2 });
    body.label = 'body';
    // 朝向指示 (传达打击方向, 强化近战手感)
    const point = new Graphics().poly([e.size, 0, e.size + 7, -4, e.size + 7, 4]).fill({ color: 0x000000, alpha: 0.5 });
    point.label = 'point';
    // 血条 (受伤才显)
    const hpbg = new Graphics().rect(-14, -e.size - 12, 28, 4).fill({ color: 0x000000, alpha: 0.6 });
    const hp = new Graphics().rect(-13, -e.size - 11, 26, 2).fill({ color: 0x6ee08a });
    hpbg.label = 'hpbg'; hp.label = 'hp';
    hpbg.visible = false;
    c.addChild(body, point, hpbg, hp);
    scene.entityLayer.addChild(c);
    return c;
  }

  function syncEntity(e: Entity): void {
    let c = sprites.get(e.id);
    if (!c) { c = makeSprite(e); sprites.set(e.id, c); }
    const s = gridToScreen(e.pos);
    c.position.set(s.x, s.y);
    c.zIndex = depthKey(e.pos);
    const body = c.getChildByLabel('body') as Graphics;
    body.tint = e.hitFlash > 0 ? 0xffffff : 0xffffff; // 占位: 白闪用 alpha 叠加
    body.alpha = 1;
    const flash = c.getChildByLabel('point') as Graphics;
    flash.rotation = e.facing;
    const ratio = Math.max(0, e.combat.hp / e.combat.maxHp);
    const hpbg = c.getChildByLabel('hpbg') as Graphics;
    const hp = c.getChildByLabel('hp') as Graphics;
    const damaged = ratio < 0.999;
    hpbg.visible = hp.visible = damaged;
    hp.scale.x = ratio;
    hp.tint = ratio > 0.5 ? 0x6ee08a : ratio > 0.25 ? 0xe0c020 : 0xe23a3a;
    // 受击白闪覆盖
    if (e.hitFlash > 0) { body.tint = 0xffd0d0; }
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
  bagBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (panel.open) { panel.hide(); paused = false; }
    else { panel.show(); paused = true; }
  });
  document.body.appendChild(bagBtn);

  // 升级等提示
  const noticeEl = document.createElement('div');
  noticeEl.style.cssText =
    'position:absolute;top:28%;left:0;width:100%;text-align:center;font-family:Georgia,serif;font-size:34px;' +
    'font-weight:800;color:#ffe08a;text-shadow:0 2px 10px #000;pointer-events:none;opacity:0;transition:opacity .4s;z-index:60;';
  document.body.appendChild(noticeEl);
  let noticeUntil = 0;

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
    else if (game.state === 'cleared') game.nextWave();
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
      // 同步实体精灵 (清理已死/已移除)
      const live = new Set<number>([game.player.id, ...game.monsters.map((m) => m.id)]);
      for (const [id, c] of sprites) {
        if (!live.has(id)) { c.destroy({ children: true }); sprites.delete(id); }
      }
      syncEntity(game.player);
      for (const m of game.monsters) syncEntity(m);
      syncCorpses();
      syncGold();
      syncGroundItems();
      syncSwings();
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
      if (game.notices.length) {
        noticeEl.textContent = game.notices[game.notices.length - 1];
        noticeEl.style.opacity = '1';
        noticeUntil = performance.now() + 1400;
        game.notices.length = 0;
      }
      if (noticeUntil && performance.now() > noticeUntil) { noticeEl.style.opacity = '0'; noticeUntil = 0; }
      if (game.state === 'dead') {
        banner.style.display = 'flex';
        banner.innerHTML = '☠ 你已阵亡<div style="font-size:15px;opacity:.85">点击重生</div>';
      } else if (game.state === 'cleared') {
        banner.style.display = 'flex';
        banner.innerHTML = `⚔ 第 ${game.wave} 波 · 区域肃清!<div style="font-size:15px;opacity:.85">点击迎战下一波</div>`;
      } else {
        banner.style.display = 'none';
      }
      scene.centerOn(game.player.pos);
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

main().catch((e) => console.error(e));
