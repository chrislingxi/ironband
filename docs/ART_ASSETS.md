# Ironband 全量美术需求 & 接入指南

> 目标：把程序化矢量绘制升级为 App Store 级真实精灵图。
> **分工**：Mac 端 Claude Code 会话用 Chrome 驱动 ChatGPT 出图 → 去背/裁切/压缩 → 落到
> `public/assets/<类别>/<key>.png` → 自动 commit/push/开 PR。代码侧按 key 自动加载覆盖。
>
> 本文是**单一事实源（worklist）**：Mac 出图会话直接读它取「清单 + 每项 prompt + 输出规格」。
> 自动化会话的完整运行说明见 [`ART_GEN_AGENT.md`](ART_GEN_AGENT.md)。

---

## 0. 加载契约（与代码核对过）

- 运行时按 **key** 请求纹理：解析顺序 `assets/extracted/<key>.png` → `assets/<key>.png` → 命中用真图，缺失回退程序化矢量（见 `src/game/assets/loader.ts`）。
- 文件放进仓库的 **`public/assets/<key>.png`**（路径**大小写敏感**，必须完全一致）。
  - 本地 `npm run dev`：Vite 把 `public/` 当站点根，`assets/<key>.png` 即命中。
  - 上线：推到 `main` 后 `.github/workflows/build-site.yml` 用 `rsync` 把 `public/assets/` 同步到根 `assets/`，线上覆盖。**加 PNG 无需改代码、无需重建 index.html。**
- 运行时 key 来源（已核对）：
  - 玩家：`char/<职业>`（`src/main.ts` → `char/${cls}`）
  - 怪物 / Boss：`mon/<defId>`（`src/main.ts` → `mon/${defId}`）
  - 地砖：`tile/<theme>`，theme ∈ `wilderness|town|desert|hell|snow`（`src/main.ts` + `groundTiles.ts`）

---

## 1. 接入状态分组（重要：决定出图后是否立刻可见）

| 组 | 类别 | 是否即插即用 | 说明 |
|----|------|------------|------|
| **A** | `char/` `mon/`（含 Boss）`tile/` | ✅ **放图即生效** | 渲染层已走 `tryLoadTexture`，命中即覆盖矢量。**优先出这 21 张**——可见度最高，且能立刻验证整条 Chrome→出图→去背→提交→PR 链路。 |
| **B** | `npc/` `ui/` `item/` | ⚙️ **需先补加载代码** | NPC 现为文字、HUD 球为 canvas 绘制、物品 `sprite` 字段暂无人消费。PNG 出好后需在 UI 层加一行 `<img>`/纹理回退才显示。代码侧会单独补（见文末 TODO）。 |
| **C** | 技能图标 | ⚙️ **需重构** | 技能 `icon` 当前是 emoji 文本（🗡⚔💢…），改图标需把 emoji→纹理 key。范围大，暂不在本批。 |

> **建议出图顺序**：A（21 张，立即上线可见）→ B（27 张，代码接线后可见）→ C（后续）。

---

## 2. 通用风格前缀（每个 prompt 都先粘这段）

```
一张高品质手游精灵图，精致等距动作 RPG 风格（《暗黑破坏神 2》的可爱 Q 版 / 赤豆人比例重塑）。
手绘质感，不要扁平矢量、不要只有描边的卡通风。丰富的柔和渐变阴影，光源来自左上方的轮廓光；
粗的深色描边(#1a0800)；1:2.5 大头身比例（大头、短身）。饱和但暗调的配色：暖金(#e7c66a)、
深棕(#241410)、哥特暗色。主体居中，俯视 3/4 视角面朝镜头，脚在底部。单个主体，全身入画。
纯色干净背景（便于自动抠图），不要地面阴影、不要边框、不要文字、不要多个角色。
```

> ChatGPT 网页出图**不输出透明通道**，所以统一要求「纯色干净背景」，由 Mac 会话用 `rembg` 自动去背。
> 英文偏好版见文末「附：英文对照」。

---

## 3. 全量清单

### 3A · 角色 `public/assets/char/`（✅ 即插即用）

| key | 文件 | 尺寸 | 内容描述（接在风格前缀后） |
|---|---|---|---|
| `char/barbarian` | char/barbarian.png | 512² | 野蛮人：魁梧赤膊战士，巨大毛皮护肩，络腮胡，皮甲斜带，双手紧握双刃巨斧，肌肉虬结，怒目，棕红主色。 |
| `char/amazon` | char/amazon.png | 512² | 亚马逊女猎手：皮甲胸弧+单肩轻甲，高束马尾，背后箭袋，手持大弓已搭箭，身姿矫健，古铜肤色配青色布料。 |
| `char/sorceress` | char/sorceress.png | 512² | 女法师：尖顶法帽镶宝珠，飘逸长袍裙摆，披肩领，手持顶端发光的法杖，指尖萦绕元素微光，紫蓝主色，神秘。 |

### 3B · 普通怪物 `public/assets/mon/`（✅ 即插即用）

| key | 文件 | 尺寸 | 内容描述 |
|---|---|---|---|
| `mon/fallen` | mon/fallen.png | 512² | 堕落者：小型橙红恶魔小鬼，尖耳獠牙，持简陋短矛，鬼祟。 |
| `mon/skeleton` | mon/skeleton.png | 512² | 骷髅兵：灰白骨架，破损锈剑+小圆盾，空洞眼窝透红光。 |
| `mon/zombie` | mon/zombie.png | 512² | 行尸：病绿臃肿，腐肉斑驳，伸出残臂，蹒跚。 |
| `mon/shaman` | mon/shaman.png | 512² | 堕落萨满：紫袍施法小鬼，骨杖顶端火焰，兜帽。 |
| `mon/archer` | mon/archer.png | 512² | 腐弓手：兜帽斗篷，骷髅手持长弓。 |
| `mon/hound` | mon/hound.png | 512² | 尸群恶犬：深棕四足野兽，獠牙鬃毛，红眼低伏。**3/4 侧身。** |
| `mon/brute` | mon/brute.png | 512² | 血肉督军：魁梧巨汉怪，厚重肌肉，巨拳，小头缩肩。 |
| `mon/spitter` | mon/spitter.png | 512² | 吐毒虫：蹲伏绿色蟾形，背部毒疣，凸眼阔嘴。**3/4 侧身。** |

### 3C · Boss `public/assets/mon/`（✅ 即插即用 · 尺寸 768²）

| key | 文件 | 内容描述 |
|---|---|---|
| `mon/andariel` | mon/andariel.png | 安达莉尔·痛苦女王：蜘蛛下身+女性上身恶魔，毒腺辉光，皇冠，粉红恶魔眼。 |
| `mon/duriel` | mon/duriel.png | 督瑞尔·痛苦之王：矮壮蛆形巨兽，巨颚獠牙，短角，钳爪，分节苍白蛆身，冷光眼。 |
| `mon/mephisto` | mon/mephisto.png | 墨菲斯托·仇恨之王：高大蓝灰恶魔领主，四只长臂，骨棘背脊，沉重头颅与獠牙，憎恶的红眼，施法时萦绕毒绿与寒蓝法光。 |
| `mon/diablo` | mon/diablo.png | 迪亚波罗·恐惧之王：赤红巨魔，背部与头颅密布弯曲长角，烈焰般肌理，尾巴，胸腔透出地狱火光，凶悍前倾。 |
| `mon/baal` | mon/baal.png | 巴尔·毁灭之王：暗紫恶魔领主，巨大蝎钳右臂+利爪左臂，破碎披风，头生厚角，浑身缠绕腐败紫雾，威严暴虐。 |

### 3D · 地砖 `public/assets/tile/`（✅ 即插即用 · 等距菱形）

> 出图：要 ChatGPT 出**俯视、铺满画面的方形地表纹理**（无边缘物件、便于平铺）。
> Mac 会话负责：缩放到 256×128 → 套 **2:1 菱形 alpha 蒙版**（四角透明）→ 压缩。

| key | 文件 | 主题描述 |
|---|---|---|
| `tile/wilderness` | tile/wilderness.png | 暗森林草泥地，杂草、碎石、苔斑，D2 哥特荒野，暗绿褐配色。 |
| `tile/town` | tile/town.png | 营地铺装石板路，暖石灰色，石缝与磨损。 |
| `tile/desert` | tile/desert.png | 沙漠沙地，沙纹起伏、零星碎石与干裂，暖沙黄褐。 |
| `tile/hell` | tile/hell.png | 地狱熔岩石地，焦黑龟裂地表透出炽红熔岩缝，灰烬与骨屑，暗红黑配色。 |
| `tile/snow` | tile/snow.png | 雪山冻土，积雪覆盖的碎石冻地，蓝白冷调，零星裸露暗岩与冰碴。 |

### 3E · 营地 NPC `public/assets/npc/`（⚙️ 需先接线 · 512²）

> 6 位镇民立绘，共用「长袍站立镇民」基底，按身份配色/道具区分。

| key | 文件 | 身份/描述 |
|---|---|---|
| `npc/akara` | npc/akara.png | 阿卡拉：白金长袍女祭司，手捧发光宝珠，慈祥。 |
| `npc/kashya` | npc/kashya.png | 卡夏：红甲弓队长，背负长弓，英气。 |
| `npc/charsi` | npc/charsi.png | 查西：棕围裙女铁匠，手持铁锤，壮实。 |
| `npc/gheed` | npc/gheed.png | 吉德：紫袍胖赌商，手里把玩金币，奸笑。 |
| `npc/warriv` | npc/warriv.png | 沃里夫：蓝袍宽檐帽车队商，络腮胡，豪爽。 |
| `npc/cain` | npc/cain.png | 迪卡·凯恩：灰袍白须老智者，拄杖持古卷，睿智。 |

### 3F · UI 皮肤 `public/assets/ui/`（⚙️ 需先接线）

| key | 文件 | 尺寸 | 描述 |
|---|---|---|---|
| `ui/hp_orb` | ui/hp_orb.png | 256² | 暗黑式生命球：红色液体玻璃球，金属雕花外框，高光。 |
| `ui/mana_orb` | ui/mana_orb.png | 256² | 同上，蓝色法力球。 |
| `ui/btn_frame` | ui/btn_frame.png | 256² | 圆形技能键金属外框，宝石镶嵌槽，**空心中央**。 |
| `ui/panel` | ui/panel.png | 512² | 哥特羊皮纸面板背景，金属包边，**九宫格可拉伸**（四角不变形，中部可平铺）。 |

### 3G · 物品图标 `public/assets/item/`（⚙️ 需先接线 · 128²）

> 物品图标统一风格：**俯视/正面静物图标**，深色描边，柔和高光，居中，纯色背景便于抠图。
> 不套「3/4 角色视角」，改用「装备图标」描述。尺寸 128²。

| key | 文件 | 物品 |
|---|---|---|
| `item/hand_axe` | item/hand_axe.png | 手斧（单手战斧） |
| `item/short_sword` | item/short_sword.png | 短剑 |
| `item/club` | item/club.png | 木棍棒 |
| `item/mace` | item/mace.png | 钉头锤 |
| `item/double_axe` | item/double_axe.png | 双刃巨斧 |
| `item/cap` | item/cap.png | 皮帽 |
| `item/skull_cap` | item/skull_cap.png | 金属头盔 |
| `item/quilted` | item/quilted.png | 绗缝布甲 |
| `item/leather` | item/leather.png | 皮甲 |
| `item/chain` | item/chain.png | 锁子甲 |
| `item/buckler` | item/buckler.png | 小圆盾 |
| `item/small_shield` | item/small_shield.png | 小盾 |
| `item/gloves` | item/gloves.png | 皮手套 |
| `item/boots` | item/boots.png | 皮靴 |
| `item/sash` | item/sash.png | 布腰带 |
| `item/ring` | item/ring.png | 戒指 |
| `item/amulet` | item/amulet.png | 护符（项链吊坠） |

---

## 4. 输出规格 & 自动后处理（Mac 会话执行）

| 类别 | ChatGPT 出图要求 | 自动后处理（落到 public/assets 前） |
|---|---|---|
| char / mon / npc | 方形、纯色背景、主体居中约占 80% 高 | `rembg` 去背 → 按 alpha 包围盒裁切 → 补成正方形 → 缩放 512²（npc 同）→ `pngquant` |
| Boss | 同上 | 同上，但缩放 **768²** |
| item | 方形装备图标、纯色背景 | `rembg` 去背 → 裁切居中 → 缩放 **128²** → 压缩 |
| tile | 方形、铺满画面的俯视地表纹理 | 中心裁切 → 缩放 256×128 → **套 2:1 菱形 alpha 蒙版**（四角透明）→ 压缩 |
| ui/hp_orb·mana_orb·btn_frame | 方形、纯色背景 | `rembg`（btn_frame 保留中央镂空）→ 缩放 256² → 压缩 |
| ui/panel | 方形面板，纹理在画面内不出血 | 轻度去背或保留 → 缩放 512² → 压缩（**九宫格，勿裁掉边框**） |

- 单文件建议 **< 300KB**；抠图后若主体 alpha 占比 < 5%（疑似抠空）则标记为待人工复核，不提交。
- 质检：输出须为 PNG、含 alpha 通道、尺寸符合规格。

---

## 5. 命名 / 路径总览（务必精确）

```
public/assets/
├── char/   barbarian.png  amazon.png  sorceress.png
├── mon/    fallen.png skeleton.png zombie.png shaman.png archer.png hound.png brute.png spitter.png
│           andariel.png duriel.png mephisto.png diablo.png baal.png
├── tile/   wilderness.png town.png desert.png hell.png snow.png
├── npc/    akara.png kashya.png charsi.png gheed.png warriv.png cain.png
├── ui/     hp_orb.png mana_orb.png btn_frame.png panel.png
└── item/   hand_axe.png short_sword.png club.png mace.png double_axe.png cap.png skull_cap.png
            quilted.png leather.png chain.png buckler.png small_shield.png gloves.png boots.png
            sash.png ring.png amulet.png
```

合计：char 3 + mon 13 + tile 5 + npc 6 + ui 4 + item 17 = **48 张**（A 组 21 即生效，B 组 27 待接线）。

---

## 6. 验收 & 反馈

- A 组放好后 `npm run dev` 进对应场景即可看到替换；方向/偏移问题反馈 key，渲染层调锚点/缩放。
- 反馈格式示例：`char/barbarian.png 已放好` / `tile/desert 偏暗，重出` / `mon/diablo 抠图缺右角`。

---

## 7. 代码侧 TODO（B/C 组接线，代码会话负责，不阻塞出图）

- [ ] **item 图标**：库存/物品格读取 `ITEM_BASES[].sprite`，叠加 `<img src="assets/<sprite>.png" onerror=隐藏>`（`src/game/ui/inventory.ts`）。
- [ ] **npc 立绘**：营地面板按 NPC id 显示 `assets/npc/<id>.png`（`src/game/ui/town.ts`）。
- [ ] **ui 球/面板**：HUD 生命/法力球与面板支持 `assets/ui/*.png` 背景回退（`src/game/ui/hud.ts` 等）。
- [ ] **技能图标（C 组）**：技能 `icon` 由 emoji 扩展为可选纹理 key，UI 命中则用图、否则回退 emoji。

---

## 附：英文对照（模型偏好英文时用）

**风格前缀（英文）**
```
A premium mobile-game sprite, polished isometric action-RPG (Diablo II reimagined as cute chibi).
Hand-painted, NOT flat vector. Rich soft-gradient shading, rim light from upper-left, thick dark
outline (#1a0800), 1:2.5 big-head ratio, saturated moody palette (warm golds #e7c66a, deep browns
#241410, gothic darks). Centered subject, 3/4 top-down view facing camera, feet at bottom edge.
Single subject, full body in frame. Plain flat background for easy cutout, no ground shadow,
no border, no text, no multiple characters.
```
**地砖（英文，方形地表纹理，后续程序套菱形蒙版）**
```
A top-down hand-painted square ground texture, <theme>. Fills the whole frame, no edge objects,
tileable feel. No border, no text.
```
（`<theme>`：wilderness=dark forest grass-dirt with weeds/pebbles/moss；town=warm flagstone path；
desert=sandy dunes with ripples/cracks；hell=charred cracked rock with glowing red lava seams；
snow=snow-covered frozen rocky ground, cold blue-white）
**物品图标（英文）**
```
A single video-game equipment icon, <item>, top-down/front view, hand-painted, thick dark outline,
soft highlights, centered, plain flat background. No text, no border.
```
