# Ironband 一周上线路线图

> Historical V1/V2 planning note. V4 has superseded the earlier Q-style direction with a high-end dark fantasy ARPG target. Keep this file for project history only; current art direction lives in `docs/V4_DARK_VISUAL_REBUILD.md`.

## 范围定稿（与用户对齐）
- **内容**：Act 1 完整 + Act 2 主线，靠「普通→噩梦→地狱」三难度复玩 + Build 多样性 + 刷装驱动堆叠到 ~10h
- **美术**：历史方案为矢量轻量化；V4 已改为真实 PNG 优先、暗黑写实材质、程序化绘制仅作缺图兜底
- **存档**：多角色存档槽（用户与朋友各自存档）
- **形态**：横屏 + 竖屏都支持；GitHub Pages 公开链接，发链接即玩
- **目标**：一周内上线，可发给朋友小范围体验

## 高效对齐协议（用户常在 iPhone，非随时在 Mac）
1. **可玩链接直推**：每里程碑部署 Pages，用户 iPhone Safari 直接真机试玩
2. **决策用选择题卡片**：用户点选即可，不用打字
3. **进度异步可读**：节点发 30 秒短摘要 + 链接
4. **默认前进**：非阻塞决策按 D2 原版 + 手游最佳实践自定，事后告知
5. **5 轮预算**：Day2 战斗手感 / Day4 完整Act / Day6 Beta全流程 / Day7 上线确认 / 1 轮机动

## PR Triage 决定
- **#1, #3** → 关闭：TS 重写前的单文件 Canvas2D 原型，架构已淘汰（base 不在 main 血脉）
- **#11 营地经济** → 关闭：economy 代码在重构中从 main 丢失，逻辑有用，已在本分支重建任务中抢救
- **#15 角色动画** → 关闭：与 #16 在 actorSprite.ts 冲突，#16 更先进；其四肢动画择优吸收
- **#16 设计规范+四技能+死亡惩罚+早期视觉** → 采纳其系统地基；视觉方向已被 V4 暗黑重建取代

## 技术地基（main 已有，复用不重建）
TS + PixiJS 8 + Vite 单文件构建 · 等距渲染 · D2 战斗公式(AR/DR) · 三职业技能树 · 装备词缀 · IndexedDB 存档 · WebAudio · `boss/andariel.ts` · `difficulty.ts` 脚手架 · Vitest+Playwright

## 任务进度（见 TaskList）
1. 地基整合 + PR triage
2. 多存档槽系统
3. 横竖屏响应式
4. 营地经济重建
5. Act1 完整化 + Act2 主线
6. 多难度接通 + 刷装循环
7. V4 暗黑美术深化
8. 部署 + 里程碑可玩链接

## 质量闸门（每次提交前）
`npm run typecheck` · `npm test` · `npm run build`
