import type { Entity, Corpse } from '@game/entities/entity.ts';
import { makePlayer, makeMonster } from '@game/entities/factory.ts';
import type { DamageInstance } from '@game/systems/combat/index.ts';
import { resolveAttack } from '@game/systems/combat/index.ts';
import { updateMonsterAI, type AIContext } from '@game/systems/ai/behaviors.ts';
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
  swings: Swing[] = []; // 挥砍弧光 (打击感)
  events: CombatEvent[] = []; // 每帧渲染后清空
  goldTotal = 0;
  timeMs = 0;
  private rng: RNG;
  private nextGoldId = 1;

  constructor(seed = 1234) {
    this.rng = mulberry32(seed);
    this.player = makePlayer();
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
      updateMonsterAI(e, ctx);
    }
    this.separate();

    // ----- 死亡 → 尸体 + 掉金 -----
    for (const e of this.monsters) {
      if (e.dead) {
        this.corpses.push({ pos: { ...e.pos }, defId: e.defId, color: e.color, size: e.size, ageMs: 0 });
        if (this.rng() < 0.6) {
          this.gold.push({ id: this.nextGoldId++, pos: { ...e.pos }, amount: randInt(this.rng, 1, 6) });
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
