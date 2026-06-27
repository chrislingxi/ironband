// 存读档系统对外入口 (barrel)。集成方统一从 @game/systems/save/index.ts 引入。
export type { ItemSave, MercSave, SaveData, SlotMeta } from './save.ts';
export {
  SAVE_VERSION,
  MAX_SLOTS,
  itemToSave,
  itemFromSave,
  serializeGame,
  applySave,
  saveToDB,
  loadFromDB,
  hasSave,
  deleteSlot,
  listSlots,
  nextFreeSlot,
  exportCode,
  importCode,
} from './save.ts';
