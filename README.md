# Ironband — 暗黑式刷宝 ARPG（手游 / Web）

数据驱动的 Diablo 2 风格等距 ARPG，从零重构。纯单机，TypeScript + PixiJS(WebGL)，
发布到 GitHub Pages 在浏览器/手机直接玩。

🎮 **在线试玩**：https://chrislingxi.github.io/ironband/ （合并到 main 后由 Actions 自动部署）

> 状态：**M1 近战切片 + M2 刷宝闭环可玩**。等距走位、命中判定、怪物AI个性、打击感、
> 野蛮人3技能、词缀掉落、装备改战力、经验升级、生死/波次循环均已就绪（占位美术，待 T1 换 FLARE 皮）。
> 路线图与任务板见 [`docs/MODULES.md`](docs/MODULES.md)，设计决策见 [`docs/DESIGN.md`](docs/DESIGN.md)。

## 怎么玩
- **移动**：左半屏拖动浮动摇杆
- **攻击**：自动攻击射程内最近的怪
- **技能**：右下三个技能键（猛击 / 双挥 / 战嚎）
- **背包**：左下 🎒 打开，点击物品穿戴、点击装备槽卸下
- **目标**：清场→点击迎战下一波；阵亡→点击重生

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
