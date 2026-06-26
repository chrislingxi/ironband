// 任务状态机: 纯函数式管理任务进度, 不持有 DOM/副作用.
// 设计为简化版主线: 开局即接所有任务 (全部 'active'), 通过清场或击杀 boss 推进完成.
import type { Quest } from '@game/world/quests.ts';

// 任务的三种状态: 未接取 / 进行中 / 已完成.
export type QuestStatus = 'unstarted' | 'active' | 'complete';

// 任务进度表: 以任务 id 为键映射其当前状态.
export type QuestProgress = Record<string, QuestStatus>;

// boss 任务的固定 id, 与 QUESTS 中的安达莉尔条目对应.
const BOSS_QUEST_ID = 'andariel';

/** 初始化进度表: 简化设定为开局即接所有任务, 全部置 'active'. */
export function initQuests(quests: Quest[]): QuestProgress {
  const progress: QuestProgress = {};
  for (const q of quests) {
    progress[q.id] = 'active';
  }
  return progress;
}

/** 该任务是否处于进行中. */
export function isActive(p: QuestProgress, id: string): boolean {
  return p[id] === 'active';
}

/** 该任务是否已完成. */
export function isComplete(p: QuestProgress, id: string): boolean {
  return p[id] === 'complete';
}

/** 将指定任务置为已完成, 返回不可变的新进度表 (不修改入参). */
export function completeQuest(p: QuestProgress, id: string): QuestProgress {
  return { ...p, [id]: 'complete' };
}

/**
 * 区域清场回调: 若存在某个进行中任务的 targetArea 等于该区域, 则完成它.
 * 用于 den_of_evil / sisters_burial 这类靠清空区域达成的任务.
 * @returns completed 为被完成任务的 id, 若无则为 null.
 */
export function onAreaCleared(
  areaId: string,
  p: QuestProgress,
  quests: Quest[],
): { completed: string | null } {
  for (const q of quests) {
    if (q.targetArea === areaId && isActive(p, q.id)) {
      // 注意: 本函数为查询语义, 完成动作由调用方用 completeQuest 落地.
      return { completed: q.id };
    }
  }
  return { completed: null };
}

/**
 * boss 击杀回调: 若安达莉尔任务进行中, 则将其标记为可完成.
 * @returns completed 为 boss 任务 id, 若该任务非进行中则为 null.
 */
export function onBossKilled(p: QuestProgress): { completed: string | null } {
  if (isActive(p, BOSS_QUEST_ID)) {
    return { completed: BOSS_QUEST_ID };
  }
  return { completed: null };
}

/** 进行中任务的数量. */
export function activeCount(p: QuestProgress): number {
  return Object.values(p).filter((s) => s === 'active').length;
}

/** 已完成任务的数量. */
export function completeCount(p: QuestProgress): number {
  return Object.values(p).filter((s) => s === 'complete').length;
}
