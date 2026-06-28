# 平衡调参账本 (BALANCE_LEDGER)

自动玩家 BOT 驱动的数值调平记录。每条含: 旋钮改动、前后指标、验收结论。
旋钮定义见 `src/game/data/balance.ts`；探针/闸门见 `test/balance-bot.test.ts`；调平器见 `test/balance-tune.probe.ts`。

---

## 2026-06-28 · #1 元素法术秒 Boss 失衡

**问题来源**：玩家反馈「堆叠技能点后第一关 Boss 三四发寒冰箭射死」。

**BOT 量化复现**（安达莉尔/普通, HP≈650, `spellK=14`）：
| 职业 | 表现 |
|---|---|
| 法师/亚马逊(元素) | 单发 ice_blast/glacial_spike/blizzard/ice_arrow → **0.3-0.4s / 1 次施放秒杀**, Lv14 即如此 |
| 野蛮人(物理) | 24-32s / 38-45 击 (健康, 不受影响) |

**根因**：元素法术 `skillDamage = baseDamage(lvl) × (1+synergy) × spellK`，`spellK=14` 严重过载；物理走武器伤害不受影响。

**调平器结论（关键发现）**：单一全局 `spellK` 存在**两端张力**——
- 压低到 0.12：normal Act1 进 20-40s 硬仗带，但**地狱巴尔(无协同 endgame build)打不动**。
- 抬高到 14：endgame 正常，但 normal 被秒。
- **可行下界 = endgame 强制 `spellK ≥ 1.6`**（地狱巴尔 65s 可杀且存活）。

**决策**：`spellK: 14 → 1.6`（endgame 安全的最低值，等价 normal 失衡最小）。`bossHpMult=1`（不误伤物理）。

**验收（BOT, spellK=1.6）**：
| 场景 | 修复前 | 修复后 |
|---|---|---|
| 法师 Lv14 打 Act1 Boss | 1 发 / 0.4s | **8 发 / 6.2s** |
| 亚马逊 Lv14 打 Act1 Boss | 1 发 | **8 发 / 4.6s** |
| 地狱巴尔(无协同 endgame) | (基线✓) | ✓ 65s 存活 |
| 野蛮人(物理) | 24-32s | 不变 |

**遗留（→ NEEDS_DESIGN.md）**：越级返刷(Lv20/26 打 Act1 Boss)仍 3-4 发碾压。让「高配/越级也吃力」需**更陡的技能逐级缩放**(low lvl 弱、high lvl 强) 或 Boss 战力随玩家成长缩放——多旋钮/数据级设计改动，非单旋钮可解。
