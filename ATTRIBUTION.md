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

## 音频 — Kenney (CC0 1.0)
`public/assets/audio/*.mp3` 短音效来自 [Kenney.nl](https://kenney.nl) 的免费素材包，
许可 **CC0 1.0**(公有领域，https://creativecommons.org/publicdomain/zero/1.0/，无需署名，登记以便追溯)。
原 `.ogg` 经 ffmpeg 转 mp3(单声道/44.1kHz，因 iOS Safari 不解 Ogg Vorbis)。映射:

| 游戏音效 | 来源文件 | Kenney 包 |
| --- | --- | --- |
| `hit.mp3`     | impactPunch_medium_000 | Impact Sounds |
| `hurt.mp3`    | impactSoft_heavy_000   | Impact Sounds |
| `skill.mp3`   | forceField_000         | Sci-Fi Sounds |
| `pickup.mp3`  | handleSmallLeather     | RPG Audio |
| `coin.mp3`    | handleCoins            | RPG Audio |
| `levelup.mp3` | jingles_HIT03          | Music Jingles |
| `death.mp3`   | lowFrequency_explosion_000 | Sci-Fi Sounds |
| `select.mp3`  | click_001              | Interface Sounds |

BGM 仍用程序化哥特 drone 合成(`src/engine/audio/audio.ts`);如需真音乐,
丢入 `assets/audio/bgm.mp3`(CC0)即自动启用,并在此登记。
缺任一文件时该音效自动回退合成,见 `src/engine/audio/samples.ts`。
