// D2 命中率公式 (Arreat Summit):
//   ToHit% = 100 · AR/(AR+DR) · 2·Alvl/(Alvl+Dlvl)
// 结果钳制在 [5, 95] —— 永远至少 5% 命中、至多 95%.
export function chanceToHit(
  ar: number,
  dr: number,
  attackerLevel: number,
  defenderLevel: number,
): number {
  const arSafe = Math.max(0, ar);
  const drSafe = Math.max(0, dr);
  const base =
    100 *
    (arSafe / (arSafe + drSafe || 1)) *
    ((2 * attackerLevel) / (attackerLevel + defenderLevel || 1));
  return Math.max(5, Math.min(95, base));
}
