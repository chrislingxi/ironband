import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeUniqueItem } from '../src/game/systems/items/index.ts';

describe('V3 亚马逊垂直切片', () => {
  it('亚马逊起手即拥有远程工具组, 且不透支升级技能点', () => {
    const g = new Game(7, 'amazon');
    expect(g.assignedSkills).toEqual(['basic_attack', 'multiple_shot', 'cold_arrow', 'magic_arrow']);
    expect(g.skillKey(0)?.name).toBe('弓箭射击');
    expect(g.skillKey(1)?.name).toBe('多重箭');
    expect(g.skillKey(2)?.name).toBe('冰冻箭');
    expect(g.skillKey(3)?.name).toBe('魔法箭');
    expect(g.skillPointsAvailable()).toBe(0);
    g.character.level = 2;
    expect(g.skillPointsAvailable()).toBe(1);
  });

  it('血腥旷野给亚马逊生成猎手试炼小队', () => {
    const g = new Game(7, 'amazon');
    g.loadArea('blood_moor');
    expect(g.monsters.some((m) => m.elite?.name === '碎角督军')).toBe(true);
    expect(g.monsters.some((m) => m.defId === 'archer')).toBe(true);
    expect(g.notices.some((n) => n.includes('猎手试炼'))).toBe(true);
  });

  it('首件构筑装备鸦羽穿心让多重箭获得额外箭矢与穿透', () => {
    const g = new Game(7, 'amazon');
    g.character.equipment.weapon = makeUniqueItem('ravenneedle', 3, true);
    g.recompute();
    g.spawnMonster('zombie', g.player.pos.x + 5, g.player.pos.y);
    g.useSkill(1);
    const arrows = g.missiles.filter((m) => m.fromPlayer && m.kind === 'arrow');
    expect(arrows.length).toBe(9);
    expect(arrows.every((m) => m.pierce === 2 && m.range === 18)).toBe(true);
  });
});
