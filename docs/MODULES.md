# 模块归属 & 多会话并行任务板

并行开发的规则：**先有脊柱（本文档 + `src/engine` 契约 + `src/game/data/schema.ts`），
再沿模块边界拆任务**。每个任务独立分支，只依赖契约、不擅改契约（要改先在 issue/PR 同步）。
CI 绿灯（typecheck + build + test）才合并。

## 契约（冻结，跨任务共享）
- `src/engine/ecs/types.ts` — Entity/Component/System/World 接口
- `src/engine/math/{iso,vec}.ts` — 等距投影与向量
- `src/game/data/schema.ts` — D2 风格数据表类型（MonStat/SkillDef/ItemBase/Affix/LevelDef/TreasureClass）

## 任务板（Phase 1+，可并行）

| ID | 任务 | 主要目录 | 依赖 | 验收 |
|----|------|----------|------|------|
| T1 | 等距渲染：FLARE 瓦片/精灵层、相机、光照半径、深度排序 | `engine/render` | 脊柱 | 真瓦片地图可走动 |
| T2 | 寻路(A*) + 移动系统 + 摇杆联动 | `engine/input`, `game/systems/movement` | 脊柱 | 绕障碍寻路 |
| T3 | 战斗判定内核：命中(AR/防御)、硬直、伤害类型、抗性 | `game/systems/combat` | schema | 公式单测对照 Arreat Summit |
| T4 | 怪物 AI archetypes：骷髅/堕落者集结/萨满复活/僵尸 | `game/systems/ai`, `game/entities/monster` | T3 | 各 AI 行为可观察 |
| T5 | 物品/词缀/掉落：稀有度、前后缀、ilvl/mlvl、TreasureClass | `game/systems/items`, `game/data` | schema | 掉落概率单测 |
| T6 | 技能树×3职业：数据驱动、synergy、精通、+技能 | `game/classes`, `game/systems/skills` | T3 | 投点/解锁链正确 |
| T7 | UI：单格装备 / 仓库 / 角色属性 / 技能树面板 | `game/ui` | T5,T6 | 触屏拖拽装备 |
| T8 | 营地 + 区域 + 任务链（第一幕） | `game/world` | T1 | 营地服务 + 区域切换 |
| T9 | 美术管线：FLARE 整合 + 提取工具 + 原版覆盖 | `pipeline`, `assets` | 脊柱 | 样例素材跑通提取→渲染 |
| T10 | 存档(IndexedDB+导出码) + GitHub Pages 发布 | `engine/save`, `.github` | 脊柱 | 部署可在线玩 |

## 里程碑
- **M0** 等距能走动（脊柱 + T1 + T2）✅ 脊柱已就位
- **M1** 野蛮人近战手感（T3 + T4 + T6 部分 + 打击反馈）
- **M2** 刷宝闭环（T5 + T7）
- **M3** 角色构筑（T6 全 + 属性点 + 突破点）
- **M4** 第一幕完整（T8 + 难度）
- **M5** 三职业 + 美术管线（T6×3 + T9 + 音频）

## 稳定性闸门（harness）
- `npm run typecheck`、`npm test`、`npm run build` 三关，CI（`.github/workflows/ci.yml`）PR 必绿
- SessionStart hook（`.claude/settings.json`）：每个 web 会话自动装依赖 + 跑闸门，环境一致
- 改契约文件需在 PR 标题打 `[contract]` 并同步所有进行中任务
