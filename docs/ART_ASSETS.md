# Ironband 美术素材生产 & 接入指南

> 目标：把程序化矢量绘制升级为 App Store 级真实精灵图。
> **分工**：你在 Mac 端用 Claude 生成 PNG → 丢进指定目录 → 我（代码侧）自动加载覆盖。

---

## 0. 工作流（三步）

1. **生成**：用本文每个素材下方的 prompt，在 Mac 端 Claude（或任意图像模型）生成 PNG。
2. **放置**：把文件按「文件名」列放进仓库的 `public/assets/<类别>/<key>.png`。
   - 路径必须**完全一致**（大小写敏感），否则加载不到。
   - 例：野蛮人立绘 → `public/assets/char/barbarian.png`
3. **生效**：
   - 本地预览：`npm run dev`，刷新即用真图。
   - 上线：推到分支 → Actions 自动把 `public/assets/` 同步到站点根 `assets/`，线上即覆盖。
   - **无需改任何代码**：渲染层按 key 找 `assets/<key>.png`，命中就用真图，缺失就回退矢量。

> 提交大图前可先压缩（TinyPNG / `pngquant`），单文件建议 < 300KB。

---

## 1. 通用风格前缀（每个 prompt 都先粘这段，中文）

```
一张高品质手游精灵图，精致等距动作 RPG 风格（《暗黑破坏神 2》的可爱 Q 版 / 赤豆
人比例重塑）。手绘质感，不要扁平矢量、不要只有描边的卡通风。丰富的柔和渐变阴影，
光源来自左上方的轮廓光；粗的深色描边（#1a0800）；1:2.5 大头身比例（大头、短身）。
饱和但暗调的配色：暖金（#e7c66a）、深棕（#241410）、哥特暗色。主体居中，俯视
3/4 视角面朝镜头，脚在底部。**透明背景（PNG 透明通道）**，不要烘焙地面阴影、不要
边框、不要文字。单个角色，全身入画。
```

之后接每个素材的「具体描述」+「输出要求」。

**统一输出要求**（也粘进每个 prompt 末尾，中文）：
```
输出：正方形 PNG，512×512，透明背景，主体居中、约占画面高度 80%，边缘锐利干净。
```

> 英文模型表现更稳时，可用英文等价版（见文末「附：英文对照」）。中英任选其一即可。

---

## 2. 素材清单（按优先级分层）

> Key = 渲染层请求的标识；文件放 `public/assets/<key>.png`。
> ⭐ = 第一批（最高可见度，先做这些就能整体焕新）。

### Tier 1 ⭐ 角色（3 职业）— `public/assets/char/`
| key | 文件 | 具体描述（接在通用前缀后） |
|---|---|---|
| `char/barbarian` | char/barbarian.png | 野蛮人：魁梧赤膊战士，毛皮护肩，络腮胡，手持双刃巨斧，皮甲斜带，怒目。棕红主色。 |
| `char/amazon` | char/amazon.png | 亚马逊：女猎手，皮甲胸弧+单肩轻甲，马尾，背后箭袋，手持大弓搭箭。古铜+青色。 |
| `char/sorceress` | char/sorceress.png | 法师：尖帽宝珠，飘逸长袍裙摆，披肩领，手持发光法杖，指尖元素微光。紫蓝主色。 |

### Tier 1 ⭐ 地块（3 主题）— `public/assets/tile/`
> 这些是**等距菱形地砖**，决定场景细腻度，影响每一帧。
| key | 文件 | 描述 + 特殊输出要求 |
|---|---|---|
| `tile/wilderness` | tile/wilderness.png | 暗森林草泥地，杂草、碎石、苔斑，D2 哥特荒野。**输出：256×128 的等距菱形(2:1)地砖，菱形内填满、四角透明，可无缝平铺。** |
| `tile/town` | tile/town.png | 营地砖石路，暖石灰，铺装石缝。同上等距菱形 256×128 可平铺。 |
| `tile/desert` | tile/desert.png | 沙漠沙地，沙纹、碎石、干裂。同上等距菱形 256×128 可平铺。 |

### Tier 2 怪物 — `public/assets/mon/`
| key | 文件 | 描述 |
|---|---|---|
| `mon/fallen` | mon/fallen.png | 堕落者：小型橙红恶魔小鬼，尖耳獠牙，持简陋短矛，鬼祟。 |
| `mon/skeleton` | mon/skeleton.png | 骷髅兵：灰白骨架，破损锈剑+小圆盾，空洞眼窝红光。 |
| `mon/zombie` | mon/zombie.png | 僵尸：病绿臃肿，腐肉斑驳，伸出残臂，蹒跚。 |
| `mon/shaman` | mon/shaman.png | 萨满：紫袍施法小鬼，骨杖顶火焰，兜帽。 |
| `mon/archer` | mon/archer.png | 腐化弓手：兜帽斗篷，骷髅手持长弓。 |
| `mon/hound` | mon/hound.png | 恶犬：深棕四足野兽，獠牙鬃毛，红眼，低伏。**3/4 侧身。** |
| `mon/brute` | mon/brute.png | 蛮兽：魁梧巨汉怪，厚重肌肉，巨拳，小头缩肩。 |
| `mon/spitter` | mon/spitter.png | 吐酸怪：蹲伏绿色蟾形，背部毒疣，凸眼阔嘴。**3/4 侧身。** |

### Tier 2 Boss — `public/assets/mon/`
| key | 文件 | 描述 + 尺寸 |
|---|---|---|
| `mon/andariel` | mon/andariel.png | 安达莉尔：痛苦女王，蜘蛛下身+女性上身恶魔，毒腺辉光，皇冠，粉红恶魔眼。**输出 768×768。** |
| `mon/duriel` | mon/duriel.png | 督瑞尔：痛苦之王，矮壮蛆形巨兽，巨颚獠牙，短角，钳爪，分节苍白蛆身，寒冷冷光眼。**输出 768×768。** |

### Tier 3 营地 NPC — `public/assets/npc/`
> 6 位镇民立绘。可共用「长袍站立镇民」基底，按身份配色/道具。
| key | 文件 | 身份/描述 |
|---|---|---|
| `npc/akara` | npc/akara.png | 阿卡拉：白金长袍女祭司，发光宝珠。 |
| `npc/kashya` | npc/kashya.png | 卡夏：红甲弓队长，背弓。 |
| `npc/charsi` | npc/charsi.png | 查西：棕围裙女铁匠，持铁锤。 |
| `npc/gheed` | npc/gheed.png | 吉德：紫袍胖赌商，金币。 |
| `npc/warriv` | npc/warriv.png | 沃里夫：蓝袍宽檐帽车队商。 |
| `npc/cain` | npc/cain.png | 迪卡凯恩：灰袍白须老智者，持古卷。 |

### Tier 3 UI 皮肤 — `public/assets/ui/`
> 这些是**九宫格(9-slice)可拉伸**框，决定界面质感。
| key | 文件 | 描述 + 输出 |
|---|---|---|
| `ui/hp_orb` | ui/hp_orb.png | 暗黑式生命球：红色液体玻璃球，金属雕花外框，高光。**256×256 透明。** |
| `ui/mana_orb` | ui/mana_orb.png | 同上蓝色法力球。256×256 透明。 |
| `ui/btn_frame` | ui/btn_frame.png | 圆形技能键金属外框，宝石镶嵌槽，空心中央。256×256 透明。 |
| `ui/panel` | ui/panel.png | 哥特羊皮纸面板背景，金属包边，**九宫格可拉伸**（四角不变形）。512×512。 |

---

## 2.5 即用 prompt（Tier 1，整段直接复制，中文）

> 以下每段都已把「风格前缀 + 具体描述 + 输出要求」拼好，复制整段即可生成。

**① 野蛮人 → `public/assets/char/barbarian.png`**
```
一张高品质手游精灵图，精致等距动作 RPG 风格（《暗黑破坏神 2》的可爱 Q 版赤豆人比例）。
手绘质感，柔和渐变阴影，左上轮廓光，粗深色描边(#1a0800)，1:2.5 大头身比例，饱和暗调
（暖金 #e7c66a、深棕 #241410、哥特暗色）。主体居中，俯视 3/4 视角面朝镜头，脚在底部，
透明背景，不要阴影/边框/文字。
内容：野蛮人——魁梧赤膊战士，巨大毛皮护肩，络腮胡，皮甲斜带，双手紧握一把双刃巨斧，
肌肉虬结，怒目，棕红主色。
输出：正方形 PNG，512×512，透明背景，主体居中约占画面高 80%，边缘锐利。
```

**② 亚马逊 → `public/assets/char/amazon.png`**
```
（同上风格前缀）
内容：亚马逊女猎手——皮甲胸弧 + 单肩轻甲，高束马尾，背后箭袋，手持一把大弓并已搭箭，
身姿矫健，古铜肤色配青色布料。
输出：正方形 PNG，512×512，透明背景，主体居中约占画面高 80%，边缘锐利。
```

**③ 法师 → `public/assets/char/sorceress.png`**
```
（同上风格前缀）
内容：女法师——尖顶法帽镶宝珠，飘逸长袍裙摆，披肩领，手持顶端发光的法杖，指尖萦绕
元素微光，紫蓝主色，神秘。
输出：正方形 PNG，512×512，透明背景，主体居中约占画面高 80%，边缘锐利。
```

**④ 荒野地砖 → `public/assets/tile/wilderness.png`**（注意：等距菱形地砖）
```
一块等距（2:1）菱形地砖，俯视手绘风，《暗黑破坏神 2》哥特荒野质感：暗森林草泥地，
点缀杂草、碎石、苔斑，柔和阴影与细节纹理，暗绿褐配色。菱形需填满整张图、四角透明，
可上下左右无缝平铺，不要边框/文字。
输出：PNG，256×128，透明背景（仅菱形不透明），可平铺。
```

**⑤ 营地地砖 → `public/assets/tile/town.png`**
```
一块等距（2:1）菱形地砖，俯视手绘风：营地铺装石板路，暖石灰色，石缝与磨损细节。
菱形填满、四角透明、可无缝平铺，不要边框/文字。
输出：PNG，256×128，透明背景，可平铺。
```

**⑥ 沙漠地砖 → `public/assets/tile/desert.png`**
```
一块等距（2:1）菱形地砖，俯视手绘风：沙漠沙地，沙纹起伏、零星碎石与干裂纹理，
暖沙黄褐色。菱形填满、四角透明、可无缝平铺，不要边框/文字。
输出：PNG，256×128，透明背景，可平铺。
```

> 怪物 / Boss / NPC / UI 的具体描述见上方第 2 节表格，套同一「风格前缀 + 输出要求」即可。
> Boss 用 768×768，UI 球/框用 256×256，面板 512×512。

## 3. 命名/路径对照（务必精确）

```
public/assets/
├── char/   barbarian.png  amazon.png  sorceress.png
├── mon/    fallen.png skeleton.png zombie.png shaman.png archer.png
│           hound.png brute.png spitter.png andariel.png duriel.png
├── npc/    akara.png kashya.png charsi.png gheed.png warriv.png cain.png
├── tile/   wilderness.png town.png desert.png
└── ui/     hp_orb.png mana_orb.png btn_frame.png panel.png
```

## 4. 验收

- 放好文件后 `npm run dev`，进对应场景看是否替换成真图。
- 角色/怪物若方向不对或偏移，告诉我，我在渲染层调锚点/缩放（接入代码已支持按 key 覆盖）。
- 一次不用全做；**先做 Tier 1（3 角色 + 3 地块）**，整体观感就会明显跨档。

## 5. 给我反馈的格式

> "char/barbarian.png 已放好" / "tile 这批生成了，但 desert 偏暗" —— 我据此调集成参数或重出 prompt。

---

## 附：英文对照（模型偏好英文时用）

**风格前缀（英文）**
```
A premium mobile-game sprite, polished isometric action-RPG (Diablo II reimagined
as cute chibi / Q-version). Hand-painted, NOT flat vector. Rich soft-gradient
shading, rim light from upper-left, thick dark outline (#1a0800), 1:2.5 big-head
ratio, saturated moody palette (warm golds #e7c66a, deep browns #241410, gothic
darks). Centered subject, 3/4 top-down view facing camera, feet at bottom edge.
Transparent PNG background, no baked shadow, no border, no text. Full body in frame.
```
**输出要求（英文）**
```
Output: square PNG 512×512, transparent background, subject centered ~80% of frame
height, crisp clean edges.
```
**地砖（英文，2:1 iso diamond）**
```
A single isometric (2:1) diamond ground tile, top-down hand-painted. <theme>.
Diamond fills the image with transparent corners, seamlessly tileable. No border,
no text. Output PNG 256×128, transparent corners, tileable.
```
（`<theme>` 替换：wilderness = dark forest grass-dirt with weeds/pebbles/moss；
town = warm flagstone path；desert = sandy dunes with ripples/cracks/pebbles。）
</content>
