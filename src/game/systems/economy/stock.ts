// 商店货架生成: 按区域等级铺一排可买物品 (已鉴定). 进城时刷新一次, 保持本次停留稳定.
import { generateShopItem, type ItemInstance } from '@game/systems/items/index.ts';
import type { RNG } from '@engine/math/rng.ts';

// 生成一排商店库存 (默认 10 件).
export function generateShopStock(mlvl: number, rng: RNG, count = 10): ItemInstance[] {
  const out: ItemInstance[] = [];
  for (let i = 0; i < count; i++) out.push(generateShopItem(Math.max(1, mlvl), rng));
  return out;
}
