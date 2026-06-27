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
  #hud .bar { position:absolute; left:14px; top:14px; width:210px; height:18px; border-radius:9px;
    background:#000a; border:1px solid #0008; overflow:hidden; box-shadow:0 1px 3px #000a inset; }
  #hud .bar > i { display:block; height:100%; width:100%; background:linear-gradient(#ff6b5e,#b81e14); transition:width .1s linear; }
  #hud .hptxt { position:absolute; left:14px; top:14px; width:210px; height:18px; text-align:center; line-height:18px;
    font-size:11px; font-weight:700; color:#fff; text-shadow:0 1px 1px #000; }
  #hud .gold { position:absolute; left:14px; top:38px; font-size:13px; color:#ffd24a; text-shadow:0 1px 2px #000; font-weight:700; }
  #hud .lvl { position:absolute; left:232px; top:13px; font-family:Georgia,serif; font-size:15px; font-weight:800; color:#ffd76b; text-shadow:0 1px 2px #000; }
  #hud .xpbar { position:absolute; left:14px; right:14px; bottom:6px; height:5px; border-radius:3px; background:#000a; overflow:hidden; }
  #hud .xpbar > i { display:block; height:100%; width:0; background:linear-gradient(#ffe08a,#e0a020); }
  #hud .info { position:absolute; right:14px; top:14px; font-size:12px; color:#e8e0d0; text-align:right; text-shadow:0 1px 2px #000; opacity:.9; }
  #hud .skills { position:absolute; right:calc(16px + env(safe-area-inset-right)); bottom:calc(28px + env(safe-area-inset-bottom));
    display:grid; grid-template-columns:62px 62px; grid-template-rows:62px 62px; gap:10px;
    pointer-events:auto; }
  #hud .skill { width:62px; height:62px; border-radius:50%; background:#1a1a24cc; border:2px solid #6a5a3a;
    display:flex; align-items:center; justify-content:center; font-size:26px; position:relative; box-shadow:0 3px 8px #000a;
    color:#fff; overflow:hidden; user-select:none; -webkit-user-select:none; }
  #hud .skill:active { transform:scale(.92); }
  #hud .skill.skill-4 { border-color:#9a6aaa; background:#241a2ecc; }
  #hud .skill .cd { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:700; color:#fff; opacity:0; pointer-events:none; }
  #hud .skill .cd-arc { position:absolute; inset:0; border-radius:50%; pointer-events:none; }
  #hud .skill .nm { position:absolute; bottom:-15px; left:0; width:100%; text-align:center; font-size:9px; color:#cbb; }
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

export class HUD {
  private hpFill: HTMLElement;
  private hpTxt: HTMLElement;
  private goldEl: HTMLElement;
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
      <div class="lvl">Lv 1</div>
      <div class="info"></div>
      <div class="xpbar"><i></i></div>
      <div class="skills"></div>`;
    document.body.appendChild(root);
    this.hpFill = root.querySelector('.bar > i') as HTMLElement;
    this.hpTxt = root.querySelector('.hptxt') as HTMLElement;
    this.goldEl = root.querySelector('.gold') as HTMLElement;
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
