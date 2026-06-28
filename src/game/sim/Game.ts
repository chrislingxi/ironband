import type { Entity, Corpse } from '@game/entities/entity.ts';
import { makePlayer, makeMonster } from '@game/entities/factory.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { resolveAttack, rollDamage, attackInterval } from '@game/systems/combat/index.ts';
import { updateMonsterAI, type AIContext } from '@game/systems/ai/behaviors.ts';
import { CASTABLE_SKILLS, defaultLoadout, castableById, makeCharacterFor, type ClassSkillKey } from '@game/classes/profiles.ts';
import { BASIC_ATTACK, BASIC_ATTACK_BY_CLASS } from '@game/classes/exec.ts';
import { generateItem, socketRune, type ItemInstance, type EquipSlot } from '@game/systems/items/index.ts';
import { RUNES, runeById } from '@game/data/runes.ts';
import { deriveCombat, type Character } from '@game/systems/stats/character.ts';
import { createMissile, updateMissiles, type Missile } from '@game/systems/missiles/index.ts';
import { rollEliteAffixes, applyElite } from '@game/systems/elites/index.ts';
import { QUESTS, type QuestReward } from '@game/world/quests.ts';
import { initQuests, completeQuest, onAreaCleared, isActive, type QuestProgress } from '@game/systems/quests/state.ts';
import { MONSTERS } from '@game/data/monsters.ts';
import { MONSTERS_EXT } from '@game/data/monsters2.ts';

// 怪物 defId → 中文名 (死因显示用); Boss 名单独补。
const MON_NAME: Record<string, string> = {};
for (const m of [...Object.values(MONSTERS), ...Object.values(MONSTERS_EXT)]) MON_NAME[m.id] = m.name;
const BOSS_NAME: Record<string, string> = { andariel: '安达莉尔', duriel: '督瑞尔', mephisto: '墨菲斯托', diablo: '迪亚波罗', baal: '巴尔' };
function killerName(e: Entity): string {
  const base = BOSS_NAME[e.defId] ?? MON_NAME[e.defId] ?? '敌人';
  return e.elite?.name ? `${e.elite.name}·${base}` : base;
}
import { generateShopStock, buyPrice, sellPrice, gambleCost, gambleItem, identifyCost } from '@game/systems/town/economy.ts';
import { makeMerc, updateMerc, hireCost, reviveCost, type Merc } from '@game/systems/merc/merc.ts';
import { discover, type WaypointState } from '@game/systems/waypoint/waypoint.ts';
import { AREAS } from '@game/world/act1.ts';
import type { CharClass, DamageType } from '@game/data/schema.ts';
import { buildArea, type AreaInstance } from '@game/world/zone.ts';
import { playerResistPenalty, DIFFICULTIES } from '@game/systems/difficulty.ts';

// 难度中文标签 (通关解锁提示用)。
const DIFF_LABEL: Record<Difficulty, string> = { normal: '普通', nightmare: '噩梦', hell: '地狱' };

// 各职业起手属性 (洗点时重置到此)。与 character/profiles 的构造保持一致。
const STARTING_ATTRS: Record<CharClass, { str: number; dex: number; vit: number; energy: number }> = {
  barbarian: { str: 30, dex: 20, vit: 25, energy: 10 },
  amazon: { str: 20, dex: 25, vit: 20, energy: 15 },
  sorceress: { str: 10, dex: 15, vit: 10, energy: 35 },
};

// Boss 区域 → 该区独占的 Boss defId (进区只刷该 Boss)。
const BOSS_AREAS: Record<string, string> = {
  andariel_lair: 'andariel',
  tal_rasha_tomb: 'duriel',
  durance_of_hate: 'mephisto',
  chaos_sanctuary: 'diablo',
  worldstone_keep: 'baal',
};

// 最终幕的通关任务 id: 完成它解锁下一难度 (五幕已齐, 终为巴尔)。
const FINAL_QUEST = 'baal';
// 所有 Boss defId (掉落/精英判定/区域独占)。
const BOSS_IDS = new Set(['andariel', 'duriel', 'mephisto', 'diablo', 'baal']);
import { CLASS_SKILLS } from '@game/classes/registry.ts';
import { canInvest, invest, totalPointsSpent, pointsIn, synergyBonus, passiveBonuses, type SkillTreeState } from '@game/classes/skilltree.ts';
import type { Difficulty } from '@game/data/schema.ts';
import { dist, normalize, type Vec2 } from '@engine/math/vec.ts';
import { mulberry32, randInt, type RNG } from '@engine/math/rng.ts';

// 取一次伤害里占比最大的元素类型 (供飘字按元素配色)。
function dominantDamageType(byType: Partial<Record<DamageType, number>>): DamageType | undefined {
  let best: DamageType | undefined;
  let max = -1;
  for (const k of Object.keys(byType) as DamageType[]) {
    const v = byType[k] ?? 0;
    if (v > max) { max = v; best = k; }
  }
  return best;
}

export interface CombatEvent {
  pos: Vec2;
  amount: number;
  killed: boolean;
  toPlayer: boolean;
  crit?: boolean; // 暴击 (双倍物理), 渲染层显示更大/特殊色
  miss?: boolean; // 未命中 (AR 不足), 渲染层显示灰色 "Miss"
  immune?: boolean; // 免疫 (抗性≥100, 伤害归零), 显示 "免疫"
  dmgType?: DamageType; // 主要伤害类型, 飘字按元素配色
  heal?: number; // 回血量 (吸血/药水/自然), 显示绿色 +N
  xp?: number; // 击杀经验, 显示绿色 +N XP
}
export interface GoldDrop {
  id: number;
  pos: Vec2;
  amount: number;
}
export interface GroundItem {
  id: number;
  pos: Vec2;
  item: ItemInstance;
}
export interface Swing {
  pos: Vec2;
  facing: number;
  ageMs: number;
  kind: 'basic' | 'skill';
}
export interface PlayerInput {
  move: Vec2; // 世界格子方向 (已归一化), 长度=强度
}

// 纯逻辑战斗沙盒. 渲染层只读状态, 不反向依赖.
export class Game {
  player: Entity;
  monsters: Entity[] = [];
  corpses: Corpse[] = [];
  gold: GoldDrop[] = [];
  groundItems: GroundItem[] = []; // 地面掉落
  inventory: ItemInstance[] = []; // 背包 (单格)
  invCap = 32;
  stash: ItemInstance[] = []; // 共享仓库 (营地存取, 随角色存档)
  stashCap = 48;
  swings: Swing[] = []; // 挥砍弧光 (打击感)
  events: CombatEvent[] = []; // 每帧渲染后清空
  castFx: { pos: Vec2; radius: number; color: number }[] = []; // 技能落点冲击环 (渲染后清空)
  notices: string[] = []; // UI 提示(升级等), 渲染后清空
  goldTotal = 0;
  timeMs = 0;
  difficulty: Difficulty = 'normal';
  currentArea!: AreaInstance; // 当前区域 (构造时 loadArea 注入)
  private travelCd = 0; // 进入区域后短暂禁用出口, 防瞬间回弹
  state: 'playing' | 'dead' | 'cleared' = 'playing';
  skillCd = [0, 0, 0, 0]; // 四技能键冷却(秒)
  assignedSkills: string[] = []; // 4 个技能槽当前绑定的技能 id (构造时按职业默认装载)
  shoutUntilMs = 0; // 呐喊防御提升结束时间(ms)
  dodgeUntilMs = 0; // 翻滚无敌帧结束时间(ms)
  private rng: RNG;
  private nextGoldId = 1;

  character: Character;
  skillTree: SkillTreeState = {}; // 已投技能点 (skillId→点数)
  missiles: Missile[] = []; // 投射物(箭/法术)
  questProgress: QuestProgress = initQuests(QUESTS); // 任务状态
  playerKilledBy = ''; // 死因(被谁击杀), 阵亡横幅显示

  // 当前进行中任务的一行目标 (HUD 常驻显示, 解决"不知道下一步干嘛")
  get currentObjective(): string {
    const q = QUESTS.find((qq) => isActive(this.questProgress, qq.id));
    return q ? q.objective : '';
  }
  bonusSkillPoints = 0; // 任务奖励的额外技能点
  statPoints = 0; // 未分配的属性点 (每级+5, 手动加点)
  mercUnlocked = false; // 任务奖励: 雇佣兵解锁(Phase D)
  act1Complete = false;
  act2Complete = false;
  act3Complete = false;
  act4Complete = false;
  act5Complete = false;
  unlockedDifficulty: Difficulty = 'normal'; // 已解锁的最高难度 (通关解锁下一难度)
  shopStock: ItemInstance[] = []; // 商店库存
  merc?: Merc; // 雇佣兵(罗格弓手)
  discoveredWaypoints: WaypointState = new Set(); // 已发现航点
  // 续航 (D2 核心): 治疗药水 + 装备吸血 + 微量回血。无此三者 Boss 战不可持续。
  potions = 4; // 当前治疗药水数
  potionCap = 8; // 携带上限 (营地补满)
  autoQuaff = true; // 低血自动饮 (移动端 QoL); 可在设置关闭
  private potionCd = 0; // 药水冷却 (秒)
  private lifeLeechPct = 0; // 装备吸血% (recompute 汇总)
  runeBag: Record<string, number> = {}; // 符文背包 (runeId → 数量); 镶孔消耗
  questBonuses: Partial<Record<'maxhp' | 'res_all' | 'str' | 'dex' | 'vit' | 'energy', number>> = {}; // 任务永久增益
  private chillUntilMs = 0; // 被寒冷附魔精英命中后的减速截止 (玩家移速×0.5)
  private bagFullWarned = false; // 背包满提示节流 (有空位时重置)
  get isChilled(): boolean { return this.timeMs < this.chillUntilMs; } // 玩家是否处于减速

  constructor(seed = 1234, cls: CharClass = 'barbarian') {
    this.rng = mulberry32(seed);
    this.character = makeCharacterFor(cls);
    this.assignedSkills = defaultLoadout(cls); // 4 槽默认装载该职业起手技能
    this.player = makePlayer();
    this.recompute(true); // 由角色+装备派生玩家战斗数值
    this.loadArea('rogue_encampment'); // 从罗格营地起步
  }

  // 取某技能槽当前绑定的技能行为 (空槽返回 undefined; 槽0缺省普通攻击)。
  skillKey(slot: number): ClassSkillKey | undefined {
    const cls = this.character.cls as CharClass;
    // 槽0=普通攻击, 永远按职业解析 (法师=魔法光弹, 与自动攻击一致); 不走 castable 否则会落到通用近战。
    if (slot === 0) return BASIC_ATTACK_BY_CLASS[cls] ?? BASIC_ATTACK;
    const id = this.assignedSkills[slot];
    const key = castableById(cls, id);
    if (key) return key;
    return undefined;
  }

  // 某技能是否可装备到技能键: 普通攻击专属槽0; 其余主动技需在其技能树投过点 (学过才能上)。
  canAssignSkill(id: string): boolean {
    if (id === BASIC_ATTACK.id) return false; // 普通攻击固定在槽0, 不参与指派
    const cls = this.character.cls as CharClass;
    const key = castableById(cls, id);
    if (!key) return false;
    const treeId = key.treeSkillId ?? key.id;
    return pointsIn(treeId, this.skillTree) > 0;
  }

  // 把技能 id 绑定到某槽 (仅 1-3; 槽0锁定普通攻击)。技能须已学。
  assignSkill(slot: number, id: string): boolean {
    if (slot < 1 || slot > 3 || !this.canAssignSkill(id)) return false;
    // 同一技能不能占两个槽: 若已在别处, 先清掉
    for (let s = 1; s <= 3; s++) if (this.assignedSkills[s] === id) this.assignedSkills[s] = '';
    this.assignedSkills[slot] = id;
    this.skillCd[slot] = 0;
    return true;
  }

  // 清空某技能槽 (1-3)。
  clearSkillSlot(slot: number): boolean {
    if (slot < 1 || slot > 3) return false;
    this.assignedSkills[slot] = '';
    return true;
  }

  // 该职业可装备技能池 (供 UI 列举)。
  castablePool(): ClassSkillKey[] {
    return CASTABLE_SKILLS[this.character.cls as CharClass];
  }

  // 加载一个区域: 实例化→清场→按出生点刷怪→玩家置于中心
  loadArea(id: string): void {
    this.currentArea = buildArea(id, this.rng, this.difficulty);
    discover(this.discoveredWaypoints, id, AREAS); // 发现航点
    this.monsters = [];
    this.corpses = [];
    this.gold = [];
    this.groundItems = [];
    this.swings = [];
    this.missiles = [];
    const bossDefId = BOSS_AREAS[this.currentArea.id];
    if (bossDefId) {
      // Boss 区: 只放该幕 Boss
      this.spawnMonster(bossDefId, this.currentArea.size[0] / 2, this.currentArea.size[1] / 2 - 6);
    } else {
      for (const sp of this.currentArea.monsterSpawns) this.spawnMonster(sp.defId, sp.x, sp.y);
    }
    // 精英怪群: 把若干只提升为带词缀的精英队长, 并在其周围生成同类随从(minion pack)。
    // 难度越高: 队长越多、词缀越多 (D2 地狱遍地双词缀精英)。
    if (!this.currentArea.isTown && !bossDefId && this.monsters.length > 3) {
      const diffTier = this.difficulty === 'hell' ? 2 : this.difficulty === 'nightmare' ? 1 : 0;
      const nElite = 1 + (this.rng() < 0.5 ? 1 : 0) + diffTier; // 普通1-2 / 噩梦2-3 / 地狱3-4
      const minAffix = 1 + diffTier; // 地狱起步3词缀
      const maxAffix = 2 + diffTier;
      for (let i = 0; i < nElite; i++) {
        const cap = this.monsters[randInt(this.rng, 0, this.monsters.length - 1)];
        if (cap.elite) continue;
        const meta = applyElite(cap, rollEliteAffixes(this.rng, randInt(this.rng, minAffix, maxAffix)));
        cap.elite = meta;
        cap.size = Math.round(cap.size * 1.3);
        // minion pack: 队长周围生成 2-4 只同类随从 (吃队长光环)
        const nMinion = randInt(this.rng, 2, 4);
        for (let k = 0; k < nMinion; k++) {
          const ang = (k / nMinion) * Math.PI * 2;
          this.spawnMonster(cap.defId, cap.pos.x + Math.cos(ang) * 1.5, cap.pos.y + Math.sin(ang) * 1.5);
        }
      }
    }
    this.player.pos = { x: this.currentArea.size[0] / 2, y: this.currentArea.size[1] / 2 };
    this.player.combat.stunUntilMs = 0;
    this.state = this.currentArea.isTown || this.monsters.length === 0 ? 'cleared' : 'playing';
    this.travelCd = 1.0;
    if (this.currentArea.isTown) { this.refreshShop(); this.potions = this.potionCap; } // 进城刷新商店 + 补满药水
    if (this.merc) this.merc.pos = { x: this.player.pos.x - 1, y: this.player.pos.y - 1 }; // 雇佣兵随主归队
    // 入区引导: 一条提示同时给出地名与目标 (击杀刷装 / 走蓝色出口 / Boss 锁门)
    if (bossDefId) this.notices.push(`进入 ${this.currentArea.name} · ⚔ 击败 Boss 方可离开!`);
    else if (!this.currentArea.isTown) this.notices.push(`进入 ${this.currentArea.name} · 走到蓝色发光出口前往下一区`);
    else this.notices.push(`进入 ${this.currentArea.name}`);
  }

  // 由 character(基础属性+等级+装备) 重算玩家战斗数值. initial=true 时回满血.
  recompute(initial = false): void {
    const passive = passiveBonuses(this.skillTree, CLASS_SKILLS[this.character.cls]);
    const d = deriveCombat(this.character, passive, this.questBonuses);
    const p = this.player;
    const ratio = !initial && p.combat.maxHp > 0 ? p.combat.hp / p.combat.maxHp : 1;
    p.combat.maxHp = d.maxHp;
    p.combat.hp = initial ? d.maxHp : Math.min(d.maxHp, Math.max(1, Math.round(d.maxHp * ratio)));
    p.combat.attackRating = d.attackRating;
    p.combat.defense = d.defense;
    // 难度抗性惩罚 (噩梦-40/地狱-100)
    const pen = playerResistPenalty(this.difficulty);
    p.combat.resist = {
      physical: d.resist.physical,
      fire: Math.max(-100, d.resist.fire + pen),
      cold: Math.max(-100, d.resist.cold + pen),
      lightning: Math.max(-100, d.resist.lightning + pen),
      poison: Math.max(-100, d.resist.poison + pen),
      magic: d.resist.magic,
    };
    p.combat.level = this.character.level;
    p.damage = d.damage;
    this.lifeLeechPct = d.lifeleech;
    p.combat.fhr = d.fhr; // 受身恢复%: 喂入战斗数值, resolveAttack 据此走突破点缩短硬直
    // 攻速: 武器基础挥击间隔 (剑快斧慢; 徒手 0.55) 经装备 IAS% 走突破点加速。
    const baseSpeed = this.character.equipment.weapon?.base.attackSpeed ?? 0.55;
    p.attackInterval = attackInterval(baseSpeed, d.ias);
  }

  // 装备需求是否满足 (等级/力量/敏捷)。未鉴定不可穿 (D2: 先鉴定)。
  canEquip(it: ItemInstance): boolean {
    if (!it.identified) return false;
    const d = deriveCombat(this.character);
    if (this.character.level < it.base.reqLevel) return false;
    if (it.base.reqStr && d.attrs.str < it.base.reqStr) return false;
    if (it.base.reqDex && d.attrs.dex < it.base.reqDex) return false;
    return true;
  }

  // 装备背包中第 index 件 (旧装备退回背包), 重算战力
  equip(index: number): boolean {
    const it = this.inventory[index];
    if (!it) return false;
    if (!this.canEquip(it)) {
      this.notices.push(it.identified ? '不满足装备需求 (等级/力量/敏捷)' : '需先鉴定才能装备');
      return false;
    }
    const slot = it.base.slot;
    const prev = this.character.equipment[slot];
    this.character.equipment[slot] = it;
    this.inventory.splice(index, 1);
    if (prev) this.inventory.push(prev);
    this.recompute();
    return true;
  }

  // 一键穿戴: 每个槽位从背包挑可穿且评分最高的装备(优于当前则换上)。返回换装件数。
  equipBest(): number {
    const order: EquipSlot[] = ['weapon', 'helm', 'armor', 'shield', 'gloves', 'boots', 'belt', 'ring', 'amulet'];
    const score = (it: ItemInstance): number => {
      let s = 0;
      if (it.base.baseDamage) s += (it.base.baseDamage[0] + it.base.baseDamage[1]) / 2 * 3;
      if (it.base.baseDefense) s += (it.base.baseDefense[0] + it.base.baseDefense[1]) / 2;
      for (const a of it.affixes) s += a.value;
      s += { normal: 0, magic: 6, rare: 14, set: 18, unique: 22 }[it.rarity] ?? 0;
      return s;
    };
    let changed = 0;
    for (const slot of order) {
      // 该槽可穿候选 (背包内, 已鉴定且满足需求)
      let bestIdx = -1, bestScore = this.character.equipment[slot] ? score(this.character.equipment[slot]!) : -1;
      for (let i = 0; i < this.inventory.length; i++) {
        const it = this.inventory[i];
        if (it.base.slot !== slot || !this.canEquip(it)) continue;
        const sc = score(it);
        if (sc > bestScore) { bestScore = sc; bestIdx = i; }
      }
      if (bestIdx >= 0) { if (this.equip(bestIdx)) changed++; }
    }
    if (changed > 0) this.notices.push(`一键穿戴: 更换了 ${changed} 件装备`);
    else this.notices.push('没有更好的装备可换');
    return changed;
  }

  // 卸下某槽位装备到背包
  unequip(slot: EquipSlot): boolean {
    const it = this.character.equipment[slot];
    if (!it || this.inventory.length >= this.invCap) return false;
    delete this.character.equipment[slot];
    this.inventory.push(it);
    this.recompute();
    return true;
  }

  // 把符文背包里的某符文镶入一件装备 (背包索引或装备槽)。成功则消耗符文并重算。
  socketEquipped(slot: EquipSlot, runeId: string): boolean {
    const it = this.character.equipment[slot];
    if (!it || (this.runeBag[runeId] ?? 0) <= 0) return false;
    if (!socketRune(it, runeId)) return false;
    this.runeBag[runeId] -= 1;
    if (this.runeBag[runeId] <= 0) delete this.runeBag[runeId];
    const rune = runeById(runeId);
    this.recompute();
    this.notices.push(`镶入 ${rune?.name ?? '符文'}`);
    return true;
  }

  socketInventory(index: number, runeId: string): boolean {
    const it = this.inventory[index];
    if (!it || (this.runeBag[runeId] ?? 0) <= 0) return false;
    if (!socketRune(it, runeId)) return false;
    this.runeBag[runeId] -= 1;
    if (this.runeBag[runeId] <= 0) delete this.runeBag[runeId];
    this.notices.push(`镶入 ${runeById(runeId)?.name ?? '符文'}`);
    return true;
  }

  spawnMonster(defId: string, x: number, y: number): void {
    // 传入区域 monLevel: 怪物等级与经验按所在区域缩放 (深幕怪更高级、给更多经验)。
    this.monsters.push(makeMonster(defId, x, y, this.rng, this.difficulty, this.currentArea.monLevel));
  }

  // 分配一点属性 (力/敏/体/精); 有未分配点则 +1 并重算战力。
  allocateStat(attr: 'str' | 'dex' | 'vit' | 'energy'): boolean {
    if (this.statPoints <= 0) return false;
    this.character.base[attr] += 1;
    this.statPoints -= 1;
    this.recompute();
    return true;
  }

  // 洗点费用 (随等级递增)。
  respecCost(): number {
    return 200 + this.character.level * 80;
  }

  // 营地洗点: 花金把属性重置为起手值, 退回全部 (等级-1)*5 点供重分。
  respecStats(): boolean {
    const cost = this.respecCost();
    if (this.goldTotal < cost) return false;
    this.goldTotal -= cost;
    this.character.base = { ...STARTING_ATTRS[this.character.cls] };
    this.statPoints = (this.character.level - 1) * 5;
    this.recompute();
    this.notices.push('属性已重置, 重新分配你的天赋');
    return true;
  }

  // 可用技能点 = 等级-1 + 任务奖励 - 已投 (D2: 每级1点)
  skillPointsAvailable(): number {
    return Math.max(0, this.character.level - 1 + this.bonusSkillPoints - totalPointsSpent(this.skillTree));
  }

  // 发放一条结构化任务奖励。
  private grantQuestReward(r: QuestReward): void {
    switch (r.kind) {
      case 'gold': this.goldTotal += r.amount; this.notices.push(`任务奖励: +⦿${r.amount} 金币`); break;
      case 'skillPoint': this.bonusSkillPoints += r.amount; this.notices.push(`任务奖励: +${r.amount} 技能点`); break;
      case 'statPoint': this.statPoints += r.amount; this.notices.push(`任务奖励: +${r.amount} 属性点`); break;
      case 'item': {
        const it = generateItem(Math.max(1, this.currentArea.monLevel), this.rng, r.rarityBoost);
        if (this.inventory.length < this.invCap) this.inventory.push(it);
        else this.groundItems.push({ id: this.nextGoldId++, pos: { ...this.player.pos }, item: it });
        this.notices.push(`任务奖励: 获得 ${it.identified ? it.name : it.base.name}`);
        break;
      }
      case 'perma':
        this.questBonuses[r.stat] = (this.questBonuses[r.stat] ?? 0) + r.value;
        this.recompute();
        this.notices.push(`任务奖励: 永久 ${r.label}`);
        break;
    }
  }

  // 完成任务并发奖励
  private completeAndReward(questId: string): void {
    this.questProgress = completeQuest(this.questProgress, questId);
    const quest = QUESTS.find((q) => q.id === questId);
    if (quest) for (const g of quest.grants) this.grantQuestReward(g);
    if (questId === 'den_of_evil') { this.notices.push('任务完成: 净化邪恶巢穴'); }
    else if (questId === 'sisters_burial') { this.mercUnlocked = true; this.notices.push('任务完成: 姐妹的安息之地 (雇佣兵已解锁)'); }
    else if (questId === 'andariel') {
      this.act1Complete = true;
      this.notices.push('★ 第一幕通关! 安达莉尔已伏诛 ★');
      this.notices.push('沃里夫的车队已开往第二幕 · 鲁高因');
    }
    else if (questId === 'duriel') {
      this.act2Complete = true;
      this.notices.push('★ 第二幕通关! 痛苦之王督瑞尔已伏诛 ★');
      this.notices.push('循古墓传送门前往第三幕 · 卡纳镇');
    }
    else if (questId === 'mephisto') {
      this.act3Complete = true;
      this.notices.push('★ 第三幕通关! 憎恨之王梅菲斯特已伏诛 ★');
      this.notices.push('泰瑞尔的红门已通往第四幕 · 万神殿要塞');
    }
    else if (questId === 'diablo') {
      this.act4Complete = true;
      this.notices.push('★ 第四幕通关! 暗黑破坏神已伏诛 ★');
      this.notices.push('红门已通往第五幕 · 哈洛加斯');
    }
    else if (questId === 'baal') {
      this.act5Complete = true;
      this.notices.push('★★ 全剧终! 毁灭之王巴尔已伏诛 ★★');
    }
    else this.notices.push('任务完成');

    // 通关「当前最终幕」解锁下一难度 (D2 风格: 普通→噩梦→地狱)。加幕时只需上移 FINAL_QUEST。
    if (questId === FINAL_QUEST) {
      const order = DIFFICULTIES;
      const cur = order.indexOf(this.unlockedDifficulty);
      if (this.difficulty === this.unlockedDifficulty && cur < order.length - 1) {
        this.unlockedDifficulty = order[cur + 1];
        this.notices.push(`✦ 已解锁难度: ${DIFF_LABEL[this.unlockedDifficulty]} ✦`);
      }
    }
  }

  // ----- 营地服务 -----
  refreshShop(): void {
    this.shopStock = generateShopStock(Math.max(1, this.character.level), this.rng);
  }
  buyItem(uid: number): boolean {
    const idx = this.shopStock.findIndex((i) => i.uid === uid);
    if (idx < 0 || this.inventory.length >= this.invCap) return false;
    const price = buyPrice(this.shopStock[idx]);
    if (this.goldTotal < price) return false;
    this.goldTotal -= price;
    this.inventory.push(this.shopStock.splice(idx, 1)[0]);
    return true;
  }
  sellItem(uid: number): boolean {
    const idx = this.inventory.findIndex((i) => i.uid === uid);
    if (idx < 0) return false;
    this.goldTotal += sellPrice(this.inventory[idx]);
    this.inventory.splice(idx, 1);
    this.bagFullWarned = false;
    return true;
  }

  // 一键回收: 卖出全部普通(白)与魔法(蓝)装备, 保留稀有/套装/暗金。返回卖出件数。
  sellJunk(): number {
    let gold = 0, n = 0;
    this.inventory = this.inventory.filter((it) => {
      if (it.identified && (it.rarity === 'normal' || it.rarity === 'magic')) { gold += sellPrice(it); n++; return false; }
      return true;
    });
    if (n > 0) { this.goldTotal += gold; this.bagFullWarned = false; this.notices.push(`回收 ${n} 件普通/魔法装备 (+⦿${gold})`); }
    return n;
  }
  gamble(): boolean {
    const cost = gambleCost(this.character.level);
    if (this.goldTotal < cost || this.inventory.length >= this.invCap) return false;
    this.goldTotal -= cost;
    this.inventory.push(gambleItem(this.character.level, this.rng));
    return true;
  }
  identifyItem(uid: number): boolean {
    const it = this.inventory.find((i) => i.uid === uid);
    if (!it || it.identified || this.goldTotal < identifyCost()) return false;
    this.goldTotal -= identifyCost();
    it.identified = true;
    return true;
  }
  /** 背包 → 仓库 (仓库满则失败)。 */
  depositToStash(uid: number): boolean {
    const idx = this.inventory.findIndex((i) => i.uid === uid);
    if (idx < 0 || this.stash.length >= this.stashCap) return false;
    this.stash.push(this.inventory.splice(idx, 1)[0]);
    return true;
  }
  /** 仓库 → 背包 (背包满则失败)。 */
  withdrawFromStash(uid: number): boolean {
    const idx = this.stash.findIndex((i) => i.uid === uid);
    if (idx < 0 || this.inventory.length >= this.invCap) return false;
    this.inventory.push(this.stash.splice(idx, 1)[0]);
    return true;
  }
  hireMerc(): boolean {
    if (this.merc || this.goldTotal < hireCost()) return false;
    this.goldTotal -= hireCost();
    this.merc = makeMerc(this.character.level);
    this.merc.pos = { x: this.player.pos.x - 1, y: this.player.pos.y - 1 };
    return true;
  }
  reviveMerc(): boolean {
    if (!this.merc || !this.merc.dead || this.goldTotal < reviveCost(this.merc.level)) return false;
    this.goldTotal -= reviveCost(this.merc.level);
    this.merc.hp = this.merc.maxHp;
    this.merc.dead = false;
    this.merc.pos = { x: this.player.pos.x - 1, y: this.player.pos.y - 1 };
    return true;
  }

  // 给某技能投1点 (校验点数/等级/前置)
  investSkill(id: string): boolean {
    const defs = CLASS_SKILLS[this.character.cls];
    const def = defs.find((d) => d.id === id);
    if (!def || this.skillPointsAvailable() <= 0) return false;
    if (!canInvest(def, this.character.level, this.skillTree, defs)) return false;
    this.skillTree = invest(def, this.skillTree);
    return true;
  }

  /** 难度是否已解锁 (≤ 已解锁的最高难度)。 */
  isDifficultyUnlocked(d: Difficulty): boolean {
    return DIFFICULTIES.indexOf(d) <= DIFFICULTIES.indexOf(this.unlockedDifficulty);
  }

  // 切换难度: 重算(抗性惩罚)并重载当前区域。未解锁的难度拒绝切换。
  setDifficulty(d: Difficulty): void {
    if (d === this.difficulty || !this.isDifficultyUnlocked(d)) return;
    this.difficulty = d;
    this.recompute();
    this.loadArea(this.currentArea.id);
  }

  // 光环精英(战旗统帅)在场: 附近同群怪攻击增伤 (D2 光环威胁放大器)。
  private auraMultiplier(attacker: Entity): number {
    if (attacker.kind !== 'monster') return 1;
    for (const e of this.monsters) {
      if (e === attacker || e.dead) continue;
      if (!(e as { aura?: boolean }).aura) continue;
      if (dist(e.pos, attacker.pos) < 6) return 1.25;
    }
    return 1;
  }

  private attack = (attacker: Entity, defender: Entity, dmg: DamageInstance[]): void => {
    // 翻滚无敌帧: 玩家翻滚期间免疫近战 (原本只挡投射物, 不挡近战 → 此处补齐)。
    if (defender === this.player && this.timeMs < this.dodgeUntilMs) return;
    // 暴击/致命: 玩家攻击有几率双倍物理伤害 (基础5% + 亚马逊critical_strike每点3%)。
    let useDmg = dmg;
    let crit = false;
    // 光环增伤 (怪物受战旗统帅光环加成)
    const aura = this.auraMultiplier(attacker);
    if (aura !== 1) useDmg = useDmg.map((d) => ({ ...d, min: Math.round(d.min * aura), max: Math.round(d.max * aura) }));
    if (attacker === this.player && this.rng() < this.playerCritChance()) {
      crit = true;
      useDmg = dmg.map((d) => (d.type === 'physical' ? { ...d, min: d.min * 2, max: d.max * 2 } : d));
    }
    // 呐喊: 玩家受击时若呐喊生效, 临时把有效防御 ×1.5 (结算后还原, 不污染 combat.defense)。
    const shouted = defender === this.player && this.timeMs < this.shoutUntilMs;
    const baseDef = defender.combat.defense;
    if (shouted) defender.combat.defense = Math.round(baseDef * 1.5);
    const r = resolveAttack(attacker.combat, defender.combat, useDmg, this.rng, this.timeMs);
    if (shouted) defender.combat.defense = baseDef;
    if (!r.hit) {
      // 未命中: 推一条 miss 事件 (让 AR/命中系统对玩家可感)
      this.events.push({ pos: { x: defender.pos.x, y: defender.pos.y }, amount: 0, killed: false, toPlayer: defender.kind === 'player', miss: true });
      return;
    }
    defender.hitFlash = 1;
    // 寒冷附魔精英(霜噬之息)命中玩家 → 减速
    if (defender === this.player && (attacker as { onHitChill?: boolean }).onHitChill) {
      this.chillUntilMs = Math.max(this.chillUntilMs, this.timeMs + 1500);
    }
    const dmgType = dominantDamageType(r.damageByType);
    const immune = r.totalDamage === 0 && useDmg.length > 0;
    this.events.push({
      pos: { x: defender.pos.x, y: defender.pos.y },
      amount: r.totalDamage,
      killed: r.killed,
      toPlayer: defender.kind === 'player',
      crit,
      dmgType,
      immune,
    });
    // 击退 (重量感): 把怪推离攻击者一小段, 不致死时
    if (defender.kind === 'monster' && !r.killed) {
      const dx = defender.pos.x - attacker.pos.x;
      const dy = defender.pos.y - attacker.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      const kb = crit ? 0.55 : 0.3; // 击退增强, 暴击更猛 (重击连退感)
      defender.pos.x += (dx / d) * kb;
      defender.pos.y += (dy / d) * kb;
    }
    // 装备吸血: 玩家命中按造成伤害回血 (近战续航主力)。
    if (attacker === this.player && this.lifeLeechPct > 0 && !r.killed) {
      const heal = Math.round((r.totalDamage * this.lifeLeechPct) / 100);
      if (heal > 0) {
        const before = attacker.combat.hp;
        attacker.combat.hp = Math.min(attacker.combat.maxHp, attacker.combat.hp + heal);
        const gained = Math.round(attacker.combat.hp - before);
        if (gained > 0) this.events.push({ pos: { x: attacker.pos.x, y: attacker.pos.y }, amount: 0, killed: false, toPlayer: false, heal: gained });
      }
    }
    if (r.killed) {
      defender.dead = true;
      if (defender === this.player) this.playerKilledBy = killerName(attacker);
      if (attacker === this.player && defender.kind === 'monster') {
        this.grantXp(defender.xpReward);
        if (defender.xpReward > 0) this.events.push({ pos: { x: defender.pos.x, y: defender.pos.y }, amount: 0, killed: false, toPlayer: false, xp: defender.xpReward });
      }
    }
  };

  // 饮一瓶治疗药水: 回 40% 最大生命, 1s 冷却防连点。
  quaffPotion(): boolean {
    const p = this.player;
    if (this.potions <= 0 || this.potionCd > 0 || p.dead) return false;
    if (p.combat.hp >= p.combat.maxHp) return false;
    this.potions -= 1;
    this.potionCd = 1.0;
    p.combat.hp = Math.min(p.combat.maxHp, p.combat.hp + Math.round(p.combat.maxHp * 0.4));
    this.notices.push('💊 治疗药水');
    return true;
  }

  // 升级曲线 (随等级渐陡)
  xpForNext(level = this.character.level): number {
    return Math.floor(80 * Math.pow(level, 1.6));
  }

  // 累积经验并处理升级 (自动加点: 力2体2敏1, 升级回满血)
  grantXp(amount: number): void {
    const ch = this.character;
    ch.xp += amount;
    let leveled = false;
    while (ch.xp >= this.xpForNext(ch.level)) {
      ch.xp -= this.xpForNext(ch.level);
      ch.level++;
      this.statPoints += 5; // D2 标准: 每级 5 点自由分配 (手动加点)
      leveled = true;
    }
    if (leveled) {
      this.recompute();
      this.player.combat.hp = this.player.combat.maxHp;
      this.notices.push(`升级! Lv ${ch.level}`);
    }
  }

  private spawn = (defId: string, x: number, y: number): void => {
    this.spawnMonster(defId, x, y);
  };

  // 敌方远程: 从 from 朝玩家放飞射物
  private shoot = (from: Entity, dmg: DamageInstance[], kind: 'arrow' | 'fireball' | 'bolt', color: number): void => {
    const p = this.player;
    const dx = p.pos.x - from.pos.x, dy = p.pos.y - from.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    this.missiles.push(createMissile({
      pos: from.pos, dir: { x: dx / d, y: dy / d }, speed: kind === 'fireball' ? 8 : 12,
      dmg, kind, fromPlayer: false, range: 12, pierce: 0, radius: 0.4, color,
    }));
  };

  // 敌方定向投射 (Boss 毒环用)
  private shootDir = (from: Entity, dir: Vec2, dmg: DamageInstance[], kind: 'arrow' | 'fireball' | 'bolt', color: number): void => {
    const d = Math.hypot(dir.x, dir.y) || 1;
    this.missiles.push(createMissile({
      pos: from.pos, dir: { x: dir.x / d, y: dir.y / d }, speed: kind === 'fireball' ? 8 : 11,
      dmg, kind, fromPlayer: false, range: 11, pierce: 0, radius: 0.4, color,
    }));
  };

  update(dt: number, input: PlayerInput): void {
    this.timeMs += dt * 1000;
    const now = this.timeMs;
    const p = this.player;

    // ----- 玩家 -----
    p.attackCd = Math.max(0, p.attackCd - dt);
    this.travelCd = Math.max(0, this.travelCd - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    for (let i = 0; i < 4; i++) this.skillCd[i] = Math.max(0, this.skillCd[i] - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt * 4);
    // 续航: 微量自然回血 (0.5%/s) + 低于 35% 时自动饮药 (移动端 QoL)。
    if (!p.dead && p.combat.hp > 0 && p.combat.hp < p.combat.maxHp) {
      p.combat.hp = Math.min(p.combat.maxHp, p.combat.hp + p.combat.maxHp * 0.005 * dt);
    }
    if (this.autoQuaff && !p.dead && p.combat.hp < p.combat.maxHp * 0.45) this.quaffPotion();
    const stunned = now < p.combat.stunUntilMs;
    if (!p.dead && !stunned) {
      const mv = input.move;
      const mag = Math.hypot(mv.x, mv.y);
      const chillFactor = now < this.chillUntilMs ? 0.5 : 1; // 寒冷附魔精英命中后减速
      if (mag > 0.05) {
        const d = normalize(mv);
        p.pos.x += d.x * p.speed * chillFactor * dt * Math.min(1, mag);
        p.pos.y += d.y * p.speed * chillFactor * dt * Math.min(1, mag);
        p.facing = Math.atan2(d.y, d.x);
        p.moving = true;
      } else {
        p.moving = false;
      }
      // 自动普通攻击最近的怪 (法师=光弹远程, 近战=挥击近程); 技能仍需手点。
      if (p.attackCd <= 0) {
        const bk = BASIC_ATTACK_BY_CLASS[this.character.cls as CharClass] ?? BASIC_ATTACK;
        const ranged = bk.kind === 'projectile';
        const range = ranged ? 9 : p.attackRange + 0.5;
        const target = this.nearestMonster(p.pos, range);
        if (target) {
          p.facing = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x);
          if (ranged) {
            const dir = { x: Math.cos(p.facing), y: Math.sin(p.facing) };
            this.spawnMissile(dir, bk, this.skillDamage(bk));
          } else {
            this.attack(p, target, p.damage);
            this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'basic' });
          }
          p.attackCd = p.attackInterval;
        }
      }
    }

    // ----- 怪物 AI -----
    const ctx: AIContext = {
      player: p, entities: this.monsters, corpses: this.corpses,
      nowMs: now, dt, rng: this.rng, attack: this.attack, spawn: this.spawn, shoot: this.shoot, shootDir: this.shootDir,
    };
    for (const e of this.monsters) {
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      if (!p.dead) updateMonsterAI(e, ctx);
      else e.moving = false;
    }
    this.separate();

    // ----- 投射物 (玩家弹 vs 怪; 敌弹 vs 玩家) -----
    const playerM = this.missiles.filter((m) => m.fromPlayer);
    const enemyM = this.missiles.filter((m) => !m.fromPlayer);
    const sp = updateMissiles(playerM, dt, this.monsters, (m, t) => this.dealMissileDamage(t as Entity, m));
    const se = updateMissiles(enemyM, dt, p.dead ? [] : [p], (m, t) => this.dealMissileDamage(t as Entity, m));
    this.missiles = [...sp, ...se];

    // ----- 雇佣兵 (跟随 + 放箭; 邻近怪消耗其生命可阵亡) -----
    if (this.merc && !this.merc.dead && !p.dead) {
      updateMerc(this.merc, {
        playerPos: p.pos, monsters: this.monsters, dt, nowMs: now,
        shootArrow: (from, dir, dmg) => {
          const d = Math.hypot(dir.x, dir.y) || 1;
          this.missiles.push(createMissile({
            pos: from, dir: { x: dir.x / d, y: dir.y / d }, speed: 15, dmg, kind: 'arrow',
            fromPlayer: true, range: 14, pierce: 0, radius: 0.35, color: 0xc8b88a,
          }));
        },
      });
      let nearby = 0;
      for (const e of this.monsters) if (!e.dead && dist(e.pos, this.merc.pos) < e.radius + 0.9) nearby++;
      if (nearby > 0) {
        this.merc.hp -= nearby * dt * 5;
        if (this.merc.hp <= 0) { this.merc.hp = 0; this.merc.dead = true; this.notices.push('雇佣弓手倒下了 (营地可复活)'); }
      }
    }

    // ----- 死亡 → 尸体 + 掉金 -----
    for (const e of this.monsters) {
      if (e.dead) {
        // 火焰附魔精英: 死亡爆炸灼烧附近玩家
        if (e.onDeathExplode && !p.dead && dist(e.pos, p.pos) < 3) {
          const { total } = rollDamage([{ type: 'fire', min: 6, max: 14 }], p.combat.resist, this.rng);
          p.combat.hp = Math.max(0, p.combat.hp - total);
          p.hitFlash = 1;
          this.events.push({ pos: { ...p.pos }, amount: total, killed: p.combat.hp <= 0, toPlayer: true });
          if (p.combat.hp <= 0) { p.dead = true; this.playerKilledBy = `${killerName(e)}的死亡爆炸`; }
        }
        this.corpses.push({ pos: { ...e.pos }, defId: e.defId, color: e.color, size: e.size, ageMs: 0 });
        const isBoss = BOSS_IDS.has(e.defId);
        const isElite = !!e.elite || isBoss;
        // 治疗药水掉落: 精英/Boss 必掉, 杂怪 14%; 直接补入药水位 (上限封顶)。
        if (this.potions < this.potionCap && (isElite || this.rng() < 0.14)) {
          this.potions = Math.min(this.potionCap, this.potions + (isBoss ? 4 : isElite ? 2 : 1));
        }
        // 符文掉落: 杂怪 5% / 精英 30% / Boss 必掉 2 枚, 随机符文进符文背包。
        const runeDrops = isBoss ? 2 : isElite ? (this.rng() < 0.3 ? 1 : 0) : this.rng() < 0.05 ? 1 : 0;
        for (let k = 0; k < runeDrops; k++) {
          const r = RUNES[randInt(this.rng, 0, RUNES.length - 1)];
          this.runeBag[r.id] = (this.runeBag[r.id] ?? 0) + 1;
          this.notices.push(`✦ 获得符文: ${r.name}`); // 符文掉落是大事件, 明确提示
        }
        if (this.rng() < (isElite ? 1 : 0.6)) {
          this.gold.push({ id: this.nextGoldId++, pos: { ...e.pos }, amount: randInt(this.rng, isBoss ? 40 : isElite ? 8 : 1, isBoss ? 90 : isElite ? 24 : 6) });
        }
        // 物品掉落 (TreasureClass-lite): 精英必掉且更多, Boss 暴掉
        const drops = isBoss ? 4 : isElite ? 2 : this.rng() < 0.32 ? 1 : 0;
        // 暗金概率放大: Boss×10 / 精英×3 / 普通×1 ("刷Boss/精英出金"成立)
        const rarityBoost = isBoss ? 10 : isElite ? 3 : 1;
        for (let k = 0; k < drops; k++) {
          const off = () => (this.rng() - 0.5) * 0.9;
          this.groundItems.push({
            id: this.nextGoldId++,
            pos: { x: e.pos.x + off(), y: e.pos.y + off() },
            item: generateItem(e.combat.level + (isElite ? 3 : 0), this.rng, rarityBoost),
          });
        }
      }
    }
    this.monsters = this.monsters.filter((e) => !e.dead);

    // ----- 尸体老化 (供萨满复活的窗口期后消失) -----
    for (const c of this.corpses) c.ageMs += dt * 1000;
    this.corpses = this.corpses.filter((c) => c.ageMs < 12000);

    // ----- 挥砍弧光老化 -----
    for (const s of this.swings) s.ageMs += dt * 1000;
    this.swings = this.swings.filter((s) => s.ageMs < 220);

    // ----- 全屏自动拾金 (不再限距, 整图金币立即收取) -----
    for (const g of this.gold) { this.goldTotal += g.amount; g.amount = 0; }
    this.gold = this.gold.filter((g) => g.amount > 0);

    // 全屏自动拾取地面物品 (背包未满); 满了给一次提示 (防止"踩着不捡"困惑)
    if (!p.dead) {
      this.groundItems = this.groundItems.filter((gi) => {
        if (this.inventory.length < this.invCap) { this.inventory.push(gi.item); this.bagFullWarned = false; return false; }
        if (!this.bagFullWarned) { this.notices.push('⚠ 背包已满! 回营地出售或丢弃'); this.bagFullWarned = true; }
        return true;
      });
    }

    // ----- 状态机: 阵亡 / 清场 -----
    if (this.state === 'playing') {
      if (p.dead) this.state = 'dead';
      else if (this.monsters.length === 0) {
        this.state = 'cleared';
        const r = onAreaCleared(this.currentArea.id, this.questProgress, QUESTS);
        if (r.completed) this.completeAndReward(r.completed);
      }
    }

    // ----- 出口传送 -----
    // D2 风格: 区域间可自由走动, 不强制清场。仅 Boss 区需击败 Boss 方可离开,
    // 以保证 Boss 战不被绕过 (BOSS_AREAS 在场且 Boss 未死则锁出口)。
    const bossHere = !!BOSS_AREAS[this.currentArea.id] && this.monsters.length > 0;
    if (!p.dead && this.travelCd === 0 && !bossHere) {
      for (const ex of this.currentArea.exits) {
        if (dist(p.pos, ex.pos) < 1.6) { this.loadArea(ex.toId); break; }
      }
    }
  }

  // 阵亡重生: 按难度应用惩罚后重载
  respawn(): void {
    const p = this.player;
    p.dead = false;
    this.playerKilledBy = ''; // 清死因, 防下次阵亡显示上次的
    this.shoutUntilMs = 0; // 清除增益
    this.dodgeUntilMs = 0;

    switch (this.difficulty) {
      case 'normal': {
        // 普通: 区域入口复活满血 + 轻微金币惩罚 (避免无成本无脑送死磨 Boss)
        const goldLoss = Math.floor(this.goldTotal * 0.05);
        this.goldTotal = Math.max(0, this.goldTotal - goldLoss);
        p.combat.hp = p.combat.maxHp;
        this.loadArea(this.currentArea.id);
        this.notices.push(goldLoss > 0 ? `已复活 (普通: 失去 ${goldLoss} 金币)` : '已复活');
        break;
      }

      case 'nightmare': {
        // 噩梦: 扣10%金币, 50% HP, 重生于区域入口
        const goldLoss = Math.floor(this.goldTotal * 0.1);
        this.goldTotal = Math.max(0, this.goldTotal - goldLoss);
        this.loadArea(this.currentArea.id);
        p.combat.hp = Math.max(1, Math.floor(p.combat.maxHp * 0.5));
        if (goldLoss > 0) this.notices.push(`噩梦惩罚: 失去 ${goldLoss} 金币, HP 50%`);
        else this.notices.push('噩梦惩罚: HP 50%');
        break;
      }

      case 'hell': {
        // 地狱: 扣20%金币, 30% HP, 重生于罗格营地, 所有装备耐久-20
        const goldLoss = Math.floor(this.goldTotal * 0.2);
        this.goldTotal = Math.max(0, this.goldTotal - goldLoss);
        // 耐久度惩罚
        const slots = Object.values(this.character.equipment) as (import('@game/systems/items/types.ts').ItemInstance | undefined)[];
        for (const item of slots) {
          if (!item) continue;
          const maxDur = item.base.maxDurability ?? 0;
          if (maxDur > 0) {
            item.durability = Math.max(0, (item.durability ?? maxDur) - 20);
          }
        }
        this.loadArea('rogue_encampment');
        p.combat.hp = Math.max(1, Math.floor(p.combat.maxHp * 0.3));
        this.notices.push(`地狱惩罚: 失去 ${goldLoss} 金币, 装备耐久-20, 重生营地`);
        break;
      }
    }
  }

  /** 玩家暴击率: 基础 5% + 亚马逊 critical_strike 每点 3% (封顶 60%)。 */
  private playerCritChance(): number {
    const cs = pointsIn('critical_strike', this.skillTree);
    return Math.min(0.6, 0.05 + cs * 0.03);
  }

  /**
   * 技能威力系数: 把"在技能树投的点 + synergy"接进战斗 —— 修复"投点零作用"。
   * 系数 = (1 + 0.09·该技能投点) × (1 + synergy加成)。0 点时为 1(基础可用)。
   */
  private skillPower(key: ClassSkillKey): number {
    const treeId = key.treeSkillId ?? key.id;
    const lvl = pointsIn(treeId, this.skillTree);
    const defs = CLASS_SKILLS[this.character.cls];
    const def = defs.find((d) => d.id === treeId);
    const syn = def ? synergyBonus(def, this.skillTree, defs) : 0;
    return (1 + 0.09 * lvl) * (1 + syn);
  }

  // 使用技能键 (0/1/2/3). 按职业从 CLASS_KEYS 取行为, 泛化执行近战/投射/特殊.
  useSkill(slot: number): boolean {
    if (slot < 0 || slot > 3) return false;
    const p = this.player;
    if (p.dead || this.timeMs < p.combat.stunUntilMs || this.skillCd[slot] > 0) return false;
    const key = this.skillKey(slot);
    if (!key) return false; // 空槽
    const aim = this.nearestMonster(p.pos, 16);
    if (aim) p.facing = Math.atan2(aim.pos.y - p.pos.y, aim.pos.x - p.pos.x);
    const dmg = this.skillDamage(key);
    switch (key.kind) {
      case 'melee': this.execMelee(key, dmg); break;
      case 'arc': this.execArc(key, dmg); break;
      case 'aoe': this.execAoe(key, dmg); break;
      case 'projectile': this.execProjectiles(key, dmg, 1); break;
      case 'spread': this.execProjectiles(key, dmg, key.count ?? 3); break;
      case 'nova': this.execNova(key, dmg); break;
      case 'shout': this.execShout(key); break;
      case 'dodge': this.execDodge(key); break;
      case 'teleport': this.execTeleport(key); break;
    }
    this.skillCd[slot] = key.cooldown;
    return true;
  }

  private scaleDamage(mult: number, type?: DamageType): DamageInstance[] {
    return this.player.damage.map((d) => ({
      type: type ?? d.type, min: Math.max(1, Math.round(d.min * mult)), max: Math.max(1, Math.round(d.max * mult)),
    }));
  }

  // 技能伤害: 元素法术用技能自身基础伤害(随技能等级+synergy, 与武器解耦 = D2 法系);
  // 物理/武器技能用武器伤害×倍率×skillPower (近战吃武器/力量, 受装备驱动)。
  private skillDamage(key: ClassSkillKey): DamageInstance[] {
    const type = key.damageType ?? 'physical';
    const treeId = key.treeSkillId ?? key.id;
    const defs = CLASS_SKILLS[this.character.cls];
    const def = defs.find((d) => d.id === treeId);
    if (type !== 'physical' && def?.baseDamage) {
      const lvl = Math.max(1, pointsIn(treeId, this.skillTree));
      const syn = synergyBonus(def, this.skillTree, defs);
      const [mn, mx] = def.baseDamage(lvl);
      // 法术放大因子: 技能基础伤害量级远小于怪物HP经济, 统一放大以匹配 (M4 校验标定)。
      const K = 14;
      return [{ type, min: Math.max(1, Math.round(mn * (1 + syn) * K)), max: Math.max(1, Math.round(mx * (1 + syn) * K)) }];
    }
    return this.scaleDamage(key.damageMult * this.skillPower(key), type);
  }

  private inArc(e: Entity, facing: number, range: number, halfAngle: number): boolean {
    const dx = e.pos.x - this.player.pos.x, dy = e.pos.y - this.player.pos.y;
    if (Math.hypot(dx, dy) - e.radius > range) return false;
    let da = Math.atan2(dy, dx) - facing;
    da = Math.atan2(Math.sin(da), Math.cos(da)); // 归一到[-π,π]
    return Math.abs(da) <= halfAngle;
  }

  private execMelee(key: ClassSkillKey, dmg: DamageInstance[]): void {
    const p = this.player;
    const t = this.nearestMonster(p.pos, p.attackRange + 0.6);
    if (t) {
      this.attack(p, t, dmg);
      if (!t.dead) {
        const dx = t.pos.x - p.pos.x, dy = t.pos.y - p.pos.y, d = Math.hypot(dx, dy) || 1;
        t.pos.x += (dx / d) * 0.45; t.pos.y += (dy / d) * 0.45;
        if (key.stun) t.combat.stunUntilMs = Math.max(t.combat.stunUntilMs, this.timeMs + key.stun * 1000);
      }
    }
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
  }

  private execArc(key: ClassSkillKey, dmg: DamageInstance[]): void {
    const p = this.player;
    for (const e of this.monsters) if (!e.dead && this.inArc(e, p.facing, key.radius ?? 2.2, 1.2)) this.attack(p, e, dmg);
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
  }

  private execAoe(key: ClassSkillKey, dmg: DamageInstance[]): void {
    const p = this.player;
    const r = key.radius ?? 3.2;
    for (const e of this.monsters) {
      if (e.dead) continue;
      if (dist(e.pos, p.pos) - e.radius <= r) {
        this.attack(p, e, dmg);
        if (!e.dead && key.stun) e.combat.stunUntilMs = Math.max(e.combat.stunUntilMs, this.timeMs + key.stun * 1000);
      }
    }
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
    this.castFx.push({ pos: { ...p.pos }, radius: r, color: this.missileColor(key.damageType) }); // 落点冲击环
  }

  private missileSpeed(kind: NonNullable<ClassSkillKey['missileKind']>): number {
    switch (kind) {
      case 'arrow': return 15; case 'bolt': return 13; case 'iceball': return 11;
      case 'fireball': return 10; case 'nova': return 9; default: return 12;
    }
  }
  private missileColor(type?: DamageType): number {
    switch (type) {
      case 'fire': return 0xff7a3a; case 'cold': return 0x8fd6ff; case 'lightning': return 0xfff060;
      case 'poison': return 0x9be04a; case 'magic': return 0xd58cff; default: return 0xf0e0c0;
    }
  }

  private spawnMissile(dir: Vec2, key: ClassSkillKey, dmg: DamageInstance[]): void {
    const kind = key.missileKind ?? 'arrow';
    this.missiles.push(createMissile({
      pos: this.player.pos, dir, speed: this.missileSpeed(kind), dmg, kind, fromPlayer: true,
      range: 14, pierce: kind === 'bolt' ? 1 : 0,
      radius: kind === 'fireball' || kind === 'nova' ? 0.6 : 0.35, color: this.missileColor(key.damageType),
    }));
  }

  private execProjectiles(key: ClassSkillKey, dmg: DamageInstance[], count: number): void {
    const p = this.player;
    const spread = 0.22;
    for (let i = 0; i < count; i++) {
      const a = p.facing + (count > 1 ? (i - (count - 1) / 2) * spread : 0);
      this.spawnMissile({ x: Math.cos(a), y: Math.sin(a) }, key, dmg);
    }
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
  }

  private execNova(key: ClassSkillKey, dmg: DamageInstance[]): void {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawnMissile({ x: Math.cos(a), y: Math.sin(a) }, key, dmg);
    }
    this.swings.push({ pos: { ...this.player.pos }, facing: this.player.facing, ageMs: 0, kind: 'skill' });
    this.castFx.push({ pos: { ...this.player.pos }, radius: key.radius ?? 4, color: this.missileColor(key.damageType) }); // 新星冲击环
  }

  // 呐喊: 临时大幅提升防御
  private execShout(key: ClassSkillKey): void {
    const duration = (key.duration ?? 5) * 1000;
    this.shoutUntilMs = this.timeMs + duration;
    // 仅置时间标记; 防御 ×1.5 在受击结算(attack)里按 shoutUntilMs 临时应用, 不再永久改 combat.defense
    // (原实现直接乘 combat.defense 会被 recompute 清掉、且可反复呐喊叠乘成近无敌 exploit)。
    this.notices.push('呐喊! 防御大幅提升 5秒');
  }

  // 翻滚: 朝面向方向冲刺并短暂无敌
  private execDodge(key: ClassSkillKey): void {
    const duration = (key.duration ?? 0.4) * 1000;
    this.dodgeUntilMs = this.timeMs + duration;
    const dist2 = 2.5;
    this.player.pos.x += Math.cos(this.player.facing) * dist2;
    this.player.pos.y += Math.sin(this.player.facing) * dist2;
    this.player.combat.stunUntilMs = 0; // 翻滚取消硬直
    this.swings.push({ pos: { ...this.player.pos }, facing: this.player.facing, ageMs: 0, kind: 'skill' });
  }

  // 传送: 闪现至朝向方向一定距离
  private execTeleport(key: ClassSkillKey): void {
    const range = key.radius ?? 3;
    const newX = this.player.pos.x + Math.cos(this.player.facing) * range;
    const newY = this.player.pos.y + Math.sin(this.player.facing) * range;
    // 边界约束
    const area = this.currentArea;
    this.player.pos.x = Math.max(1, Math.min(area.size[0] - 1, newX));
    this.player.pos.y = Math.max(1, Math.min(area.size[1] - 1, newY));
    this.player.combat.stunUntilMs = 0;
    this.swings.push({ pos: { ...this.player.pos }, facing: this.player.facing, ageMs: 0, kind: 'skill' });
    this.notices.push('传送!');
  }

  // 投射物命中结算 (法术必中, 走抗性; 冰系附带减速)
  private dealMissileDamage(target: Entity, m: Missile): void {
    // 翻滚无敌帧: 玩家免疫敌方投射物伤害
    if (target.kind === 'player' && this.timeMs < this.dodgeUntilMs) return;
    // 法术暴击: 玩家投射物有几率暴击 (元素职业也有暴击反馈)
    let dmgRoll = m.dmg;
    let crit = false;
    if (m.fromPlayer && this.rng() < this.playerCritChance()) { crit = true; dmgRoll = m.dmg.map((d) => ({ ...d, min: d.min * 2, max: d.max * 2 })); }
    const { byType, total } = rollDamage(dmgRoll, target.combat.resist, this.rng);
    target.combat.hp = Math.max(0, target.combat.hp - total);
    target.hitFlash = 1;
    const killed = target.combat.hp <= 0;
    const immune = total === 0 && m.dmg.length > 0; // 抗性≥100 → 免疫
    this.events.push({ pos: { ...target.pos }, amount: total, killed, toPlayer: target.kind === 'player', dmgType: dominantDamageType(byType), immune, crit });
    if (!killed && m.kind === 'iceball') target.combat.stunUntilMs = Math.max(target.combat.stunUntilMs, this.timeMs + 1000);
    if (killed) {
      target.dead = true;
      if (target === this.player) this.playerKilledBy = `敌方${m.kind === 'arrow' ? '箭矢' : '法术'}`;
      if (m.fromPlayer && target.kind === 'monster') {
        this.grantXp(target.xpReward);
        if (target.xpReward > 0) this.events.push({ pos: { ...target.pos }, amount: 0, killed: false, toPlayer: false, xp: target.xpReward });
      }
    }
  }

  private nearestMonster(from: Vec2, range: number): Entity | null {
    let best: Entity | null = null;
    let bd = range;
    for (const e of this.monsters) {
      if (e.dead) continue;
      const d = dist(from, e.pos) - e.radius;
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  // 简易分离: 防止怪物重叠成一团 (软推开)
  private separate(): void {
    const all = [this.player, ...this.monsters];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const d = Math.hypot(dx, dy);
        const min = a.radius + b.radius;
        if (d > 1e-4 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d, ny = dy / d;
          if (a.kind !== 'player') { a.pos.x -= nx * push; a.pos.y -= ny * push; }
          if (b.kind !== 'player') { b.pos.x += nx * push; b.pos.y += ny * push; }
        }
      }
    }
  }
}
