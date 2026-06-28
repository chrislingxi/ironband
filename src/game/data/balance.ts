// ── 平衡旋钮层 (单一可调数值出口) ──
// 自动玩家 BOT 调平闸门只允许在本文件的白名单旋钮内、带区间地改数 → 改动永远可编译/可逆/可审计。
// 需要"改机制/加内容"的越界项不在此处, 进人工设计队列。
//
// 调参记录见 docs/BALANCE_LEDGER.md。每次改数请同步 spellK/bossHpMult 的来由。

export const BALANCE = {
  // 元素法术伤害放大因子: skillDamage = baseDamage(lvl) × (1 + synergy×synergyScale) × spellK。
  // 历史 K=14 严重过载(单发秒 Boss); 由 BOT 以"Act1 Boss 硬仗 20-40s"为目标带自动标定。
  spellK: 1.6,
  synergyScale: 1.0,
  // Boss 生命倍率: 物理职业在原 Boss HP 上已是健康的 20-40s, 故默认不改(=1), 避免误伤物理。
  // 失衡仅在元素侧 → 主要靠下调 spellK 把元素 DPS 拉回与物理同档。
  bossHpMult: 1,
} as const;

// 允许 BOT 调平的旋钮区间 (clamp, 防跑飞)。
export const BALANCE_BOUNDS = {
  spellK: [0.1, 14] as const,
  synergyScale: [0, 2] as const,
  bossHpMult: [1, 6] as const,
};
