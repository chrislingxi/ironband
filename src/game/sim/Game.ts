import type { Entity, Corpse } from '@game/entities/entity.ts';
import { makePlayer, makeMonster } from '@game/entities/factory.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { resolveAttack, rollDamage } from '@game/systems/combat/index.ts';
import { updateMonsterAI, type AIContext } from '@game/systems/ai/behaviors.ts';
import { CLASS_KEYS, makeCharacterFor, type ClassSkillKey } from '@game/classes/profiles.ts';
import { generateItem, type ItemInstance, type EquipSlot } from '@game/systems/items/index.ts';
import { deriveCombat, type Character } from '@game/systems/stats/character.ts';
import { createMissile, updateMissiles, type Missile } from '@game/systems/missiles/index.ts';
import { rollEliteAffixes, applyElite } from '@game/systems/elites/index.ts';
import { QUESTS } from '@game/world/quests.ts';
import { initQuests, completeQuest, onAreaCleared, type QuestProgress } from '@game/systems/quests/state.ts';
import { generateShopStock, buyPrice, sellPrice, gambleCost, gambleItem, identifyCost } from '@game/systems/town/economy.ts';
import { makeMerc, updateMerc, hireCost, reviveCost, type Merc } from '@game/systems/merc/merc.ts';
import { discover, type WaypointState } from '@game/systems/waypoint/waypoint.ts';
import { AREAS } from '@game/world/act1.ts';
import type { CharClass, DamageType } from '@game/data/schema.ts';
import { buildArea, type AreaInstance } from '@game/world/zone.ts';
import { playerResistPenalty, DIFFICULTIES } from '@game/systems/difficulty.ts';

// 难度中文标签 (通关解锁提示用)。
const DIFF_LABEL: Record<Difficulty, string> = { normal: '普通', nightmare: '噩梦', hell: '地狱' };
import { CLASS_SKILLS } from '@game/classes/registry.ts';
import { canInvest, invest, totalPointsSpent, type SkillTreeState } from '@game/classes/skilltree.ts';
import type { Difficulty } from '@game/data/schema.ts';
import { dist, normalize, type Vec2 } from '@engine/math/vec.ts';
import { mulberry32, randInt, type RNG } from '@engine/math/rng.ts';

export interface CombatEvent {
  pos: Vec2;
  amount: number;
  killed: boolean;
  toPlayer: boolean;
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
  notices: string[] = []; // UI 提示(升级等), 渲染后清空
  goldTotal = 0;
  timeMs = 0;
  difficulty: Difficulty = 'normal';
  currentArea!: AreaInstance; // 当前区域 (构造时 loadArea 注入)
  private travelCd = 0; // 进入区域后短暂禁用出口, 防瞬间回弹
  state: 'playing' | 'dead' | 'cleared' = 'playing';
  skillCd = [0, 0, 0, 0]; // 四技能键冷却(秒)
  shoutUntilMs = 0; // 呐喊防御提升结束时间(ms)
  dodgeUntilMs = 0; // 翻滚无敌帧结束时间(ms)
  private rng: RNG;
  private nextGoldId = 1;

  character: Character;
  skillTree: SkillTreeState = {}; // 已投技能点 (skillId→点数)
  missiles: Missile[] = []; // 投射物(箭/法术)
  questProgress: QuestProgress = initQuests(QUESTS); // 任务状态
  bonusSkillPoints = 0; // 任务奖励的额外技能点
  mercUnlocked = false; // 任务奖励: 雇佣兵解锁(Phase D)
  act1Complete = false;
  unlockedDifficulty: Difficulty = 'normal'; // 已解锁的最高难度 (通关解锁下一难度)
  shopStock: ItemInstance[] = []; // 商店库存
  merc?: Merc; // 雇佣兵(罗格弓手)
  discoveredWaypoints: WaypointState = new Set(); // 已发现航点

  constructor(seed = 1234, cls: CharClass = 'barbarian') {
    this.rng = mulberry32(seed);
    this.character = makeCharacterFor(cls);
    this.player = makePlayer();
    this.recompute(true); // 由角色+装备派生玩家战斗数值
    this.loadArea('rogue_encampment'); // 从罗格营地起步
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
    if (this.currentArea.id === 'andariel_lair') {
      // Boss 区: 只放安达莉尔
      this.spawnMonster('andariel', this.currentArea.size[0] / 2, this.currentArea.size[1] / 2 - 6);
    } else {
      for (const sp of this.currentArea.monsterSpawns) this.spawnMonster(sp.defId, sp.x, sp.y);
    }
    // 精英怪群: 随机把 1-2 只提升为带词缀的精英队长
    if (!this.currentArea.isTown && this.currentArea.id !== 'andariel_lair' && this.monsters.length > 3) {
      const nElite = 1 + (this.rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < nElite; i++) {
        const cap = this.monsters[randInt(this.rng, 0, this.monsters.length - 1)];
        if (cap.elite) continue;
        const meta = applyElite(cap, rollEliteAffixes(this.rng, randInt(this.rng, 1, 2)));
        cap.elite = meta;
        cap.size = Math.round(cap.size * 1.3);
      }
    }
    this.player.pos = { x: this.currentArea.size[0] / 2, y: this.currentArea.size[1] / 2 };
    this.player.combat.stunUntilMs = 0;
    this.state = this.currentArea.isTown || this.monsters.length === 0 ? 'cleared' : 'playing';
    this.travelCd = 1.0;
    if (this.currentArea.isTown) this.refreshShop(); // 进城刷新商店
    if (this.merc) this.merc.pos = { x: this.player.pos.x - 1, y: this.player.pos.y - 1 }; // 雇佣兵随主归队
    this.notices.push(`进入 ${this.currentArea.name}`);
  }

  // 由 character(基础属性+等级+装备) 重算玩家战斗数值. initial=true 时回满血.
  recompute(initial = false): void {
    const d = deriveCombat(this.character);
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
  }

  // 装备背包中第 index 件 (旧装备退回背包), 重算战力
  equip(index: number): boolean {
    const it = this.inventory[index];
    if (!it) return false;
    const slot = it.base.slot;
    const prev = this.character.equipment[slot];
    this.character.equipment[slot] = it;
    this.inventory.splice(index, 1);
    if (prev) this.inventory.push(prev);
    this.recompute();
    return true;
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

  spawnMonster(defId: string, x: number, y: number): void {
    this.monsters.push(makeMonster(defId, x, y, this.rng, this.difficulty));
  }

  // 可用技能点 = 等级-1 + 任务奖励 - 已投 (D2: 每级1点)
  skillPointsAvailable(): number {
    return Math.max(0, this.character.level - 1 + this.bonusSkillPoints - totalPointsSpent(this.skillTree));
  }

  // 完成任务并发奖励
  private completeAndReward(questId: string): void {
    this.questProgress = completeQuest(this.questProgress, questId);
    if (questId === 'den_of_evil') { this.bonusSkillPoints += 1; this.notices.push('任务完成: 净化邪恶巢穴 (+1 技能点)'); }
    else if (questId === 'sisters_burial') { this.mercUnlocked = true; this.notices.push('任务完成: 姐妹的安息之地 (雇佣兵已解锁)'); }
    else if (questId === 'andariel') {
      this.act1Complete = true;
      this.notices.push('★ 第一幕通关! 安达莉尔已伏诛 ★');
      // 通关解锁下一难度 (D2 风格: 普通→噩梦→地狱)
      const order = DIFFICULTIES;
      const cur = order.indexOf(this.unlockedDifficulty);
      if (this.difficulty === this.unlockedDifficulty && cur < order.length - 1) {
        this.unlockedDifficulty = order[cur + 1];
        this.notices.push(`✦ 已解锁难度: ${DIFF_LABEL[this.unlockedDifficulty]} ✦`);
      }
    }
    else this.notices.push('任务完成');
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
    return true;
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

  private attack = (attacker: Entity, defender: Entity, dmg: DamageInstance[]): void => {
    const r = resolveAttack(attacker.combat, defender.combat, dmg, this.rng, this.timeMs);
    if (!r.hit) return;
    defender.hitFlash = 1;
    this.events.push({
      pos: { x: defender.pos.x, y: defender.pos.y },
      amount: r.totalDamage,
      killed: r.killed,
      toPlayer: defender.kind === 'player',
    });
    // 击退 (重量感): 把怪推离攻击者一小段, 不致死时
    if (defender.kind === 'monster' && !r.killed) {
      const dx = defender.pos.x - attacker.pos.x;
      const dy = defender.pos.y - attacker.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      const kb = 0.18;
      defender.pos.x += (dx / d) * kb;
      defender.pos.y += (dy / d) * kb;
    }
    if (r.killed) {
      defender.dead = true;
      if (attacker === this.player && defender.kind === 'monster') this.grantXp(defender.xpReward);
    }
  };

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
      ch.base.str += 2;
      ch.base.vit += 2;
      ch.base.dex += 1;
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
    for (let i = 0; i < 4; i++) this.skillCd[i] = Math.max(0, this.skillCd[i] - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt * 4);
    const stunned = now < p.combat.stunUntilMs;
    if (!p.dead && !stunned) {
      const mv = input.move;
      const mag = Math.hypot(mv.x, mv.y);
      if (mag > 0.05) {
        const d = normalize(mv);
        p.pos.x += d.x * p.speed * dt * Math.min(1, mag);
        p.pos.y += d.y * p.speed * dt * Math.min(1, mag);
        p.facing = Math.atan2(d.y, d.x);
        p.moving = true;
      } else {
        p.moving = false;
      }
      // 自动攻击最近的射程内怪物
      if (p.attackCd <= 0) {
        const target = this.nearestMonster(p.pos, p.attackRange + 0.5);
        if (target) {
          p.facing = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x);
          this.attack(p, target, p.damage);
          p.attackCd = p.attackInterval;
          this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'basic' });
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
          if (p.combat.hp <= 0) p.dead = true;
        }
        this.corpses.push({ pos: { ...e.pos }, defId: e.defId, color: e.color, size: e.size, ageMs: 0 });
        const isBoss = e.defId === 'andariel';
        const isElite = !!e.elite || isBoss;
        if (this.rng() < (isElite ? 1 : 0.6)) {
          this.gold.push({ id: this.nextGoldId++, pos: { ...e.pos }, amount: randInt(this.rng, isBoss ? 40 : isElite ? 8 : 1, isBoss ? 90 : isElite ? 24 : 6) });
        }
        // 物品掉落 (TreasureClass-lite): 精英必掉且更多, Boss 暴掉
        const drops = isBoss ? 4 : isElite ? 2 : this.rng() < 0.32 ? 1 : 0;
        for (let k = 0; k < drops; k++) {
          const off = () => (this.rng() - 0.5) * 0.9;
          this.groundItems.push({
            id: this.nextGoldId++,
            pos: { x: e.pos.x + off(), y: e.pos.y + off() },
            item: generateItem(e.combat.level + (isElite ? 3 : 0), this.rng),
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

    // ----- 磁吸拾金 -----
    for (const g of this.gold) {
      if (dist(g.pos, p.pos) < 1.2) { this.goldTotal += g.amount; g.amount = 0; }
    }
    this.gold = this.gold.filter((g) => g.amount > 0);

    // 磁吸拾取地面物品 (背包未满)
    if (!p.dead) {
      this.groundItems = this.groundItems.filter((gi) => {
        if (dist(gi.pos, p.pos) < 1.2 && this.inventory.length < this.invCap) {
          this.inventory.push(gi.item);
          return false;
        }
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

    // ----- 出口传送 (营地或区域已清, 且过冷却) -----
    if (!p.dead && this.travelCd === 0 && (this.currentArea.isTown || this.monsters.length === 0)) {
      for (const ex of this.currentArea.exits) {
        if (dist(p.pos, ex.pos) < 1.6) { this.loadArea(ex.toId); break; }
      }
    }
  }

  // 阵亡重生: 按难度应用惩罚后重载
  respawn(): void {
    const p = this.player;
    p.dead = false;
    this.shoutUntilMs = 0; // 清除增益
    this.dodgeUntilMs = 0;

    switch (this.difficulty) {
      case 'normal':
        // 普通: 原地复活, 满血, 无惩罚
        p.combat.hp = p.combat.maxHp;
        this.loadArea(this.currentArea.id);
        this.notices.push('已复活 (普通难度无惩罚)');
        break;

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

  // 使用技能键 (0/1/2/3). 按职业从 CLASS_KEYS 取行为, 泛化执行近战/投射/特殊.
  useSkill(slot: number): boolean {
    if (slot < 0 || slot > 3) return false;
    const p = this.player;
    if (p.dead || this.timeMs < p.combat.stunUntilMs || this.skillCd[slot] > 0) return false;
    const key = CLASS_KEYS[this.character.cls][slot];
    const aim = this.nearestMonster(p.pos, 16);
    if (aim) p.facing = Math.atan2(aim.pos.y - p.pos.y, aim.pos.x - p.pos.x);
    const dmg = this.scaleDamage(key.damageMult, key.damageType);
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
  }

  // 呐喊: 临时大幅提升防御
  private execShout(key: ClassSkillKey): void {
    const duration = (key.duration ?? 5) * 1000;
    this.shoutUntilMs = this.timeMs + duration;
    // 临时将防御翻倍 (用标记; recompute 时检测并应用)
    this.player.combat.defense = Math.round(this.player.combat.defense * 1.5);
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
    const { total } = rollDamage(m.dmg, target.combat.resist, this.rng);
    target.combat.hp = Math.max(0, target.combat.hp - total);
    target.hitFlash = 1;
    const killed = target.combat.hp <= 0;
    this.events.push({ pos: { ...target.pos }, amount: total, killed, toPlayer: target.kind === 'player' });
    if (!killed && m.kind === 'iceball') target.combat.stunUntilMs = Math.max(target.combat.stunUntilMs, this.timeMs + 1000);
    if (killed) {
      target.dead = true;
      if (m.fromPlayer && target.kind === 'monster') this.grantXp(target.xpReward);
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
