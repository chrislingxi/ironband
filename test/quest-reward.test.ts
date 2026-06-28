import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { serializeGame, applySave } from '../src/game/systems/save/index.ts';

// M2: 任务奖励 — 金币/技能点/属性点/装备/永久增益。
function clearBoss(g: Game, areaId: string) {
  g.loadArea(areaId);
  for (const m of g.monsters) { m.dead = true; m.combat.hp = 0; }
  g.update(1 / 60, { move: { x: 0, y: 0 } });
}

describe('任务奖励', () => {
  it('击败安达莉尔发金币+保底装备', () => {
    const g = new Game(1, 'barbarian');
    const gold0 = g.goldTotal, inv0 = g.inventory.length;
    clearBoss(g, 'andariel_lair');
    // 全屏自动拾取后, 奖励 600 之外还会收取 Boss 掉落的散金, 故 ≥ +600。
    expect(g.goldTotal).toBeGreaterThanOrEqual(gold0 + 600);
    expect(g.inventory.length + g.groundItems.length).toBeGreaterThan(inv0); // 获得一件装备
  });

  it('击败督瑞尔发永久+25生命 (maxHp 提升且持久化)', () => {
    const g = new Game(1, 'barbarian');
    const hp0 = g.player.combat.maxHp;
    clearBoss(g, 'tal_rasha_tomb');
    expect(g.questBonuses.maxhp).toBe(25);
    expect(g.player.combat.maxHp).toBe(hp0 + 25);
    // 持久化往返
    const g2 = new Game(2, 'amazon');
    applySave(g2, serializeGame(g));
    expect(g2.questBonuses.maxhp).toBe(25);
  });

  it('击败梅菲斯特发+5属性点; 巴尔发+8全抗', () => {
    const g = new Game(1, 'barbarian');
    const sp0 = g.statPoints;
    clearBoss(g, 'durance_of_hate');
    expect(g.statPoints).toBe(sp0 + 5);
    const fire0 = g.player.combat.resist.fire;
    clearBoss(g, 'worldstone_keep');
    expect(g.questBonuses.res_all).toBe(8);
    expect(g.player.combat.resist.fire).toBe(fire0 + 8);
  });

  it('净化巢穴发技能点', () => {
    const g = new Game(1, 'barbarian');
    const before = g.skillPointsAvailable();
    clearBoss(g, 'den_of_evil');
    expect(g.skillPointsAvailable()).toBe(before + 1);
  });
});
