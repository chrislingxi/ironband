import { describe, it, expect } from 'vitest';
import { AREAS } from '../src/game/world/act1.ts';
import { Game } from '../src/game/sim/Game.ts';
import { makeMonster } from '../src/game/entities/factory.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('第三幕内容', () => {
  it('Act3 区域并入注册表, 卡纳镇为城镇, 仇恨监狱为终点', () => {
    expect(AREAS['kurast_docks']?.isTown).toBe(true);
    expect(AREAS['kurast_docks']?.act).toBe(3);
    expect(AREAS['durance_of_hate']?.act).toBe(3);
  });

  it('第二幕塔拉夏古墓连通第三幕卡纳镇', () => {
    expect(AREAS['tal_rasha_tomb']?.connects).toContain('kurast_docks');
  });

  it('梅菲斯特是已注册怪物, Boss 级血量', () => {
    const m = makeMonster('mephisto', 5, 5, mulberry32(1));
    expect(m.defId).toBe('mephisto');
    expect(m.combat.maxHp).toBeGreaterThan(1000);
  });

  it('进入仇恨监狱只刷梅菲斯特 Boss', () => {
    const g = new Game(1);
    g.loadArea('durance_of_hate');
    expect(g.monsters.length).toBe(1);
    expect(g.monsters[0].defId).toBe('mephisto');
  });

  it('击败梅菲斯特通关第三幕 (非最终幕, 暂不解锁)', () => {
    const g = new Game(1);
    g.loadArea('durance_of_hate');
    g.monsters = []; // 模拟 Boss 已清
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.act3Complete).toBe(true);
    expect(g.unlockedDifficulty).toBe('normal'); // 解锁挪到最终幕巴尔
  });
});
