// 存读档系统对外入口 (barrel)。集成方统一从 @game/systems/save/index.ts 引入。
export type { ItemSave, MercSave, SaveData } from './save.ts';
export {
  SAVE_VERSION,
  itemToSave,
  itemFromSave,
  serializeGame,
  applySave,
  saveToDB,
  loadFromDB,
  hasSave,
  exportCode,
  importCode,
} from './save.ts';
