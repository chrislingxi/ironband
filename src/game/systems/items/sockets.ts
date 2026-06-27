// 镶孔与符文之语: 符文镶入 → 属性贡献 + 符文之语判定。
// 与 types.ts 解耦循环: 本模块依赖 types + 数据表, 由 character.ts 在汇总装备时调用。
import type { ItemInstance, StatBag, StatKey } from './types.ts';
import { addStat } from './types.ts';
import { runeById, RUNEWORDS, type SocketBaseClass } from '@game/data/runes.ts';

// 该底材属于哪个符文之语大类 (不可镶则 null)。
export function socketBaseClass(item: ItemInstance): SocketBaseClass | null {
  const slot = item.base.slot;
  if (slot === 'weapon') return 'weapon';
  if (slot === 'armor') return 'armor';
  if (slot === 'helm') return 'helm';
  if (slot === 'shield') return 'shield';
  return null;
}

// 该底材的最大孔数: 优先用 base.sockets, 否则按槽位给默认上限。
export function maxSockets(item: ItemInstance): number {
  if (item.base.sockets && item.base.sockets > 0) return item.base.sockets;
  switch (item.base.slot) {
    case 'weapon':
    case 'armor':
      return 3;
    case 'helm':
    case 'shield':
      return 2;
    default:
      return 0;
  }
}

// 剩余空孔数。
export function openSockets(item: ItemInstance): number {
  return (item.sockets ?? 0) - (item.socketed?.length ?? 0);
}

// 把一枚符文镶入第一个空孔 (成功返回 true)。底材无孔/孔满/未知符文则失败。
export function socketRune(item: ItemInstance, runeId: string): boolean {
  if (!runeById(runeId)) return false;
  if (openSockets(item) <= 0) return false;
  (item.socketed ??= []).push(runeId);
  return true;
}

// 当前已镶符文是否恰好构成某符文之语 (顺序+底材大类均匹配)。
export function matchRuneword(item: ItemInstance) {
  const socketed = item.socketed;
  if (!socketed || socketed.length === 0) return null;
  const cls = socketBaseClass(item);
  if (!cls) return null;
  for (const rw of RUNEWORDS) {
    if (!rw.bases.includes(cls)) continue;
    if (rw.runes.length !== socketed.length) continue;
    if (rw.runes.every((r, i) => r === socketed[i])) return rw;
  }
  return null;
}

// 把一件装备的镶嵌贡献 (符文本体 + 符文之语) 汇总进 bag。
export function accumulateSockets(bag: StatBag, item: ItemInstance): void {
  if (!item.socketed) return;
  for (const id of item.socketed) {
    const r = runeById(id);
    if (r) for (const m of r.mods) addStat(bag, m.stat as StatKey, m.value);
  }
  const rw = matchRuneword(item);
  if (rw) for (const m of rw.mods) addStat(bag, m.stat as StatKey, m.value);
}
