import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { AREAS } from '../src/game/world/act1.ts';
import { QUESTS } from '../src/game/world/quests.ts';

// Boss 区 id → 该幕通关任务。与 Game.BOSS_AREAS 保持一致。
const BOSS_AREAS = [
  'andariel_lair', 'tal_rasha_tomb', 'durance_of_hate', 'chaos_sanctuary', 'worldstone_keep',
];

// 从营地出发, 沿 connects 广搜可达区域集合。
function reachable(): Set<string> {
  const seen = new Set<string>();
  const queue = ['rogue_encampment'];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const def = AREAS[id];
    if (!def) continue;
    for (const t of def.connects) if (!seen.has(t)) queue.push(t);
  }
  return seen;
}

// 强制清空当前区域所有怪 (含 Boss), 触发清场→任务结算。
function clearBossArea(g: Game, areaId: string): void {
  g.loadArea(areaId);
  for (const m of g.monsters) { m.dead = true; m.combat.hp = 0; }
  g.update(1 / 60, { move: { x: 0, y: 0 } });
}

describe('世界连通性 (无法推进的硬阻塞)', () => {
  it('所有 connects 目标都真实存在 (无悬空出口)', () => {
    for (const [id, def] of Object.entries(AREAS)) {
      for (const t of def.connects) {
        expect(AREAS[t], `区域 ${id} 的出口指向不存在的 ${t}`).toBeTruthy();
      }
    }
  });

  it('从营地可达全部 5 个 Boss 区', () => {
    const seen = reachable();
    for (const b of BOSS_AREAS) {
      expect(seen.has(b), `Boss 区 ${b} 从营地不可达`).toBe(true);
    }
  });

  it('从营地可达全部任务目标区', () => {
    const seen = reachable();
    for (const q of QUESTS) {
      expect(seen.has(q.targetArea), `任务「${q.name}」目标 ${q.targetArea} 不可达`).toBe(true);
    }
  });
});

describe('主线推进 + 难度解锁链', () => {
  it('依序击杀五幕 Boss, 各幕完成标记置位', () => {
    const g = new Game(1, 'barbarian');
    clearBossArea(g, 'andariel_lair'); expect(g.act1Complete).toBe(true);
    clearBossArea(g, 'tal_rasha_tomb'); expect(g.act2Complete).toBe(true);
    clearBossArea(g, 'durance_of_hate'); expect(g.act3Complete).toBe(true);
    clearBossArea(g, 'chaos_sanctuary'); expect(g.act4Complete).toBe(true);
    clearBossArea(g, 'worldstone_keep'); expect(g.act5Complete).toBe(true);
  });

  it('普通通关巴尔 → 解锁噩梦', () => {
    const g = new Game(1, 'barbarian');
    expect(g.unlockedDifficulty).toBe('normal');
    clearBossArea(g, 'worldstone_keep');
    expect(g.unlockedDifficulty).toBe('nightmare');
  });

  it('Boss 未死时出口锁闭 (不能跳过 Boss 战)', () => {
    const g = new Game(1, 'barbarian');
    g.loadArea('worldstone_keep');
    expect(g.monsters.length).toBeGreaterThan(0); // Boss 在场
    const before = g.currentArea.id;
    // 把玩家挪到任一出口并多步推进, 应仍被锁在本区
    if (g.currentArea.exits.length) {
      // 多跑几帧让出区冷却自然归零, 玩家贴在出口上, 仍应被 Boss 锁在本区。
      for (let i = 0; i < 120; i++) {
        g.player.pos = { ...g.currentArea.exits[0].pos };
        g.update(1 / 60, { move: { x: 0, y: 0 } });
      }
    }
    expect(g.currentArea.id).toBe(before);
  });
});
