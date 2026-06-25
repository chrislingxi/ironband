# Ironband — 暗黑式刷宝 ARPG（手游 / Web）

数据驱动的 Diablo 2 风格等距 ARPG，从零重构。纯单机，TypeScript + PixiJS(WebGL)，
可发布到 GitHub Pages 在浏览器/手机直接玩。

> 状态：**Phase 0 脊柱**（等距渲染 + 浮动摇杆 + 固定步长循环 + 数据契约 + CI 闸门）。
> 路线图与任务板见 [`docs/MODULES.md`](docs/MODULES.md)，设计决策见 [`docs/DESIGN.md`](docs/DESIGN.md)。

## 快速开始
```bash
npm install
npm run dev        # 本地开发 (Vite)
npm run typecheck  # 类型闸门
npm test           # 单测闸门
npm run build      # 产出 dist/ (GitHub Pages 静态站)
```

## 目录
```
src/engine/   引擎: loop / ecs / input(joystick) / render(pixi,iso) / math
src/game/     游戏: data(D2风格数据契约) / systems / entities / classes / world / ui
pipeline/     资产提取 CLI (从自有 D2 安装提取原版素材, 见 docs/ASSET_PIPELINE.md)
assets/       占位素材(FLARE/开源); 提取的原版素材覆盖于 assets/extracted/(不入库)
legacy/       旧版单文件原型 (仅供参考)
```

## 美术 / IP
仓库只含原创代码 + 开源占位素材。原版 D2 美术/音乐通过提取工具从**你自有的合法安装**
转换后本地覆盖，**不入库**。详见 [`docs/ASSET_PIPELINE.md`](docs/ASSET_PIPELINE.md)。
