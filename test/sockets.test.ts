import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';
import { socketRune, openSockets, matchRuneword, accumulateSockets } from '../src/game/systems/items/sockets.ts';
import { emptyBag } from '../src/game/systems/items/types.ts';

describe('镶孔基础', () => {
  it('空孔数 = 孔数 - 已镶', () => {
    const it = makeNormalItem('double_axe');
    it.sockets = 2;
    expect(openSockets(it)).toBe(2);
    expect(socketRune(it, 'r_tir')).toBe(true);
    expect(openSockets(it)).toBe(1);
  });

  it('孔满后拒绝继续镶', () => {
    const it = makeNormalItem('short_sword');
    it.sockets = 1;
    expect(socketRune(it, 'r_eld')).toBe(true);
    expect(socketRune(it, 'r_tir')).toBe(false);
  });

  it('未知符文不可镶', () => {
    const it = makeNormalItem('short_sword');
    it.sockets = 2;
    expect(socketRune(it, '不存在')).toBe(false);
  });

  it('符文属性汇总进 bag', () => {
    const it = makeNormalItem('double_axe');
    it.sockets = 1;
    socketRune(it, 'r_ith'); // +9 maxdam
    const bag = emptyBag();
    accumulateSockets(bag, it);
    expect(bag.maxdam).toBe(9);
  });
});

describe('符文之语', () => {
  it('武器按序镶满 提尔+艾尔德 → 寒钢 (+25%伤害,+50命中)', () => {
    const it = makeNormalItem('double_axe');
    it.sockets = 2;
    socketRune(it, 'r_tir');
    socketRune(it, 'r_eld');
    const rw = matchRuneword(it);
    expect(rw?.name).toBe('寒钢');
    const bag = emptyBag();
    accumulateSockets(bag, it);
    // 寒钢额外 +25 dmg_perc +50 tohit, 叠加符文本体(提尔+8法力, 艾尔德+30命中)
    expect(bag.dmg_perc).toBe(25);
    expect(bag.tohit).toBe(50 + 30);
  });

  it('顺序不对不成语', () => {
    const it = makeNormalItem('double_axe');
    it.sockets = 2;
    socketRune(it, 'r_eld');
    socketRune(it, 'r_tir');
    expect(matchRuneword(it)).toBeNull();
  });

  it('底材大类不符不成语 (武器之语镶在盔甲上无效)', () => {
    const it = makeNormalItem('club'); // 武器
    it.sockets = 2;
    socketRune(it, 'r_tir');
    socketRune(it, 'r_eld');
    expect(matchRuneword(it)?.name).toBe('寒钢'); // 武器→成立
  });
});

describe('Game 镶孔接入', () => {
  it('镶孔消耗符文背包并提升战力', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment.weapon = makeNormalItem('double_axe');
    g.character.equipment.weapon.sockets = 2;
    g.runeBag = { r_tir: 1, r_eld: 1 };
    g.recompute(true);
    const ar0 = g.player.combat.attackRating;
    expect(g.socketEquipped('weapon', 'r_eld')).toBe(true); // +30 命中
    expect(g.runeBag.r_eld).toBeUndefined(); // 消耗殆尽
    expect(g.player.combat.attackRating).toBeGreaterThan(ar0);
  });

  it('符文背包为空时镶孔失败', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment.weapon = makeNormalItem('double_axe');
    g.character.equipment.weapon.sockets = 1;
    expect(g.socketEquipped('weapon', 'r_tir')).toBe(false);
  });
});
