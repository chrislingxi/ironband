# 第三方素材署名 / Third-party Asset Attribution

本仓库使用的开源素材及许可。原版 D2 美术/音乐绝不入库(见 `docs/ASSET_PIPELINE.md`)。

## UI 图标 — game-icons.net (CC-BY 3.0)
`public/assets/icon/*.svg` 来自 [game-icons.net](https://game-icons.net)，
作者为 Lorc、Delapouite、Skoll 等贡献者，许可 **CC-BY 3.0**
(https://creativecommons.org/licenses/by/3.0/)。本项目将其染金后按 key 接入 UI 按钮；
缺图回退 emoji。图标 key → 来源图标名的映射见 `scripts/gen-icons.mjs` 的 `ICON_MAP`，
可据此重新生成。

## 字体 — Cinzel (SIL OFL 1.1)
标题/数值展示字。

## 角色 / 怪物 / 地块 / NPC / UI 精灵
`public/assets/{char,mon,npc,tile,ui}/*.png` 为本项目自有生成素材
(生产流程见 `docs/ART_ASSETS.md`)。

## 音频(规划中)
若接入 CC0 音效(Kenney / Sonniss / Freesound CC0),将在此登记每个文件的来源与许可。
