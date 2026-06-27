import type { Game } from '@game/sim/Game.ts';
import { CLASS_KEYS, type ClassSkillKey } from '@game/classes/profiles.ts';

// 轻量 DOM HUD: 血条 / 金币 / 怪物数 / 3 技能键(含冷却). 触屏友好, 适配安全区.
let styleInjected = false;
function injectStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
  #hud { position:absolute; inset:0; pointer-events:none; font-family:-apple-system,"PingFang SC",sans-serif;
    padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  /* 生命条: 金边双框 + 渐变填充 + 顶部高光 (Premium Q版) */
  #hud .bar { position:absolute; left:16px; top:16px; width:216px; height:22px; border-radius:12px;
    background:linear-gradient(#120806,#241410); border:1.5px solid #c79433;
    box-shadow:0 2px 6px #000b, 0 0 0 1px #00000080, inset 0 1px 2px #0008; overflow:hidden; }
  #hud .bar > i { display:block; height:100%; width:100%;
    background:linear-gradient(180deg,#ff8a72 0%,#e23a2a 45%,#a81810 100%); transition:width .14s ease-out;
    box-shadow:inset 0 6px 5px -4px #ffffff70, inset 0 -4px 5px -3px #00000060; }
  #hud .hptxt { position:absolute; left:16px; top:16px; width:216px; height:22px; text-align:center; line-height:22px;
    font-size:12px; font-weight:800; color:#fff; letter-spacing:.5px; text-shadow:0 1px 2px #000,0 0 4px #0008; }
  /* 金币: 药丸徽章 */
  #hud .gold { position:absolute; left:16px; top:44px; padding:2px 10px 2px 8px; border-radius:10px;
    background:#0c0c12cc; border:1px solid #6a5a3a; font-size:13px; color:#ffcf4a; font-weight:800;
    text-shadow:0 1px 2px #000; box-shadow:0 2px 5px #0008; }
  /* 治疗药水: 可点红珠 (点击/低血自动饮) */
  #hud .potion { position:absolute; left:108px; top:43px; padding:2px 9px 2px 7px; border-radius:11px; pointer-events:auto;
    background:radial-gradient(circle at 50% 30%,#7a1414,#3a0808); border:1.5px solid #c24a3a; font-size:13px; color:#ffd2c8;
    font-weight:800; text-shadow:0 1px 2px #000; box-shadow:0 2px 5px #0008, inset 0 1px 3px #ffffff22; user-select:none; }
  #hud .potion:active { transform:scale(.92); }
  #hud .potion.empty { filter:grayscale(1) brightness(.6); }
  /* 等级: 金色徽记 */
  #hud .lvl { position:absolute; left:244px; top:15px; padding:2px 11px; border-radius:11px;
    background:linear-gradient(#3a2c14,#1c1408); border:1.5px solid #c79433;
    font-family:Cinzel,Georgia,serif; font-size:14px; font-weight:800; color:#ffe08a; text-shadow:0 1px 2px #000;
    box-shadow:0 2px 5px #0008; }
  #hud .xpbar { position:absolute; left:16px; right:16px; bottom:6px; height:6px; border-radius:3px;
    background:#000a; overflow:hidden; box-shadow:inset 0 1px 2px #000a, 0 0 0 1px #6a5a3a55; }
  #hud .xpbar > i { display:block; height:100%; width:0; background:linear-gradient(90deg,#e0a020,#ffe9b0); transition:width .2s ease; }
  #hud .info { position:absolute; left:50%; transform:translateX(-50%); top:14px; padding:3px 12px; border-radius:10px;
    background:#0c0c12bb; border:1px solid #4a3f2a; font-size:12px; color:#e8e0d0; text-align:center;
    text-shadow:0 1px 2px #000; }
  /* 技能键: 金环圆钮 + 内渐变 + 第4技能紫调 */
  #hud .skills { position:absolute; right:calc(18px + env(safe-area-inset-right)); bottom:calc(30px + env(safe-area-inset-bottom));
    display:grid; grid-template-columns:64px 64px; grid-template-rows:64px 64px; gap:12px; pointer-events:auto; }
  #hud .skill { width:64px; height:64px; border-radius:50%;
    background:radial-gradient(circle at 50% 35%, #2c2c3a, #14141c 75%); border:2.5px solid #c79433;
    display:flex; align-items:center; justify-content:center; font-size:27px; position:relative;
    box-shadow:0 4px 10px #000b, inset 0 2px 6px #ffffff18, inset 0 -3px 8px #00000060;
    color:#fff; overflow:hidden; user-select:none; -webkit-user-select:none; transition:transform .07s; }
  #hud .skill:active { transform:scale(.9); }
  #hud .skill.skill-4 { border-color:#b07ad0; background:radial-gradient(circle at 50% 35%, #34243e, #1a1024 75%); }
  #hud .skill .cd { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:17px; font-weight:800; color:#fff; opacity:0; pointer-events:none; text-shadow:0 1px 2px #000; }
  #hud .skill .cd-arc { position:absolute; inset:0; border-radius:50%; pointer-events:none; }
  #hud .skill .nm { position:absolute; bottom:-14px; left:0; width:100%; text-align:center; font-size:9px; color:#d8c89a; text-shadow:0 1px 1px #000; }
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

export class HUD {
  private hpFill: HTMLElement;
  private hpTxt: HTMLElement;
  private goldEl: HTMLElement;
  private potionEl: HTMLElement;
  private infoEl: HTMLElement;
  private lvlEl: HTMLElement;
  private xpFill: HTMLElement;
  private skills: { cd: HTMLElement; arc: HTMLCanvasElement; meta: ClassSkillKey; slot: number }[] = [];

  constructor(private game: Game, onSkill: (slot: number) => void) {
    injectStyle();
    const root = document.createElement('div');
    root.id = 'hud';
    root.innerHTML = `
      <div class="bar"><i></i></div>
      <div class="hptxt"></div>
      <div class="gold">⦿ 0</div>
      <div class="potion">💊 <b>4</b></div>
      <div class="lvl">Lv 1</div>
      <div class="info"></div>
      <div class="xpbar"><i></i></div>
      <div class="skills"></div>`;
    document.body.appendChild(root);
    this.hpFill = root.querySelector('.bar > i') as HTMLElement;
    this.hpTxt = root.querySelector('.hptxt') as HTMLElement;
    this.goldEl = root.querySelector('.gold') as HTMLElement;
    this.potionEl = root.querySelector('.potion') as HTMLElement;
    this.potionEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.game.quaffPotion(); });
    this.infoEl = root.querySelector('.info') as HTMLElement;
    this.lvlEl = root.querySelector('.lvl') as HTMLElement;
    this.xpFill = root.querySelector('.xpbar > i') as HTMLElement;
    const skillsEl = root.querySelector('.skills') as HTMLElement;

    // 2x2 网格布局: 技能按钮 1-4
    // 视觉排列 (grid-area): 上排=[slot0,slot2], 下排=[slot1,slot3]
    // slot3 = 第4技能/特色技 (特殊样式)
    const gridLayout: Array<{ slot: number; row: number; col: number }> = [
      { slot: 0, row: 1, col: 1 }, { slot: 2, row: 1, col: 2 },
      { slot: 1, row: 2, col: 1 }, { slot: 3, row: 2, col: 2 },
    ];
    const keys = CLASS_KEYS[this.game.character.cls];
    gridLayout.forEach(({ slot: i, row, col }) => {
      const meta = keys[i];
      if (!meta) return;
      const btn = document.createElement('div');
      btn.className = i === 3 ? 'skill skill-4' : 'skill';
      btn.innerHTML = `${meta.icon}<canvas class="cd-arc" width="62" height="62"></canvas><div class="cd"></div><div class="nm">${meta.name}</div>`;
      btn.style.gridRow = String(row);
      btn.style.gridColumn = String(col);
      const fire = (e: Event) => { e.preventDefault(); e.stopPropagation(); onSkill(i); };
      btn.addEventListener('pointerdown', fire);
      skillsEl.appendChild(btn);
      this.skills.push({
        cd: btn.querySelector('.cd') as HTMLElement,
        arc: btn.querySelector('.cd-arc') as HTMLCanvasElement,
        meta,
        slot: i,
      });
    });
  }

  update(): void {
    const p = this.game.player;
    const ratio = Math.max(0, p.combat.hp / p.combat.maxHp);
    this.hpFill.style.width = `${ratio * 100}%`;
    this.hpTxt.textContent = `${Math.ceil(p.combat.hp)} / ${p.combat.maxHp}`;
    this.goldEl.textContent = `⦿ ${this.game.goldTotal}`;
    (this.potionEl.querySelector('b') as HTMLElement).textContent = String(this.game.potions);
    this.potionEl.classList.toggle('empty', this.game.potions <= 0);
    this.lvlEl.textContent = `Lv ${this.game.character.level}`;
    this.xpFill.style.width = `${Math.min(100, (this.game.character.xp / this.game.xpForNext()) * 100)}%`;
    const area = this.game.currentArea?.name ?? '';
    this.infoEl.textContent = p.dead
      ? '☠ 已阵亡'
      : this.game.currentArea?.isTown
        ? `${area} · 安全区`
        : `${area} · 剩余怪物 ${this.game.monsters.length}`;
    this.skills.forEach((s) => {
      const cd = this.game.skillCd[s.slot];
      const maxCd = s.meta.cooldown;
      if (cd > 0.05) {
        s.cd.style.opacity = '1';
        s.cd.textContent = cd.toFixed(1);
        // 冷却弧光 (Canvas pie wipe)
        const ctx = s.arc.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 62, 62);
          ctx.beginPath();
          ctx.moveTo(31, 31);
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + (cd / maxCd) * Math.PI * 2;
          ctx.arc(31, 31, 30, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fill();
        }
      } else {
        s.cd.style.opacity = '0';
        const ctx = s.arc.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, 62, 62);
      }
    });
  }
}
