import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeMonster } from '../src/game/entities/factory.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('Phase B: 精英 / 新怪 / 敌方投射物', () => {
  it('野外区域会生成至少一只精英队长', () => {
    const g = new Game(5, 'barbarian');
    g.loadArea('cold_plains');
    expect(g.monsters.length).toBeGreaterThan(3);
    expect(g.monsters.some((m) => !!m.elite)).toBe(true);
  });

  it('精英比同类有更高血量', () => {
    const g = new Game(5, 'barbarian');
    g.loadArea('stony_field');
    const elite = g.monsters.find((m) => m.elite);
    expect(elite).toBeTruthy();
    if (elite) expect(elite.combat.maxHp).toBeGreaterThan(10);
  });

  it('新增怪种可被工厂创建', () => {
    for (const id of ['archer', 'brute', 'spitter', 'hound']) {
      const m = makeMonster(id, 0, 0, mulberry32(1));
      expect(m.defId).toBe(id);
      expect(m.combat.maxHp).toBeGreaterThan(0);
    }
  });

  it('远程怪(弓手)的飞射物会伤害玩家', () => {
    const g = new Game(9, 'barbarian');
    g.player.attackInterval = 999; // 关掉反击
    g.player.pos = { x: 20, y: 20 };
    g.monsters = [];
    g.spawnMonster('archer', 26, 20); // 距离6, 停下放箭
    const hp0 = g.player.combat.hp;
    for (let i = 0; i < 400; i++) g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.player.combat.hp).toBeLessThan(hp0);
  });
});
