import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import {
  serializeGame,
  applySave,
  exportCode,
  importCode,
  nextFreeSlot,
  MAX_SLOTS,
  type SlotMeta,
} from '../src/game/systems/save/index.ts';
import { discover, listWaypoints } from '../src/game/systems/waypoint/waypoint.ts';
import { AREAS } from '../src/game/world/act1.ts';
import { makeNormalItem } from '../src/game/systems/items/generate.ts';

describe('Phase E: 存档 + 航点', () => {
  it('序列化→应用 保留职业/等级/金币', () => {
    const g1 = new Game(1, 'sorceress');
    g1.grantXp(g1.xpForNext(1) + g1.xpForNext(2));
    g1.goldTotal = 777;
    const data = serializeGame(g1);
    const g2 = new Game(2, 'barbarian');
    applySave(g2, data);
    expect(g2.character.cls).toBe('sorceress');
    expect(g2.character.level).toBe(g1.character.level);
    expect(g2.goldTotal).toBe(777);
  });

  it('导出码 ↔ 导入码 往返一致', () => {
    const g = new Game(3, 'amazon');
    g.goldTotal = 1234;
    const data = serializeGame(g);
    const back = importCode(exportCode(data));
    expect(back.cls).toBe('amazon');
    expect(back.gold).toBe(1234);
    expect(back.level).toBe(data.level);
  });

  it('共享仓库: 背包↔仓库存取, 并随存档往返', () => {
    const g = new Game(11, 'sorceress');
    const item = makeNormalItem('short_sword');
    g.inventory.push(item);
    expect(g.depositToStash(item.uid)).toBe(true);
    expect(g.stash.some((i) => i.uid === item.uid)).toBe(true);
    expect(g.inventory.some((i) => i.uid === item.uid)).toBe(false);
    // 往返存档: 仓库物品保留
    const g2 = new Game(12, 'barbarian');
    applySave(g2, serializeGame(g));
    expect(g2.stash.length).toBe(1);
    expect(g2.stash[0].base.id).toBe('short_sword');
    // 取回背包
    expect(g2.withdrawFromStash(g2.stash[0].uid)).toBe(true);
    expect(g2.stash.length).toBe(0);
  });

  it('多存档槽: 角色名写入存档, 缺省按职业+等级兜底', () => {
    const g = new Game(7, 'barbarian');
    expect(serializeGame(g, '阿强').name).toBe('阿强');
    expect(serializeGame(g).name).toBe('barbarian-Lv1');
  });

  it('多存档槽: nextFreeSlot 跳过已占用槽, 满则 null', () => {
    const mk = (id: string): SlotMeta =>
      ({ slotId: id, name: id, cls: 'barbarian', level: 1, difficulty: 'normal', areaId: 'rogue_camp' });
    expect(nextFreeSlot([])).toBe('slot0');
    expect(nextFreeSlot([mk('slot0'), mk('slot2')])).toBe('slot1');
    const full = Array.from({ length: MAX_SLOTS }, (_, i) => mk(`slot${i}`));
    expect(nextFreeSlot(full)).toBeNull();
  });

  it('航点: 发现带航点区域并列出, 非航点区不计', () => {
    const s = new Set<string>();
    discover(s, 'cold_plains', AREAS); // 有航点
    discover(s, 'blood_moor', AREAS); // 无航点
    expect(s.has('cold_plains')).toBe(true);
    expect(s.has('blood_moor')).toBe(false);
    expect(listWaypoints(s, AREAS).some((w) => w.id === 'cold_plains')).toBe(true);
  });
});

describe('存档健壮性 (F)', () => {
  it('新增字段全往返: 属性点/药水/自动饮/符文/难度解锁', () => {
    const g = new Game(21, 'amazon');
    g.loadArea('blood_moor'); // 离开营地, 否则读档时进城会补满药水
    g.statPoints = 13;
    g.potions = 3;
    g.autoQuaff = false;
    g.runeBag = { r_tir: 2, r_eld: 1 };
    g.unlockedDifficulty = 'hell';
    g.difficulty = 'nightmare';
    g.act1Complete = g.act2Complete = true;
    const g2 = new Game(22, 'barbarian');
    applySave(g2, serializeGame(g));
    expect(g2.statPoints).toBe(13);
    expect(g2.potions).toBe(3);
    expect(g2.autoQuaff).toBe(false);
    expect(g2.runeBag).toEqual({ r_tir: 2, r_eld: 1 });
    expect(g2.unlockedDifficulty).toBe('hell');
    expect(g2.difficulty).toBe('nightmare');
    expect(g2.act2Complete).toBe(true);
  });

  it('镶孔/套装物品往返: 孔/符文/setId 保留并仍生效', () => {
    const g = new Game(23, 'barbarian');
    const w = makeNormalItem('double_axe');
    w.sockets = 2;
    w.socketed = ['r_tir', 'r_eld']; // 寒钢成语
    g.character.equipment.weapon = w;
    const ar0 = (g.recompute(true), g.player.combat.attackRating);
    const g2 = new Game(24, 'amazon');
    applySave(g2, serializeGame(g));
    const w2 = g2.character.equipment.weapon!;
    expect(w2.sockets).toBe(2);
    expect(w2.socketed).toEqual(['r_tir', 'r_eld']);
    // 符文之语贡献在新档仍计入 (命中提升)
    expect(g2.player.combat.attackRating).toBe(ar0);
  });

  it('旧档兼容: 缺新字段的存档应用不崩并取默认值', () => {
    const g = new Game(25, 'barbarian');
    const data = serializeGame(g) as unknown as Record<string, unknown>;
    // 模拟旧版本存档: 删去后续新增字段
    delete data.statPoints; delete data.potions; delete data.autoQuaff;
    delete data.runeBag; delete data.unlockedDifficulty;
    delete data.act3Complete; delete data.act4Complete; delete data.act5Complete;
    const g2 = new Game(26, 'amazon');
    expect(() => applySave(g2, data as never)).not.toThrow();
    expect(g2.potions).toBe(g2.potionCap); // 旧档按满兜底
    expect(g2.autoQuaff).toBe(true);
    expect(g2.runeBag).toEqual({});
    expect(g2.unlockedDifficulty).toBe(g2.difficulty); // 按当前难度兜底
    expect(g2.statPoints).toBe(0);
  });

  it('满背包往返: 数量与基础 id 全保留', () => {
    const g = new Game(27, 'sorceress');
    for (let i = 0; i < g.invCap; i++) g.inventory.push(makeNormalItem('short_sword'));
    const g2 = new Game(28, 'barbarian');
    applySave(g2, serializeGame(g));
    expect(g2.inventory.length).toBe(g.invCap);
    expect(g2.inventory.every((it) => it.base.id === 'short_sword')).toBe(true);
  });

  it('导出码往返保留镶孔与符文背包', () => {
    const g = new Game(29, 'barbarian');
    g.runeBag = { r_nef: 3 };
    const w = makeNormalItem('chain');
    w.sockets = 1; w.socketed = ['r_nef'];
    g.character.equipment.armor = w;
    const back = importCode(exportCode(serializeGame(g)));
    expect(back.runeBag).toEqual({ r_nef: 3 });
    expect(back.equipment.armor.socketed).toEqual(['r_nef']);
  });
});
