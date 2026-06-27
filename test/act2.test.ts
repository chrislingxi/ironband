import { describe, it, expect } from 'vitest';
import { AREAS } from '../src/game/world/act1.ts';
import { Game } from '../src/game/sim/Game.ts';
import { makeMonster } from '../src/game/entities/factory.ts';
import { mulberry32 } from '../src/engine/math/rng.ts';

describe('第二幕内容', () => {
  it('Act2 区域并入总注册表, 鲁高因为城镇, 塔拉夏古墓为终点', () => {
    expect(AREAS['lut_gholein']?.isTown).toBe(true);
    expect(AREAS['lut_gholein']?.act).toBe(2);
    expect(AREAS['tal_rasha_tomb']?.act).toBe(2);
  });

  it('第一幕安达莉尔巢穴连通第二幕鲁高因', () => {
    expect(AREAS['andariel_lair']?.connects).toContain('lut_gholein');
  });

  it('督瑞尔是已注册怪物, 可被生成', () => {
    const d = makeMonster('duriel', 5, 5, mulberry32(1));
    expect(d.defId).toBe('duriel');
    expect(d.combat.maxHp).toBeGreaterThan(500); // Boss 级血量
  });

  it('进入塔拉夏古墓只刷督瑞尔 Boss', () => {
    const g = new Game(1);
    g.loadArea('tal_rasha_tomb');
    expect(g.monsters.length).toBe(1);
    expect(g.monsters[0].defId).toBe('duriel');
  });

  it('野外区域可不清场自由走到出口前往相邻区 (修复无法进入寒冷平原)', () => {
    const g = new Game(1);
    g.loadArea('blood_moor');
    expect(g.monsters.length).toBeGreaterThan(0); // 仍有怪
    g.update(1.1, { move: { x: 0, y: 0 } }); // 走过进入冷却 travelCd
    // 找到通往寒冷平原的出口并把玩家放上去
    const exit = g.currentArea.exits.find((e) => e.toId === 'cold_plains');
    expect(exit).toBeTruthy();
    g.player.pos = { x: exit!.pos.x, y: exit!.pos.y };
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.currentArea.id).toBe('cold_plains'); // 未清场也已传送
  });

  it('Boss 区未击败 Boss 时锁定出口 (不可绕过)', () => {
    const g = new Game(1);
    g.loadArea('andariel_lair');
    g.update(1.1, { move: { x: 0, y: 0 } });
    const exit = g.currentArea.exits[0];
    g.player.pos = { x: exit.pos.x, y: exit.pos.y };
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.currentArea.id).toBe('andariel_lair'); // Boss 未死, 出口锁定
  });

  it('击败督瑞尔通关第二幕并解锁下一难度', () => {
    const g = new Game(1);
    // 直接驱动任务完成路径: 清空塔拉夏古墓
    g.loadArea('tal_rasha_tomb');
    g.monsters = []; // 模拟 Boss 已被清
    g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.act2Complete).toBe(true);
    expect(g.unlockedDifficulty).toBe('nightmare');
  });
});
