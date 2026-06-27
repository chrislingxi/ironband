// 存读档系统 — 把 Game 的可持久化状态序列化为纯数据 (SaveData),
// 落地到 IndexedDB, 或编码为可分享的导出码 (base64). 反向流程负责重建。
//
// 设计要点:
//  - 物品按 base.id 序列化, 反序列化时从 ITEM_BASES 查回 base 对象引用,
//    避免把整套基础表写进存档 (体积小且不随 base 数据漂移)。
//  - 重建出的物品需要新的 uid。运行期 makeNormalItem/generateItem 各自维护 uidSeq,
//    本模块无法读取其内部计数, 故自行维护一个模块内自增计数器 (绝不用 Date)。
//  - applySave 只用赋值的方式改写 Game 的公共字段, 再调用 game.recompute()
//    与 game.loadArea() 让派生战斗数值与区域实例重新生成。

import type { Game } from '@game/sim/Game.ts';
import type { ItemInstance, RolledAffix, EquipSlot } from '@game/systems/items/types.ts';
import type { Character } from '@game/systems/stats/character.ts';
import type { SkillTreeState } from '@game/classes/skilltree.ts';
import type { QuestProgress } from '@game/systems/quests/state.ts';
import type { CharClass, Difficulty } from '@game/data/schema.ts';
import { ITEM_BASES } from '@game/data/items.ts';

// ---------------------------------------------------------------------------
// 版本与常量
// ---------------------------------------------------------------------------

/** 存档结构版本号。结构变动时递增, 供未来迁移判断之用。 */
export const SAVE_VERSION = 1;

const DB_NAME = 'ironband';
const STORE_NAME = 'save';
/** 默认槽位 (旧版单槽存档的 key, 保持向后兼容)。 */
const DEFAULT_SLOT = 'slot0';

/** 存档槽数量上限 (你与朋友各自建号, 留足余量)。 */
export const MAX_SLOTS = 6;

/** 槽位摘要 — 用于角色选择界面列出已有存档, 不必反序列化整份物品。 */
export interface SlotMeta {
  slotId: string;
  name: string;
  cls: CharClass;
  level: number;
  difficulty: Difficulty;
  areaId: string;
}

/** 从一份存档抽取槽位摘要 (旧档缺 name 时用职业+等级兜底)。 */
function metaOf(slotId: string, d: SaveData): SlotMeta {
  return {
    slotId,
    name: d.name ?? `${d.cls}-Lv${d.level}`,
    cls: d.cls,
    level: d.level,
    difficulty: d.difficulty,
    areaId: d.areaId,
  };
}

// 反序列化物品时分配的 uid。从一个高位起步, 尽量避开运行期生成器的取值区间,
// 降低与现存物品 uid 撞号的概率 (撞号本身也不影响逻辑, uid 仅作 UI 标识)。
let restoreUidSeq = 1_000_000;

// ---------------------------------------------------------------------------
// 物品序列化
// ---------------------------------------------------------------------------

/** 物品的可持久化形态: 只存 base.id, 其余按原样保留。 */
export interface ItemSave {
  baseId: string;
  rarity: ItemInstance['rarity'];
  ilvl: number;
  affixes: RolledAffix[];
  name: string;
  identified: boolean;
}

/** 运行期物品 → 存档物品。base 退化为其 id。 */
export function itemToSave(it: ItemInstance): ItemSave {
  return {
    baseId: it.base.id,
    rarity: it.rarity,
    ilvl: it.ilvl,
    // 词缀为纯数据, 浅拷贝出一份避免存档与运行期对象共享引用。
    affixes: it.affixes.map((a) => ({ ...a })),
    name: it.name,
    identified: it.identified,
  };
}

/**
 * 存档物品 → 运行期物品。从 ITEM_BASES 查回 base 引用并分配新 uid。
 * 若 baseId 在当前数据表中已不存在 (例如版本删表), 抛错由调用方决定如何处理。
 */
export function itemFromSave(s: ItemSave): ItemInstance {
  const base = ITEM_BASES.find((b) => b.id === s.baseId);
  if (!base) throw new Error(`存档物品基础不存在: ${s.baseId}`);
  return {
    uid: restoreUidSeq++,
    base,
    rarity: s.rarity,
    ilvl: s.ilvl,
    affixes: s.affixes.map((a) => ({ ...a })),
    name: s.name,
    identified: s.identified,
  };
}

// ---------------------------------------------------------------------------
// 存档总体结构
// ---------------------------------------------------------------------------

/** 雇佣兵的可持久化形态 (位置/朝向/冷却等运行期瞬态不存, 由系统重新初始化)。 */
export interface MercSave {
  level: number;
  hp: number;
  maxHp: number;
  dead: boolean;
}

/** 一份完整存档。所有字段均为纯数据 (可 JSON 化)。 */
export interface SaveData {
  version: number;
  /** 角色名 (多存档槽显示用; 旧档无此字段时按职业名兜底)。 */
  name: string;
  cls: CharClass;
  level: number;
  xp: number;
  base: Character['base'];
  equipment: Record<string, ItemSave>; // 槽位名 → 装备
  inventory: ItemSave[];
  skillTree: SkillTreeState;
  gold: number;
  difficulty: Difficulty;
  areaId: string;
  questProgress: QuestProgress;
  bonusSkillPoints: number;
  mercUnlocked: boolean;
  act1Complete: boolean;
  merc: MercSave | null;
}

// ---------------------------------------------------------------------------
// Game ↔ SaveData
// ---------------------------------------------------------------------------

/** 从一个 Game 实例抽取可持久化状态。只读 game 的公共字段, 不修改它。 */
export function serializeGame(game: Game, name?: string): SaveData {
  const ch = game.character;

  // 装备: 逐槽位转存档物品。
  const equipment: Record<string, ItemSave> = {};
  for (const slot of Object.keys(ch.equipment) as EquipSlot[]) {
    const it = ch.equipment[slot];
    if (it) equipment[slot] = itemToSave(it);
  }

  return {
    version: SAVE_VERSION,
    name: name ?? `${ch.cls}-Lv${ch.level}`,
    cls: ch.cls,
    level: ch.level,
    xp: ch.xp,
    // 基础属性浅拷贝, 与运行期对象解耦。
    base: { ...ch.base },
    equipment,
    inventory: game.inventory.map(itemToSave),
    skillTree: { ...game.skillTree },
    gold: game.goldTotal,
    difficulty: game.difficulty,
    areaId: game.currentArea.id,
    questProgress: { ...game.questProgress },
    bonusSkillPoints: game.bonusSkillPoints,
    mercUnlocked: game.mercUnlocked,
    act1Complete: game.act1Complete,
    merc: game.merc
      ? { level: game.merc.level, hp: game.merc.hp, maxHp: game.merc.maxHp, dead: game.merc.dead }
      : null,
  };
}

/**
 * 把一份存档应用到既有 Game 实例上 (就地改写, 复用 game 的 player/AI 等运行期对象)。
 * 重建顺序: 角色基础 → 装备 → 背包 → 技能/金币/任务/雇佣兵, 最后 recompute + loadArea。
 */
export function applySave(game: Game, data: SaveData): void {
  const ch = game.character;

  // --- 角色基础属性 (按字段赋值, 保持 character 对象同一引用) ---
  ch.cls = data.cls as Character['cls'];
  ch.level = data.level;
  ch.xp = data.xp;
  ch.base = { ...data.base };

  // --- 装备 ---
  const equipment: Character['equipment'] = {};
  for (const slot of Object.keys(data.equipment) as EquipSlot[]) {
    const s = data.equipment[slot];
    if (s) equipment[slot] = itemFromSave(s);
  }
  ch.equipment = equipment;

  // --- 背包 ---
  game.inventory = data.inventory.map(itemFromSave);

  // --- 技能树 / 金币 / 难度 ---
  game.skillTree = { ...data.skillTree };
  game.goldTotal = data.gold;
  game.difficulty = data.difficulty;

  // --- 任务与奖励标记 ---
  game.questProgress = { ...data.questProgress };
  game.bonusSkillPoints = data.bonusSkillPoints;
  game.mercUnlocked = data.mercUnlocked;
  game.act1Complete = data.act1Complete;

  // --- 雇佣兵: 重建最小状态, 位置等瞬态交由 loadArea 归位 ---
  if (data.merc) {
    game.merc = {
      pos: { x: 0, y: 0 },
      facing: 0,
      hp: data.merc.hp,
      maxHp: data.merc.maxHp,
      level: data.merc.level,
      attackCd: 0,
      attackInterval: 1.1,
      speed: 4,
      range: 9,
      dead: data.merc.dead,
    };
  } else {
    game.merc = undefined;
  }

  // --- 派生数值与区域重建 ---
  game.recompute(); // 由角色+装备重算玩家战斗数值
  game.loadArea(data.areaId); // 重载存档时所在区域 (会按难度刷怪)
}

// ---------------------------------------------------------------------------
// IndexedDB 封装 (Promise 化)
// ---------------------------------------------------------------------------

// 打开 (或首次创建) 数据库, 确保 object store 存在。
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 在一个事务里跑一段 store 操作, 并把请求结果通过 Promise 透出。
function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = fn(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** 写入 (覆盖) 指定槽位存档 (默认 slot0)。 */
export function saveToDB(data: SaveData, slotId: string = DEFAULT_SLOT): Promise<void> {
  return withStore<IDBValidKey>('readwrite', (store) => store.put(data, slotId)).then(() => undefined);
}

/** 读取指定槽位存档 (默认 slot0), 不存在时返回 null。 */
export function loadFromDB(slotId: string = DEFAULT_SLOT): Promise<SaveData | null> {
  return withStore<SaveData | undefined>('readonly', (store) => store.get(slotId)).then(
    (v) => v ?? null,
  );
}

/** 指定槽位 (默认 slot0) 是否已有存档。 */
export function hasSave(slotId: string = DEFAULT_SLOT): Promise<boolean> {
  return withStore<number>('readonly', (store) => store.count(slotId)).then((n) => n > 0);
}

/** 删除指定槽位存档。 */
export function deleteSlot(slotId: string): Promise<void> {
  return withStore<undefined>('readwrite', (store) => store.delete(slotId)).then(() => undefined);
}

/** 列出所有已有存档槽的摘要 (按 slotId 升序), 供角色选择界面渲染。 */
export function listSlots(): Promise<SlotMeta[]> {
  return openDB().then(
    (db) =>
      new Promise<SlotMeta[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const keysReq = store.getAllKeys();
        const valsReq = store.getAll();
        tx.oncomplete = () => {
          db.close();
          const keys = keysReq.result as IDBValidKey[];
          const vals = valsReq.result as SaveData[];
          const metas = keys
            .map((k, i) => metaOf(String(k), vals[i]))
            .sort((a, b) => a.slotId.localeCompare(b.slotId));
          resolve(metas);
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** 分配下一个空闲槽位 id (slot0..slotN); 满则返回 null。 */
export function nextFreeSlot(used: SlotMeta[]): string | null {
  const taken = new Set(used.map((m) => m.slotId));
  for (let i = 0; i < MAX_SLOTS; i++) {
    const id = `slot${i}`;
    if (!taken.has(id)) return id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 导出码 (base64)
// ---------------------------------------------------------------------------

/**
 * 编码为可分享/可粘贴的存档码。
 * 流程: JSON → encodeURIComponent (把中文等多字节字符转为 %XX 的纯 ASCII) → btoa。
 * 这样 btoa 只面对 Latin-1 字符, 不会因中文角色名/物品名抛 InvalidCharacterError。
 */
export function exportCode(data: SaveData): string {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

/** 解析存档码, 还原为 SaveData。与 exportCode 严格互逆。 */
export function importCode(s: string): SaveData {
  return JSON.parse(decodeURIComponent(atob(s.trim()))) as SaveData;
}
