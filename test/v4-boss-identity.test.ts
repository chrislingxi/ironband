import { describe, expect, it } from 'vitest';
import { ANDARIEL } from '../src/game/systems/boss/andariel.ts';
import { DURIEL } from '../src/game/systems/boss/duriel.ts';
import { MEPHISTO } from '../src/game/systems/boss/mephisto.ts';
import { DIABLO } from '../src/game/systems/boss/diablo.ts';
import { BAAL } from '../src/game/systems/boss/baal.ts';
import { AREAS } from '../src/game/world/act1.ts';
import { QUESTS } from '../src/game/world/quests.ts';

describe('V4 original boss identity', () => {
  it('keeps save-compatible ids behind original player-facing names', () => {
    expect([ANDARIEL, DURIEL, MEPHISTO, DIABLO, BAAL].map((boss) => [boss.id, boss.name])).toEqual([
      ['andariel', '血根主母'],
      ['duriel', '铁狱刑王'],
      ['mephisto', '空骸先知'],
      ['diablo', '烬角暴君'],
      ['baal', '腐冠之王'],
    ]);
  });

  it('gives every boss an original arena and quest objective', () => {
    const arenas = ['andariel_lair', 'tal_rasha_tomb', 'durance_of_hate', 'chaos_sanctuary', 'worldstone_keep'];
    const legacyNames = /安达莉尔|督瑞尔|梅菲斯特|墨菲斯托|暗黑破坏神|迪亚波罗|巴尔|塔拉夏|世界石/;
    for (const id of arenas) expect(AREAS[id].name).not.toMatch(legacyNames);
    for (const quest of QUESTS.filter((q) => ['andariel', 'duriel', 'mephisto', 'diablo', 'baal'].includes(q.id))) {
      expect(`${quest.name}${quest.objective}${quest.desc}`).not.toMatch(legacyNames);
    }
  });
});
