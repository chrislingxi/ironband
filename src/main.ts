import { Application, Graphics } from 'pixi.js';
import { IsoScene } from '@engine/render/IsoScene.ts';
import { GameLoop } from '@engine/loop.ts';
import { Joystick } from '@engine/input/joystick.ts';
import { gridToScreen, screenToGrid, depthKey } from '@engine/math/iso.ts';
import { normalize } from '@engine/math/vec.ts';

// ── Phase 0 脊柱演示 ──
// 验证三件事: 等距视角能立住 / 浮动摇杆能驱动移动 / 固定步长循环 + 相机跟随.
// 占位英雄是个圆 (T1 等距渲染 / T9 美术管线 会替换为 FLARE/原版精灵).

async function main() {
  const app = new Application();
  await app.init({
    background: '#0a0a0f',
    resizeTo: window,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  const scene = new IsoScene(app);
  const COLS = 24;
  const ROWS = 24;
  scene.buildPlaceholderGround(COLS, ROWS);

  // 占位英雄
  const hero = new Graphics().circle(0, 0, 10).fill({ color: 0xffd76b }).stroke({ color: 0x000000, width: 2 });
  scene.entityLayer.addChild(hero);

  const player = { pos: { x: COLS / 2, y: ROWS / 2 }, speed: 4.5 };

  const joy = new Joystick(document.body);

  const loop = new GameLoop(
    (dt) => {
      // 摇杆屏幕方向 → 世界格子方向 (反等距投影), 让"上"对应屏幕上方移动.
      if (joy.active && joy.strength > 0.05) {
        const gdir = normalize(screenToGrid(joy.vector));
        player.pos.x += gdir.x * player.speed * joy.strength * dt;
        player.pos.y += gdir.y * player.speed * joy.strength * dt;
        player.pos.x = Math.max(0, Math.min(COLS - 1, player.pos.x));
        player.pos.y = Math.max(0, Math.min(ROWS - 1, player.pos.y));
      }
    },
    () => {
      const s = gridToScreen(player.pos);
      hero.position.set(s.x, s.y);
      hero.zIndex = depthKey(player.pos);
      scene.centerOn(player.pos);
    },
  );
  loop.start();

  // 暴露给调试
  (window as unknown as { __iron: unknown }).__iron = { app, scene, player, joy };
}

main().catch((e) => console.error(e));
