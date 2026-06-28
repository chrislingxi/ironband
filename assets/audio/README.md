# 音效采样位 (CC0)

把 **CC0 / 公有领域** 音频文件丢进本目录即自动启用真音效, 文件名见下;
缺文件时游戏回退到程序化合成 (`src/engine/audio/audio.ts`), 零风险优雅降级。
加载逻辑: `src/engine/audio/samples.ts` (按基名探测 `.ogg/.mp3/.webm/.wav`)。

| 文件名 (任一扩展名) | 用途 |
| --- | --- |
| `hit.ogg`     | 打击命中 |
| `hurt.ogg`    | 角色受伤 |
| `skill.ogg`   | 释放技能 |
| `pickup.ogg`  | 拾取物品 |
| `coin.ogg`    | 金币 |
| `levelup.ogg` | 升级 |
| `death.ogg`   | 死亡 |
| `select.ogg`  | 界面选择 |
| `bgm.ogg`     | 背景音乐 (循环) |

推荐来源 (均含 CC0 资源): Kenney.nl、Sonniss GDC Bundle、Freesound (筛 CC0)。
采用后请在仓库根 `ATTRIBUTION.md` 登记来源 (CC0 无需署名, 但登记便于追溯)。
