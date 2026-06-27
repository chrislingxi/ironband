import { describe, it, expect } from 'vitest';
import { AREAS } from '../src/game/world/act1.ts';
import { Game } from '../src/game/sim/Game.ts';
import { makeMonster } from '../src/game/entities/factory.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('第四/五幕内容 + 全幕贯通', () => {
  it('Act4/5 区域并入注册表, 城镇与终点正确', () => {
    expect(AREAS['pandemonium_fortress']?.isTown).toBe(true);
    expect(AREAS['pandemonium_fortress']?.act).toBe(4);
    expect(AREAS['chaos_sanctuary']?.act).toBe(4);
    expect(AREAS['harrogath']?.isTown).toBe(true);
    expect(AREAS['worldstone_keep']?.act).toBe(5);
  });

  it('幕间连通: 三→四→五', () => {
    expect(AREAS['durance_of_hate']?.connects).toContain('pandemonium_fortress');
    expect(AREAS['chaos_sanctuary']?.connects).toContain('harrogath');
  });

  it('暗黑破坏神 / 巴尔 已注册, Boss 级血量', () => {
    expect(makeMonster('diablo', 5, 5, mulberry32(1)).combat.maxHp).toBeGreaterThan(2000);
    expect(makeMonster('baal', 5, 5, mulberry32(1)).combat.maxHp).toBeGreaterThan(3000);
  });

  it('Boss 区独占刷对应 Boss', () => {
    const g = new Game(1);
    g.loadArea('chaos_sanctuary');
    expect(g.monsters.map((m) => m.defId)).toEqual(['diablo']);
    g.loadArea('worldstone_keep');
    expect(g.monsters.map((m) => m.defId)).toEqual(['baal']);
  });

  it('击败暗黑破坏神不解锁; 击败巴尔(最终幕)才解锁下一难度', () => {
    const g = new Game(1);
    g.loadArea('chaos_sanctuary');
    g.monsters = [];
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.act4Complete).toBe(true);
    expect(g.unlockedDifficulty).toBe('normal'); // 迪亚波罗非最终幕

    g.loadArea('worldstone_keep');
    g.monsters = [];
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.act5Complete).toBe(true);
    expect(g.unlockedDifficulty).toBe('nightmare'); // 巴尔=最终幕, 解锁
  });
});
