// 确定性伪随机 (mulberry32). 战斗命中/伤害/掉落注入 RNG → 可复现 + 可单测.
// 运行时可用 Math.random 包装, 测试用固定种子.
export type RNG = () => number; // 返回 [0,1)

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 整数 [min,max] 闭区间
export function randInt(rng: RNG, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export const defaultRng: RNG = Math.random;
