import { describe, it, expect } from 'vitest';
import { makeMonster } from '../src/game/entities/factory.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

// Round 6: 地狱难度免疫墙 — 部分怪在 hell 抗性达 100 (免疫), 逼玩家配副伤害。
describe('地狱元素免疫', () => {
  const rng = mulberry32(1);
  const hell = (id: string) => makeMonster(id, 0, 0, rng, 'hell');

  it('骷髅地狱闪电免疫, 普通难度不免疫', () => {
    expect(hell('skeleton').combat.resist.lightning).toBe(100);
    expect(makeMonster('skeleton', 0, 0, rng, 'normal').combat.resist.lightning).toBeLessThan(100);
  });

  it('行尸地狱毒免疫, 萨满地狱火免疫, 督军地狱冰免疫', () => {
    expect(hell('zombie').combat.resist.poison).toBe(100);
    expect(hell('shaman').combat.resist.fire).toBe(100);
    expect(hell('brute').combat.resist.cold).toBe(100);
  });

  it('弓手远程为物理 (不再误判火伤)', () => {
    const a = hell('archer');
    expect(a.damage[0].type).toBe('physical');
  });

  it('萨满远程仍为火, 吐毒虫为毒', () => {
    expect(hell('shaman').damage[0].type).toBe('fire');
    expect(hell('spitter').damage[0].type).toBe('poison');
  });
});
