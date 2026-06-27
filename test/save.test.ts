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
