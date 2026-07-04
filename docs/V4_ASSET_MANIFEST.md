# V4 Asset Manifest

目标：把 V4 美术落地拆成个人游戏工作室可执行的资产清单。每个资产都要有用途、规格、优先级和验收重点，避免“生成了很多图，但游戏里最关键的 5 分钟还是不像一款成品”。

路径原则：沿用现有 `public/assets/<category>/<name>.png` 覆盖式接入。新增资产先按本文命名，代码未接入前也按路径存放，避免后续返工。

## 1. 命名规则

- 文件名只用小写英文、数字、下划线。
- 同一类资产使用同一前缀：`char_`、`mon_`、`npc_`、`ui_`、`icon_`、`fx_`、`tile_`。
- 动画序列使用 `_01`、`_02`、`_03`，不要混用 `final`、`new`、`v2`。
- 透明 PNG 必须保留 alpha，禁止带白底、黑底或烘焙地面。
- 源文件可放 `art_source/`，游戏接入只认 `public/assets/`。

## 2. 优先级定义

| 优先级 | 定义 | 完成标准 |
|---|---|---|
| P0 | 首五分钟每秒可见，直接决定观感 | 必须替换占位图，可在手机尺寸读清 |
| P1 | 影响战斗理解和系统质感 | 至少完成一版统一风格资产 |
| P2 | 扩展内容和长期丰富度 | 可先用同体系变体，不接受异风格拼接 |
| P3 | 宣传包装和后续优化 | 等核心可玩后再做 |

## 3. 角色资产

### 职业立绘

路径：`public/assets/char/`

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `char/amazon_portrait` | `char/amazon_portrait.png` | 1024x1024 PNG | 职业选择、升级面板 | 长弓/箭袋/侧身剪影明确，不性感化成通用女战士 |
| P1 | `char/barbarian_portrait` | `char/barbarian_portrait.png` | 1024x1024 PNG | 职业选择 | 宽肩重斧、毛皮和粗铁材质明确 |
| P1 | `char/sorceress_portrait` | `char/sorceress_portrait.png` | 1024x1024 PNG | 职业选择 | 法杖、长袍、符光明确，避免仙侠飘带感 |

### 游戏内角色精灵

路径：`public/assets/char/`

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `char/amazon_idle` | `char/amazon_idle.png` | 512x512 PNG | 游戏内默认姿态 | 128px 高度可辨弓手 |
| P0 | `char/amazon_attack` | `char/amazon_attack.png` | 512x512 PNG | 普攻/多重箭起手 | 拉弓方向明确 |
| P1 | `char/amazon_hit` | `char/amazon_hit.png` | 512x512 PNG | 受击反馈 | 不遮挡武器和脚底锚点 |
| P1 | `char/barbarian_idle` | `char/barbarian_idle.png` | 512x512 PNG | 后续职业 | 重斧和宽肩可读 |
| P1 | `char/sorceress_idle` | `char/sorceress_idle.png` | 512x512 PNG | 后续职业 | 法杖和长袍可读 |

后续如做动画 atlas，命名改为 `char/amazon_run_01.png` 到 `char/amazon_run_06.png`，单帧规格保持一致。

## 4. 怪物资产

路径：`public/assets/mon/`

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `mon/hound` | `mon/hound.png` | 512x512 PNG | 首战扑袭兽 | 四足低伏，高速威胁一眼可读 |
| P0 | `mon/archer` | `mon/archer.png` | 512x512 PNG | 首战远程压力 | 长弓横向剪影，不与玩家弓手混淆 |
| P0 | `mon/brute` | `mon/brute.png` | 512x512 PNG | 精英/重击单位 | 巨拳和厚背明确 |
| P1 | `mon/fallen` | `mon/fallen.png` | 512x512 PNG | 小型杂兵 | 尖耳短矛，低威胁剪影 |
| P1 | `mon/skeleton` | `mon/skeleton.png` | 512x512 PNG | 基础近战 | 盾剑和骨架清晰 |
| P1 | `mon/zombie` | `mon/zombie.png` | 512x512 PNG | 慢速压迫 | 腐肉臃肿，不做搞笑僵尸 |
| P1 | `mon/spitter` | `mon/spitter.png` | 512x512 PNG | 毒区单位 | 毒囊和吐息方向明确 |
| P2 | `mon/shaman` | `mon/shaman.png` | 512x512 PNG | 召唤/增益单位 | 骨杖、兜帽、施法光可读 |

### 精英与 Boss

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `mon/mephisto` | `mephisto.png` | 1200px+ transparent PNG | 后期 Boss | 紫色幽魂/诅咒剪影明确，移动端小尺寸仍可读 |
| P0 | `mon/diablo` | `diablo.png` | 1200px+ transparent PNG | 后期 Boss | 红黑重甲恶魔剪影明确，尖角/爪刃/熔火核心可读 |
| P0 | `mon/baal` | `baal.png` | 1200px+ transparent PNG | 后期 Boss | 腐蚀绿与骨质王冠明确，不与毒怪混淆 |
| P0 | `mon/elite_aura_red` | `mon/elite_aura_red.png` | 512x512 PNG | 精英危险标识 | 光环不遮怪物轮廓 |
| P1 | `mon/boss_bloodroot` | `mon/boss_bloodroot.png` | 768x768 PNG | 首个原创小 Boss | 树根/血肉/骨刺组合，原创且非现成 IP |
| P2 | `mon/boss_plague_matriarch` | `mon/boss_plague_matriarch.png` | 768x768 PNG | 毒巢 Boss | 虫巢/毒腺/祭祀感，危险色独立 |
| P2 | `mon/boss_iron_jailer` | `mon/boss_iron_jailer.png` | 768x768 PNG | 地牢 Boss | 铁链/刑具/厚甲，冷铁压迫 |

Boss 命名使用原创描述名，不沿用任何知名暗黑系列 Boss 名。

## 5. NPC 资产

路径：`public/assets/npc/`

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P1 | `npc/priest` | `npc/priest.png` | 768x768 PNG | 治疗/祝福 | 药瓶或手杖进入剪影 |
| P1 | `npc/captain` | `npc/captain.png` | 768x768 PNG | 雇佣/训练 | 弓、箭袋、护臂明确 |
| P1 | `npc/blacksmith` | `npc/blacksmith.png` | 768x768 PNG | 强化/打孔/锻造 | 锤和砧台火星明确 |
| P1 | `npc/gambler` | `npc/gambler.png` | 768x768 PNG | 赌商/交易 | 钱袋、骰子或箱子明确 |
| P2 | `npc/caravan` | `npc/caravan.png` | 768x768 PNG | 传送/章节入口 | 路牌、车轮、地图卷轴明确 |
| P2 | `npc/scholar` | `npc/scholar.png` | 768x768 PNG | 鉴定/任务知识 | 古卷、书、烛台明确 |

现有旧名 NPC 可作为历史兼容，不作为 V4 命名方向。V4 文档和后续资产使用功能型原创名。

## 6. UI 资产

路径：`public/assets/ui/`

### HUD

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `ui/hud_hp_orb` | `ui/hud_hp_orb.png` | 256x256 PNG | 生命显示 | 深红液体、旧金属外框，损血槽可读 |
| P0 | `ui/hud_mana_orb` | `ui/hud_mana_orb.png` | 256x256 PNG | 法力显示 | 深蓝/冷紫，不抢冰技能 |
| P0 | `ui/skill_button_frame` | `ui/skill_button_frame.png` | 256x256 PNG | 技能键 | 圆形金属外圈，中心留给 icon |
| P0 | `ui/cooldown_mask` | `ui/cooldown_mask.png` | 256x256 PNG | 冷却遮罩 | 半透明暗盘，边缘干净 |
| P1 | `ui/xp_bar_frame` | `ui/xp_bar_frame.png` | 512x96 PNG | 经验条 | 暗金细框，不抢战斗 |

### 面板

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `ui/panel_9slice` | `ui/panel_9slice.png` | 512x512 PNG | 通用面板 | 四角厚重、中心可拉伸 |
| P1 | `ui/panel_header` | `ui/panel_header.png` | 512x96 PNG | 面板标题 | 中文标题可读，有暗金层级 |
| P1 | `ui/item_slot` | `ui/item_slot.png` | 128x128 PNG | 背包格 | 空槽不喧宾夺主 |
| P1 | `ui/item_slot_equipped` | `ui/item_slot_equipped.png` | 128x128 PNG | 装备位 | 已装备边缘更重 |
| P1 | `ui/toast_frame` | `ui/toast_frame.png` | 512x128 PNG | 拾取/任务提示 | 1 秒内能读，不遮挡战斗中心 |

### 品质边框

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `ui/rarity_common` | `ui/rarity_common.png` | 128x128 PNG | 普通物品 | 低调铁灰 |
| P0 | `ui/rarity_magic` | `ui/rarity_magic.png` | 128x128 PNG | 魔法物品 | 冷蓝细光 |
| P0 | `ui/rarity_rare` | `ui/rarity_rare.png` | 128x128 PNG | 稀有物品 | 暗金边 |
| P0 | `ui/rarity_unique` | `ui/rarity_unique.png` | 128x128 PNG | 暗金/传奇 | 暗金 + 微红内光，不做彩虹 |

## 7. Icon 资产

路径：`public/assets/icon/`

### 亚马逊首发技能

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `icon/skill_multi_arrow` | `icon/skill_multi_arrow.png` | 256x256 PNG | 多重箭 | 3-5 支箭扇形展开，48px 可读 |
| P0 | `icon/skill_frost_arrow` | `icon/skill_frost_arrow.png` | 256x256 PNG | 冰冻箭 | 箭头 + 冰裂，避免只有雪花 |
| P0 | `icon/skill_magic_arrow` | `icon/skill_magic_arrow.png` | 256x256 PNG | 魔法箭 | 单箭 + 紫蓝符光 |
| P1 | `icon/passive_pierce` | `icon/passive_pierce.png` | 256x256 PNG | 穿透被动 | 箭穿过两层暗影目标 |
| P1 | `icon/passive_evasion` | `icon/passive_evasion.png` | 256x256 PNG | 闪避被动 | 侧身残影，不做跑步人通用图标 |

### 装备与系统

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `icon/item_bow_unique_ravenpiercer` | `icon/item_bow_unique_ravenpiercer.png` | 256x256 PNG | 首战暗金短弓 | 鸦羽/穿心主题，原创命名视觉 |
| P1 | `icon/item_axe_ironbite` | `icon/item_axe_ironbite.png` | 256x256 PNG | 野蛮人武器 | 粗铁斧刃，旧血刻痕 |
| P1 | `icon/item_staff_coldspark` | `icon/item_staff_coldspark.png` | 256x256 PNG | 法师武器 | 冷蓝宝石，短电弧 |
| P1 | `icon/service_forge` | `icon/service_forge.png` | 256x256 PNG | 铁匠服务 | 锤 + 火星 |
| P1 | `icon/service_shop` | `icon/service_shop.png` | 256x256 PNG | 商店/赌商 | 钱袋 + 暗金边 |
| P1 | `icon/service_heal` | `icon/service_heal.png` | 256x256 PNG | 治疗/祝福 | 药瓶 + 暖白光 |
| P1 | `icon/service_identify` | `icon/service_identify.png` | 256x256 PNG | 鉴定 | 卷轴 + 放大符文 |

### 状态

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P1 | `icon/status_burn` | `icon/status_burn.png` | 128x128 PNG | 燃烧 | 暗烟边 + 橙核心 |
| P1 | `icon/status_freeze` | `icon/status_freeze.png` | 128x128 PNG | 冰冻 | 冰裂而非雪花贴纸 |
| P1 | `icon/status_poison` | `icon/status_poison.png` | 128x128 PNG | 中毒 | 液滴/泡沫，黄绿暗边 |
| P1 | `icon/status_bleed` | `icon/status_bleed.png` | 128x128 PNG | 流血 | 血滴 + 刃痕，不做鲜艳红心 |

## 8. Effect 资产

路径：`public/assets/fx/`

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `fx/hit_slash` | `fx/hit_slash.png` | 512x512 PNG | 普通命中 | 方向明确，透明边干净 |
| P0 | `fx/arrow_trail` | `fx/arrow_trail.png` | 512x256 PNG | 弓箭弹道 | 细长、快速，不像激光 |
| P0 | `fx/multi_arrow_burst` | `fx/multi_arrow_burst.png` | 512x512 PNG | 多重箭发射 | 扇形角度明确 |
| P0 | `fx/frost_impact` | `fx/frost_impact.png` | 512x512 PNG | 冰冻箭命中 | 冰裂 + 短雾 |
| P1 | `fx/poison_pool` | `fx/poison_pool.png` | 512x512 PNG | 毒地面 | 边界清晰，持续危险可读 |
| P1 | `fx/elite_warning_ring` | `fx/elite_warning_ring.png` | 512x512 PNG | 精英/Boss 预警 | 爆发前可见，不像装饰光环 |
| P1 | `fx/loot_beam_unique` | `fx/loot_beam_unique.png` | 512x512 PNG | 暗金掉落 | 暗金光柱 + 少量红，不遮物品 |
| P2 | `fx/fire_impact` | `fx/fire_impact.png` | 512x512 PNG | 火系命中 | 亮核心 + 黑烟残留 |
| P2 | `fx/lightning_arc` | `fx/lightning_arc.png` | 512x512 PNG | 电系技能 | 折线短闪，不柔软 |

若运行时使用 canvas 粒子生成，也要用本文作为视觉规格：颜色、形状、阶段、残留一致。

## 9. 环境资产

路径：`public/assets/tile/`、`public/assets/prop/`

### 地块

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `tile/wilderness` | `tile/wilderness.png` | 256x128 PNG | 首战荒野 | 2:1 菱形、四角透明、可平铺 |
| P1 | `tile/camp` | `tile/camp.png` | 256x128 PNG | 营地地面 | 暖石灰，和荒野分区明显 |
| P1 | `tile/dungeon` | `tile/dungeon.png` | 256x128 PNG | 地牢 | 冷灰石、裂缝、低噪声 |
| P2 | `tile/poison_lair` | `tile/poison_lair.png` | 256x128 PNG | 毒巢 | 湿暗绿，不影响毒池可读 |

### 场景物件

| 优先级 | key | 文件 | 规格 | 用途 | 验收重点 |
|---|---|---|---|---|---|
| P0 | `prop/exit_gate` | `prop/exit_gate.png` | 512x512 PNG | 关卡出口 | 入口方向和可交互状态明确 |
| P0 | `prop/loot_chest` | `prop/loot_chest.png` | 512x512 PNG | 宝箱 | 旧铁包边，不像卡通宝箱 |
| P1 | `prop/campfire` | `prop/campfire.png` | 512x512 PNG | 营地中心 | 暖光、安全点记忆 |
| P1 | `prop/blacksmith_anvil` | `prop/blacksmith_anvil.png` | 512x512 PNG | 铁匠区域 | 锤、砧、火星组合 |
| P1 | `prop/ritual_altar` | `prop/ritual_altar.png` | 512x512 PNG | Boss/任务 | 原创符文，不复制知名标识 |
| P2 | `prop/bone_pile` | `prop/bone_pile.png` | 512x512 PNG | 地牢装饰 | 低对比，不误读为掉落 |

## 10. 生产批次

### Batch A：V4 首五分钟换脸

- `char/amazon_portrait.png`
- `char/amazon_idle.png`
- `char/amazon_attack.png`
- `mon/hound.png`
- `mon/archer.png`
- `mon/brute.png`
- `icon/skill_multi_arrow.png`
- `icon/skill_frost_arrow.png`
- `icon/skill_magic_arrow.png`
- `icon/item_bow_unique_ravenpiercer.png`
- `fx/arrow_trail.png`
- `fx/multi_arrow_burst.png`
- `fx/frost_impact.png`
- `tile/wilderness.png`
- `prop/exit_gate.png`

验收：第一场战斗截图看起来像一款原创暗黑 ARPG，而不是矢量原型。

### Batch B：营地系统统一

- 6 个 NPC
- `ui/panel_9slice.png`
- `ui/item_slot.png`
- 4 个品质边框
- 4 个服务图标
- `prop/campfire.png`
- `prop/blacksmith_anvil.png`

验收：营地、背包、商店、强化面板是同一套美术语言。

### Batch C：职业与 Boss 扩展

- 野蛮人/法师立绘和 idle
- 2 个原创 Boss
- Boss 预警、毒池、火焰、电弧等效果
- 地牢和毒巢环境

验收：三职业扩展不破坏 V4 统一性，Boss 有独立记忆点。

### Batch D：宣传与压缩

- App 截图级构图资产
- atlas 整理
- png 压缩
- 缺失资产 fallback 截图审查

验收：对外展示图可用，包体和加载不被大图拖垮。
