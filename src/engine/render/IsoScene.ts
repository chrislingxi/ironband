import { Application, Container, Graphics } from 'pixi.js';
import type { Vec2 } from '../math/vec.ts';
import { gridToScreen, TILE_W, TILE_H } from '../math/iso.ts';

// 等距场景渲染器: 地砖层 + 实体层(深度排序) + 相机跟随.
// 占位地砖用 Graphics 菱形; T9(美术管线)会把它替换为 FLARE/原版瓦片精灵.
export class IsoScene {
  readonly world = new Container(); // 相机平移作用于此
  readonly ground = new Container();
  readonly entityLayer = new Container();
  readonly entityLayer_sortable = true;

  constructor(private app: Application) {
    this.world.addChild(this.ground);
    this.world.addChild(this.entityLayer);
    this.entityLayer.sortableChildren = true; // zIndex 深度排序
    app.stage.addChild(this.world);
  }

  // 画一块占位地砖网格 (cols x rows). 棋盘色区分明暗, 验证等距视角.
  buildPlaceholderGround(cols: number, rows: number): void {
    this.ground.removeChildren();
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const s = gridToScreen({ x: gx, y: gy });
        const tile = new Graphics();
        const dark = (gx + gy) % 2 === 0;
        tile
          .moveTo(0, -TILE_H / 2)
          .lineTo(TILE_W / 2, 0)
          .lineTo(0, TILE_H / 2)
          .lineTo(-TILE_W / 2, 0)
          .closePath()
          .fill({ color: dark ? 0x2a2a33 : 0x33333d })
          .stroke({ color: 0x1a1a22, width: 1 });
        tile.position.set(s.x, s.y);
        this.ground.addChild(tile);
      }
    }
  }

  // 相机居中到某格子坐标.
  centerOn(g: Vec2): void {
    const s = gridToScreen(g);
    this.world.position.set(
      this.app.renderer.width / 2 - s.x,
      this.app.renderer.height / 2 - s.y,
    );
  }
}
