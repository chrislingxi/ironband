# Ironband · 工作室交接规格 (非美术待办 P1–P6)

> 面向 Mac 本地 `claude code game studios` 会话的可执行交接。`git pull` 后按本文逐项推进。
> 目标：在不依赖人工逐 bug 复测的前提下，把游戏推到「小范围实测可上线」质量。
> 美术资产由用户单独在 Mac 处理（见 `docs/ART_ASSETS.md`），本文**不含美术**。

## 工作纪律（沿用本仓既有约定）
- **goal 模式**：自闭环开发，不要逐项确认优先级；**仅游戏设计问题**需要找用户对齐。
- **门禁**：每次提交前必须 `npm run selftest` 全绿（安全区 lint → typecheck → vitest → build → 设备矩阵 UI）。
- **多智能体合议**：以「暗黑2 老玩家」视角做评审/验收（合议产出问题清单再修）。
- 提交 `Co-Authored-By: Claude ...`；分支开发→PR(draft)→CI 绿→合并 main→`build-site` 部署校验。
- 关键测试基础设施：
  - `test/playthrough.test.ts` — 无头一局核心玩法不变量
  - `scripts/selftest-ui.mjs` — Playwright 设备矩阵（含 CDP 注入刘海 insets）
  - `scripts/selftest-lint.mjs` — 安全区静态 lint
  - `test/balance*.test.ts` / M4 模拟 — 数值校验

---

## P1 ｜技能可玩性全覆盖验证（上线前最大隐患，最高优先）

**现状**：67 技能 / 55 exec profile。法师做过深度调校；野蛮人、亚马逊的每个主动技是否**真有可用效果**仅在 M4 笼统验过，存在「投了点却无反应」的风险。

**做什么**
1. 新增 `test/skill-coverage.test.ts`：遍历 `CLASS_SKILLS[cls]` 每个**非 passive**技能：
   - 断言存在可执行路径（`SKILL_EXEC[id]` 或 castable 解析到非空 `kind`）；
   - 用一局模拟：投满前置→投该技能 1 点→`assignSkill`→`useSkill`→断言**产生可观测效果**之一：怪物掉血 / 玩家位移(dodge/teleport) / buff 字段变化(shout/armor) / 生成 missile。
   - 找出「无 exec / 施放无效果」的技能，逐个补 exec profile 或修数据。
2. 被动技（mastery/iron_skin/natural_resistance/penetrate/warmth 等）：断言其加成确实进入 `deriveCombat`/`passiveBonuses`（已有部分，补全缺口）。

**验收**：`skill-coverage.test.ts` 全绿；三职业每个主动技手测一遍（合议复核截图/日志）确认表现合理。

**文件指针**：`src/game/classes/{exec.ts,profiles.ts,registry.ts,barbarianTree.ts,sorceress.ts,amazon.ts}`、`src/game/sim/Game.ts`（`useSkill`/`skillDamage`/`exec*`）。

---

## P2 ｜三职业 × 三难度 平衡曲线（常驻自测关）

**现状**：只深验过法师；M4 是一次性模拟。

**做什么**
1. 把 M4 模拟固化为 `test/balance-matrix.test.ts`：3 职业 × {普通/噩梦/地狱}，自动配点+配装（用 `equipBest` + 合理加点脚本），跑 N 局，统计：
   - 通关代表区/Boss 的 TTK（击杀耗时）、死亡率、DPS、有效生命；
   - 断言落在合理区间（不被秒、能清怪、难度递增单调）。
2. 失衡处调数值（怪物 HP/伤害、技能 K 因子、属性收益），**改完回归矩阵**。
3. 把该矩阵接进 `npm run selftest`（作为较慢的可选关，或 `selftest:balance`）。

**验收**：矩阵全绿；三职业在地狱难度均「可玩不无敌」。合议给出平衡评语。

**文件指针**：`src/game/systems/difficulty.ts`、`src/game/world/zone.ts`、`src/game/systems/stats/*`、`src/game/classes/exec.ts`(K 因子)。

---

## P3 ｜任务/内容密度（需用户定方向 → 见末尾「待拍板」）

**现状**：5 幕仅 8 主线任务。

**建议方案（默认）**：每幕补 1–2 个支线任务（清剿/取物/护送类），复用现有 `QUESTS`/`onAreaCleared`/奖励管线；总量到 ~16–18。剧情文本对标 D2 风格、原创。

**验收**：新任务可触发、可完成、发奖；`test/quest-reward.test.ts` 扩测覆盖新任务。

**文件指针**：`src/game/world/quests.ts`、`src/game/world/act*.ts`、`src/game/ui/questlog.ts`。

---

## P4 ｜刷宝循环深度（耐刷性）

**现状**：掉落/符文/套装/符文之语已有，需确认随难度的耐刷曲线。

**做什么**
1. Magic Find（+% 魔法物品几率）作为词缀/属性接入掉落权重；
2. 高难掉落表加深（噩梦/地狱专属基底、符文掉率曲线、Boss 掉落池）；
3. `test/drops.test.ts` 扩测：难度越高，稀有度期望越高、符文越可得。

**验收**：模拟刷 X 局，地狱稀有/套装/符文产出明显优于普通；掉落不溢出（背包满提示正常）。

**文件指针**：`src/game/systems/items/*`、`src/game/data/{runes,sets,items}.ts`、`src/game/world/zone.ts`。

---

## P5 ｜制作系统：赫拉迪克方块类合成（需用户定范围 → 待拍板）

**建议最小集**：3 件同类升阶、符文升级（rune upgrade）、宝石合成。UI 复用营地面板加一页「方块」。

**验收**：合成配方数据驱动、有单测；UI 可操作；非法合成有反馈。

**文件指针**：`src/game/systems/town/*`、`src/game/ui/town.ts`、新增 `src/game/systems/craft/*`。

---

## P6 ｜低端机性能压测

**做什么**
1. 压测脚本：高密度区域（150+ 实体 + 大量粒子/missile）测帧时；
2. 优化项：粒子上限/对象池、`syncEntity` 脏标记、离屏剔除、minimap 重绘节流；
3. 记录 before/after 帧时到 `docs/PERF.md`。

**验收**：中端机型 ≥ 稳定 30fps（用 Playwright trace 或 `requestAnimationFrame` 采样近似）。

**文件指针**：`src/main.ts`（render 循环/粒子）、`src/engine/render/*`。

---

## 待用户拍板的设计项（开工前请确认）
1. **P3 任务量**：每幕 +1~2 支线（默认）／更激进（每幕 +3~4，接近 D2）／暂不扩。
2. **P5 制作范围**：最小集（升阶+符文升级+宝石）／含赫拉迪克魔方完整配方表／暂不做。
3. **P4 Magic Find**：作为可堆叠属性墙（D2 风）／仅装备词缀轻量版。

> 其余 P1/P2/P6 属质量验证，无需拍板，可直接 goal 模式推进并自测。

## 建议推进顺序
P1 → P2（质量地基，先把"能玩、平衡"锁死）→ P4 → P3 → P5 → P6。每项独立 PR、CI 绿、合并、部署校验。
