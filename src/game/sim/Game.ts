import type { Entity, Corpse } from '@game/entities/entity.ts';
import { makePlayer, makeMonster } from '@game/entities/factory.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { resolveAttack } from '@game/systems/combat/index.ts';
import { updateMonsterAI, type AIContext } from '@game/systems/ai/behaviors.ts';
import { BARB_SKILLS } from '@game/classes/barbarian.ts';
import { generateItem, type ItemInstance, type EquipSlot } from '@game/systems/items/index.ts';
import { makeBarbarian, deriveCombat, type Character } from '@game/systems/stats/character.ts';
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
  goldTotal = 0;
  timeMs = 0;
  wave = 1;
  state: 'playing' | 'dead' | 'cleared' = 'playing';
  skillCd = [0, 0, 0]; // 三技能键冷却(秒)
  private rng: RNG;
  private nextGoldId = 1;

  character: Character = makeBarbarian();

  constructor(seed = 1234) {
    this.rng = mulberry32(seed);
    this.player = makePlayer();
    this.recompute(true); // 由角色+装备派生玩家战斗数值
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
    p.combat.resist = d.resist;
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
    this.monsters.push(makeMonster(defId, x, y, this.rng));
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
    if (r.killed) defender.dead = true;
  };

  private spawn = (defId: string, x: number, y: number): void => {
    this.spawnMonster(defId, x, y);
  };

  update(dt: number, input: PlayerInput): void {
    this.timeMs += dt * 1000;
    const now = this.timeMs;
    const p = this.player;

    // ----- 玩家 -----
    p.attackCd = Math.max(0, p.attackCd - dt);
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
  }

  // 阵亡重生: 回满血, 清场, 刷新当前波 (金币保留)
  respawn(): void {
    const p = this.player;
    p.combat.hp = p.combat.maxHp;
    p.dead = false;
    p.combat.stunUntilMs = 0;
    this.monsters = [];
    this.corpses = [];
    this.gold = [];
    this.groundItems = [];
    this.swings = [];
    this.state = 'playing';
    this.spawnWaveAroundPlayer();
  }

  // 迎战下一波 (递增数量)
  nextWave(): void {
    this.wave++;
    this.corpses = [];
    this.state = 'playing';
    this.spawnWaveAroundPlayer();
  }

  spawnWaveAroundPlayer(): void {
    const p = this.player;
    const r = this.rng;
    const count = 4 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      const ang = r() * Math.PI * 2;
      const rad = 7 + r() * 4;
      const x = p.pos.x + Math.cos(ang) * rad;
      const y = p.pos.y + Math.sin(ang) * rad * 0.75;
      const pick = r();
      const def = pick < 0.4 ? 'skeleton' : pick < 0.65 ? 'zombie' : pick < 0.9 ? 'fallen' : 'shaman';
      this.spawnMonster(def, x, y);
    }
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
