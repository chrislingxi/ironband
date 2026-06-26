import type { Entity, Corpse } from '@game/entities/entity.ts';
import { makePlayer, makeMonster } from '@game/entities/factory.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { resolveAttack } from '@game/systems/combat/index.ts';
import { updateMonsterAI, type AIContext } from '@game/systems/ai/behaviors.ts';
import { BARB_SKILLS } from '@game/classes/barbarian.ts';
import { generateItem, type ItemInstance, type EquipSlot } from '@game/systems/items/index.ts';
import { makeBarbarian, deriveCombat, type Character } from '@game/systems/stats/character.ts';
import { buildArea, type AreaInstance } from '@game/world/zone.ts';
import { playerResistPenalty } from '@game/systems/difficulty.ts';
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
  swings: Swing[] = []; // 挥砍弧光 (打击感)
  events: CombatEvent[] = []; // 每帧渲染后清空
  notices: string[] = []; // UI 提示(升级等), 渲染后清空
  goldTotal = 0;
  timeMs = 0;
  difficulty: Difficulty = 'normal';
  currentArea!: AreaInstance; // 当前区域 (构造时 loadArea 注入)
  private travelCd = 0; // 进入区域后短暂禁用出口, 防瞬间回弹
  state: 'playing' | 'dead' | 'cleared' = 'playing';
  skillCd = [0, 0, 0]; // 三技能键冷却(秒)
  private rng: RNG;
  private nextGoldId = 1;

  character: Character = makeBarbarian();
  skillTree: SkillTreeState = {}; // 已投技能点 (skillId→点数)

  constructor(seed = 1234) {
    this.rng = mulberry32(seed);
    this.player = makePlayer();
    this.recompute(true); // 由角色+装备派生玩家战斗数值
    this.loadArea('rogue_encampment'); // 从罗格营地起步
  }

  // 加载一个区域: 实例化→清场→按出生点刷怪→玩家置于中心
  loadArea(id: string): void {
    this.currentArea = buildArea(id, this.rng, this.difficulty);
    this.monsters = [];
    this.corpses = [];
    this.gold = [];
    this.groundItems = [];
    this.swings = [];
    for (const sp of this.currentArea.monsterSpawns) this.spawnMonster(sp.defId, sp.x, sp.y);
    this.player.pos = { x: this.currentArea.size[0] / 2, y: this.currentArea.size[1] / 2 };
    this.player.combat.stunUntilMs = 0;
    this.state = this.currentArea.isTown || this.monsters.length === 0 ? 'cleared' : 'playing';
    this.travelCd = 1.0;
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

  // 可用技能点 = 等级-1 - 已投 (D2: 每级1点)
  skillPointsAvailable(): number {
    return Math.max(0, this.character.level - 1 - totalPointsSpent(this.skillTree));
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

  // 切换难度: 重算(抗性惩罚)并重载当前区域
  setDifficulty(d: Difficulty): void {
    if (d === this.difficulty) return;
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

  update(dt: number, input: PlayerInput): void {
    this.timeMs += dt * 1000;
    const now = this.timeMs;
    const p = this.player;

    // ----- 玩家 -----
    p.attackCd = Math.max(0, p.attackCd - dt);
    this.travelCd = Math.max(0, this.travelCd - dt);
    for (let i = 0; i < 3; i++) this.skillCd[i] = Math.max(0, this.skillCd[i] - dt);
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
      nowMs: now, dt, rng: this.rng, attack: this.attack, spawn: this.spawn,
    };
    for (const e of this.monsters) {
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      if (!p.dead) updateMonsterAI(e, ctx);
      else e.moving = false;
    }
    this.separate();

    // ----- 死亡 → 尸体 + 掉金 -----
    for (const e of this.monsters) {
      if (e.dead) {
        this.corpses.push({ pos: { ...e.pos }, defId: e.defId, color: e.color, size: e.size, ageMs: 0 });
        if (this.rng() < 0.6) {
          this.gold.push({ id: this.nextGoldId++, pos: { ...e.pos }, amount: randInt(this.rng, 1, 6) });
        }
        // 物品掉落 (TreasureClass-lite): 按怪等级生成
        if (this.rng() < 0.32) {
          const off = () => (this.rng() - 0.5) * 0.8;
          this.groundItems.push({
            id: this.nextGoldId++,
            pos: { x: e.pos.x + off(), y: e.pos.y + off() },
            item: generateItem(e.combat.level, this.rng),
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
      else if (this.monsters.length === 0) this.state = 'cleared';
    }

    // ----- 出口传送 (营地或区域已清, 且过冷却) -----
    if (!p.dead && this.travelCd === 0 && (this.currentArea.isTown || this.monsters.length === 0)) {
      for (const ex of this.currentArea.exits) {
        if (dist(p.pos, ex.pos) < 1.6) { this.loadArea(ex.toId); break; }
      }
    }
  }

  // 阵亡重生: 回满血并重载当前区域 (金币保留)
  respawn(): void {
    const p = this.player;
    p.combat.hp = p.combat.maxHp;
    p.dead = false;
    this.loadArea(this.currentArea.id);
  }

  // 使用技能键 (0=猛击 1=双挥 2=战嚎). 返回是否成功释放.
  useSkill(slot: number): boolean {
    if (slot < 0 || slot > 2) return false;
    const p = this.player;
    if (p.dead || this.timeMs < p.combat.stunUntilMs || this.skillCd[slot] > 0) return false;
    const aim = this.nearestMonster(p.pos, 12);
    if (aim) p.facing = Math.atan2(aim.pos.y - p.pos.y, aim.pos.x - p.pos.x);
    if (slot === 0) this.skBash();
    else if (slot === 1) this.skDoubleSwing();
    else this.skWarCry();
    this.skillCd[slot] = BARB_SKILLS[slot].cooldown;
    return true;
  }

  private scaleDamage(mult: number): DamageInstance[] {
    return this.player.damage.map((d) => ({
      type: d.type, min: Math.round(d.min * mult), max: Math.round(d.max * mult),
    }));
  }

  private inArc(e: Entity, facing: number, range: number, halfAngle: number): boolean {
    const dx = e.pos.x - this.player.pos.x, dy = e.pos.y - this.player.pos.y;
    if (Math.hypot(dx, dy) - e.radius > range) return false;
    let da = Math.atan2(dy, dx) - facing;
    da = Math.atan2(Math.sin(da), Math.cos(da)); // 归一到[-π,π]
    return Math.abs(da) <= halfAngle;
  }

  private skBash(): void {
    const p = this.player;
    const t = this.nearestMonster(p.pos, p.attackRange + 0.6);
    if (t) {
      this.attack(p, t, this.scaleDamage(2.6));
      if (!t.dead) { // 强击退
        const dx = t.pos.x - p.pos.x, dy = t.pos.y - p.pos.y, d = Math.hypot(dx, dy) || 1;
        t.pos.x += (dx / d) * 0.45; t.pos.y += (dy / d) * 0.45;
      }
    }
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
  }

  private skDoubleSwing(): void {
    const p = this.player;
    const dmg = this.scaleDamage(1.25);
    for (const e of this.monsters) if (!e.dead && this.inArc(e, p.facing, 2.2, 1.2)) this.attack(p, e, dmg);
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
  }

  private skWarCry(): void {
    const p = this.player;
    const dmg = this.scaleDamage(1.0);
    for (const e of this.monsters) {
      if (e.dead) continue;
      if (dist(e.pos, p.pos) - e.radius <= 3.2) {
        this.attack(p, e, dmg);
        if (!e.dead) e.combat.stunUntilMs = Math.max(e.combat.stunUntilMs, this.timeMs + 800);
      }
    }
    this.swings.push({ pos: { ...p.pos }, facing: p.facing, ageMs: 0, kind: 'skill' });
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
