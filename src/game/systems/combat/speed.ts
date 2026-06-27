// 攻速突破点 (Increased Attack Speed). D2 攻速并非线性, 而是按"突破点"跳档:
// 累积 IAS% 越过某阈值才真正快一档, 阈值之间无变化。这里用一张简化突破点表近似手感。
// ias=0 时返回原始挥击间隔 (不改变徒手/无加速基础, 保持既有手感与测试)。

// EIAS 突破点 (%) → 对应的速度系数 (间隔除以该系数)。单调递增。
const IAS_BREAKPOINTS: { at: number; factor: number }[] = [
  { at: 0, factor: 1.0 },
  { at: 15, factor: 1.15 },
  { at: 30, factor: 1.32 },
  { at: 52, factor: 1.52 },
  { at: 80, factor: 1.75 },
  { at: 120, factor: 2.0 },
];

/** 取 ≤ ias 的最高突破点速度系数。 */
export function iasFactor(ias: number): number {
  let f = 1.0;
  for (const bp of IAS_BREAKPOINTS) if (ias >= bp.at) f = bp.factor;
  return f;
}

/** 由基础挥击间隔 + IAS% 求实际间隔 (秒)。ias≤0 → 原值。 */
export function attackInterval(baseSeconds: number, ias: number): number {
  return baseSeconds / iasFactor(Math.max(0, ias));
}
