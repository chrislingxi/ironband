# 自迭代 Loop · 无人值守持续优化

目标：`bot 自测 → 记录问题 → 修复 → 验收 → 继续`，稳定 7×24 自跑，无需人值守。
核心原则：**人定义目标、agent 优化目标；白名单旋钮内自动改、越界进设计队列；棘轮+全绿只进不退。**

## 两层结构

### ① 测量层（always-on，无 LLM，跑在 GitHub 基建）
`.github/workflows/autoloop.yml` — 定时(每 8h)+ push + 手动触发，跑 `npm run loop:check`：
- **平衡闸门** `test/balance-bot.test.ts`：Act1 Boss 不被秒、各职业可通关（防数值回归）。
- **全流程不变量** `test/bot/session.test.ts`：建号→清怪→加点/投技能→一键穿戴→营地经济→Boss→送死重生→存读档，巡检 数值健全/HP上限/金币守恒/背包上限/战力不降/存读档守恒/打不动。
- **探索探针**（同文件）：**每次随机种子**跑 6×3 局，只断言"硬不变量"(异常/NaN/守恒/存读档) → 与种子无关，任何违例都是真 bug；定时反复跑 = 在种子空间**持续发现新边角问题**。
- 任何失败 → **开/更新一个 `autoloop` issue** 上报失败片段，等修复层接手。

这层真正 24/7、零 token 成本、容器回收也不受影响。

### ②a 修复层 · 真·7×24 自治（`.github/workflows/autofix.yml`）
定时(每天 05:33 UTC)唤醒 Claude 跑一轮：探针失败→白名单旋钮内调平→棘轮验收→开 draft PR。不依赖任何会话/容器。

**一次性启用（两步）：**
1. **安装 Claude GitHub App** 到本仓库：https://github.com/apps/claude → Install → 选 `chrislingxi/ironband`。
   （cron 下创建分支/PR 必须用 App 身份，默认 `GITHUB_TOKEN` 不行。）
2. **加一个仓库 secret**（Settings → Secrets and variables → Actions → New repository secret）：
   - 名称 `CLAUDE_CODE_OAUTH_TOKEN`，值 = 本地跑 `claude setup-token` 生成的订阅 OAuth token（Pro/Max）。
   - 或改用 API key：把 `autofix.yml` 里 `claude_code_oauth_token:` 一行换成 `anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}`，secret 名 `ANTHROPIC_API_KEY`（console.anthropic.com 生成，按量计费）。

配好后：Actions → "Autofix" → Run workflow 手动试跑一次确认认证/权限通；之后每天自动跑。
**授权边界**：只允许改 `balance.ts` + 两个 docs；越界进 `NEEDS_DESIGN.md`，不擅自动其它代码。`timeout-minutes:30` + `--max-turns 30` 兜底防失控。

### ②b 修复层（按需唤醒 LLM / 备选）
读最新 `autoloop` issue → 诊断 → 在 `src/game/data/balance.ts` **白名单旋钮**内调平 → `npm run loop:check` 棘轮验收 → PR → 合并；越界(改机制/技能曲线)进 `docs/NEEDS_DESIGN.md` 等人拍板。

可由以下任一驱动（都遵守同一纪律）：
- **本会话 CronCreate**：定时唤醒本 agent 跑一轮（会话存活期内有效，7 天上限）。
- **Mac 本地 ccgs 会话**：长驻，最稳。
- **手动**：发现 issue 时触发一次。

## 验收闸门（棘轮，防 thrash/防偷偷改坏）
1. `npm run loop:check` 必须全绿（lint/typecheck/全部探针/build）。
2. 改动只允许落在 `balance.ts` 白名单旋钮 + 其区间内。
3. 目标项改善且其余探针不回归才 accept；否则 `git checkout` 回滚。
4. 收敛即停（指标进带不再抖动）；越界进 `NEEDS_DESIGN.md`。
5. 每次调参追加 `docs/BALANCE_LEDGER.md`。

## 扩展（让 bot 持续"更像真人、发现更多")
loop 每发现一类新失败模式，就把它固化成一条新探针断言（session.test.ts / balance-bot.test.ts），
覆盖面随时间单调增长。后续可加：UX 交互探针(selftest-ui 驱动点击+断言状态更新)、性能帧时探针、跨幕 Boss 矩阵。

## 命令
- `npm run loop:check` — 测量层全套（headless，CI/cron 用）。
- `npm run selftest` — loop:check + 设备矩阵 UI 截图（需本地 Chromium）。
- `npx vitest run test/balance-tune.probe.ts`（临时改名 .test.ts）— 调平器搜参。
