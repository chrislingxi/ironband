// 精英怪词缀系统 (D2 风格 champion/unique 怪群词缀).
// 通过 apply 直接改写 Entity 的战斗/速度/伤害字段; 需要行为标记的(死亡爆炸/光环)
// 写到 Entity 上的自定义属性 (经 `as any`, 不改 entity.ts).
import type { Entity } from '@game/entities/entity.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import type { DamageType } from '@game/data/schema.ts';
import type { RNG } from '@engine/math/rng.ts';
import { randInt } from '@engine/math/rng.ts';

// 单条精英词缀定义. apply 在生成精英时调用, 直接突变传入实体.
export interface EliteAffix {
  id: string;
  name: string; // 原创词缀名 (中文)
  color: number; // 描边/标识色 (0xRRGGBB)
  apply(e: Entity): void;
}

// 默认实体色, 用于挑选描边色时跳过(认为是"原色不变").
// applyElite 不依赖某个固定常量, 而是取首个非默认词缀色; 这里仅作语义参考.

// 给实体追加一条元素伤害 (按现有物理伤害规模派生, 保证有意义的数值).
function addElementalDamage(e: Entity, type: DamageType, scale: number): void {
  // 取实体当前伤害的峰值作为基准; 没有伤害则给一个保底值.
  let baseMax = 0;
  for (const d of e.damage) {
    if (d.max > baseMax) baseMax = d.max;
  }
  if (baseMax <= 0) baseMax = 4;
  const min = Math.max(1, Math.round(baseMax * scale * 0.5));
  const max = Math.max(min, Math.round(baseMax * scale));
  const inst: DamageInstance = { type, min, max };
  e.damage.push(inst);
}

// 精英词缀池 (原创名). 顺序即默认权重展示顺序.
export const ELITE_AFFIXES: EliteAffix[] = [
  {
    // 极速: 移动与攻击都更快.
    id: 'frenzy',
    name: '疾风之刃',
    color: 0xffe066,
    apply(e: Entity): void {
      e.speed *= 1.4;
      e.attackInterval *= 0.7; // 攻击间隔变短 = 攻速变快
    },
  },
  {
    // 火焰附魔: 追加火焰伤害 + 火抗 + 死亡爆炸标记.
    id: 'fireEnchant',
    name: '炽炎之核',
    color: 0xff5522,
    apply(e: Entity): void {
      addElementalDamage(e, 'fire', 0.9);
      e.combat.resist.fire += 50;
      // 行为标记: 死亡时对周围造成 fire 伤害 (由 Game 死亡逻辑读取).
      (e as { onDeathExplode?: boolean }).onDeathExplode = true;
    },
  },
  {
    // 寒冷附魔: 追加寒冷伤害 + 减速标记 (实际减速由命中逻辑读取此标记).
    id: 'coldEnchant',
    name: '霜噬之息',
    color: 0x66ccff,
    apply(e: Entity): void {
      addElementalDamage(e, 'cold', 0.8);
      e.combat.resist.cold += 50;
      // 行为标记: 命中目标时施加减速 (由 Game 命中逻辑读取).
      (e as { onHitChill?: boolean }).onHitChill = true;
    },
  },
  {
    // 闪电附魔: 追加闪电伤害 (高方差, 体现电系特色).
    id: 'lightningEnchant',
    name: '雷怒之鞭',
    color: 0xaa88ff,
    apply(e: Entity): void {
      addElementalDamage(e, 'lightning', 1.2);
      e.combat.resist.lightning += 50;
    },
  },
  {
    // 增益光环: 自身轻微加成 + 光环标记 (周围同群增益由 Game 读取标记施加).
    id: 'auraBuff',
    name: '战旗统帅',
    color: 0xffaa33,
    apply(e: Entity): void {
      // 自身轻微加成 (光环持有者也吃到光环效果的体现).
      e.combat.attackRating = Math.round(e.combat.attackRating * 1.15);
      e.combat.defense = Math.round(e.combat.defense * 1.15);
      // 行为标记: 自身+周围 buff (由 Game 群体逻辑读取).
      (e as { aura?: boolean }).aura = true;
    },
  },
  {
    // 坚韧: 大幅提升生命与防御, 充当肉盾.
    id: 'stalwart',
    name: '磐岩壁垒',
    color: 0x88aa66,
    apply(e: Entity): void {
      e.combat.maxHp = Math.round(e.combat.maxHp * 2.2);
      e.combat.hp = Math.round(e.combat.hp * 2.2);
      e.combat.defense = Math.round(e.combat.defense * 1.5);
    },
  },
];

// 按 id 快速查表.
const AFFIX_BY_ID: Record<string, EliteAffix> = {};
for (const a of ELITE_AFFIXES) AFFIX_BY_ID[a.id] = a;

// 从词缀池中不重复地随机抽取 count 个 id (Fisher-Yates 部分洗牌).
export function rollEliteAffixes(rng: RNG, count: number): string[] {
  const ids = ELITE_AFFIXES.map((a) => a.id);
  const n = Math.max(0, Math.min(count, ids.length));
  for (let i = 0; i < n; i++) {
    const j = randInt(rng, i, ids.length - 1);
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }
  return ids.slice(0, n);
}

// 精英应用结果: 供调用方存到实体上做渲染 (名字 + 描边色).
export interface EliteResult {
  name: string;
  color: number;
}

// 依次对实体应用一组词缀; 返回拼接名与描边色.
// - 名字: "<词缀名 词缀名...>" 形式拼接 (空格分隔).
// - 描边色: 取首个有效词缀色; 无词缀则回退实体原色.
export function applyElite(e: Entity, affixIds: string[]): EliteResult {
  // 精英固有强度: D2 中精英/首领自带血量与伤害倍率 (不靠词缀)。给 ×3 血、×1.4 伤。
  e.combat.maxHp = Math.round(e.combat.maxHp * 3);
  e.combat.hp = e.combat.maxHp;
  e.damage = e.damage.map((d) => ({ ...d, min: Math.round(d.min * 1.4), max: Math.round(d.max * 1.4) }));
  const parts: string[] = [];
  let outline = e.color; // 默认: 原色不变
  let pickedColor = false;
  for (const id of affixIds) {
    const affix = AFFIX_BY_ID[id];
    if (!affix) continue;
    affix.apply(e);
    parts.push(affix.name);
    if (!pickedColor) {
      outline = affix.color;
      pickedColor = true;
    }
  }
  const name = parts.length > 0 ? parts.join(' ') : '';
  return { name, color: outline };
}
