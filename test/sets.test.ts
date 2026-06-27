import { describe, it, expect } from 'vitest';
import { Game } from '../src/game/sim/Game.ts';
import { makeNormalItem } from '../src/game/systems/items/index.ts';
import { deriveCombat } from '../src/game/systems/stats/character.ts';
import { SET_ITEMS, SETS } from '../src/game/data/sets.ts';
import type { ItemInstance } from '../src/game/systems/items/types.ts';

// 由套装定义构造一件套装物品 (镜像 generate.makeSetItem, 测试用)。
function setPiece(id: string): ItemInstance {
  const def = SET_ITEMS.find((s) => s.id === id)!;
  const it = makeNormalItem(def.baseId);
  it.rarity = 'set';
  it.setId = def.setId;
  it.affixes = def.affixes.map((a, i) => ({ id: `${id}_${i}`, kind: i % 2 === 0 ? 'prefix' : 'suffix', stat: a.stat, value: a.value, label: a.label }));
  return it;
}

describe('套装加成', () => {
  it('穿 1 件无套装加成 (仅单件词缀)', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment = {};
    g.character.equipment.helm = setPiece('warden_helm');
    const d = deriveCombat(g.character);
    // 守誓者2件才有 +12 全抗; 单件只有该件自身 +8
    expect(d.resist.fire).toBe(8);
  });

  it('穿 2 件触发 2 件档加成', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment = {};
    g.character.equipment.helm = setPiece('warden_helm');   // +8 全抗
    g.character.equipment.armor = setPiece('warden_armor');  // 无全抗
    const d = deriveCombat(g.character);
    // 单件 helm +8 + 套装2件 +12 = 20 火抗
    expect(d.resist.fire).toBe(20);
  });

  it('穿满 3 件叠加 2 件档 + 3 件档 (防御%/生命)', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment = {};
    g.character.equipment.helm = setPiece('warden_helm');
    g.character.equipment.armor = setPiece('warden_armor');
    g.character.equipment.shield = setPiece('warden_shield');
    const hp2 = (() => { const gg = new Game(1, 'barbarian'); gg.character.equipment = { helm: setPiece('warden_helm'), armor: setPiece('warden_armor') }; return deriveCombat(gg.character).maxHp; })();
    const d = deriveCombat(g.character);
    // 3件档 +50 生命 → 满套生命高于 2 件
    expect(d.maxHp).toBeGreaterThan(hp2);
  });

  it('混搭两套各 1 件不触发任一套装加成', () => {
    const g = new Game(1, 'barbarian');
    g.character.equipment = {};
    g.character.equipment.helm = setPiece('warden_helm');    // 守誓者
    g.character.equipment.gloves = setPiece('hunter_gloves'); // 逐影
    const d = deriveCombat(g.character);
    expect(d.resist.fire).toBe(8); // 仅 helm 单件, 无套装加成
  });

  it('数据自洽: 每件套装件的 baseId 存在, setId 指向已定义套装', () => {
    for (const s of SET_ITEMS) {
      expect(makeNormalItem(s.baseId)).toBeTruthy();
      expect(SETS.find((set) => set.id === s.setId)).toBeTruthy();
    }
  });
});
