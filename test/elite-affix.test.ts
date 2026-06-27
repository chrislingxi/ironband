import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';

// Round 5: 接通此前从未消费的精英词缀 — 寒冷减速(onHitChill) 与 光环增伤(aura)。
describe('精英词缀接线', () => {
  function hardHitter(g: Game, defId: string, dx: number) {
    g.spawnMonster(defId, g.player.pos.x + dx, g.player.pos.y);
    const m = g.monsters[g.monsters.length - 1];
    m.combat.attackRating = 1e7; // 必命中
    m.combat.maxHp = m.combat.hp = 1e7; // 不被玩家秒
    m.attackInterval = 0.1; m.attackCd = 0;
    return m;
  }

  it('寒冷附魔精英命中玩家 → 触发减速, 且 1.5s 后过期', () => {
    const g = new Game(1, 'barbarian');
    g.player.combat.maxHp = 1e7; g.player.combat.hp = 1e7; // 玩家不死, 持续挨打
    const m = hardHitter(g, 'skeleton', 0.6);
    (m as unknown as { onHitChill: boolean }).onHitChill = true;
    m.damage = [{ type: 'cold', min: 1, max: 1 }];
    for (let i = 0; i < 120; i++) g.update(1 / 60, { move: { x: 0, y: 0 } });
    expect(g.isChilled).toBe(true); // 持续被冰精英打 → 减速生效
    g.monsters.length = 0; // 清场, 不再被打
    for (let i = 0; i < 120; i++) g.update(1 / 60, { move: { x: 0, y: 0 } }); // 跑 2s > 1.5s
    expect(g.isChilled).toBe(false); // 减速过期
  });

  it('光环精英(aura)在场 → 附近怪攻击增伤', () => {
    const g = new Game(1, 'barbarian');
    g.player.combat.maxHp = 1e7; g.player.combat.hp = 1e7;
    g.player.combat.defense = 0;
    for (const k of Object.keys(g.player.combat.resist)) (g.player.combat.resist as Record<string, number>)[k] = 0;
    const attacker = hardHitter(g, 'skeleton', 0.6);
    attacker.damage = [{ type: 'physical', min: 100, max: 100 }];
    // 无光环: 测最大单次命中伤害
    const maxHit = () => {
      let mx = 0;
      for (let i = 0; i < 60; i++) {
        const before = g.player.combat.hp;
        g.update(1 / 60, { move: { x: 0, y: 0 } });
        mx = Math.max(mx, before - g.player.combat.hp);
      }
      return mx;
    };
    const dmgNoAura = maxHit();
    // 放光环精英在旁
    g.spawnMonster('shaman', g.player.pos.x + 1, g.player.pos.y);
    (g.monsters[g.monsters.length - 1] as unknown as { aura: boolean }).aura = true;
    const dmgAura = maxHit();
    expect(dmgNoAura).toBeGreaterThan(0);
    expect(dmgAura).toBeGreaterThan(dmgNoAura); // 光环加成 ×1.25
  });
});
