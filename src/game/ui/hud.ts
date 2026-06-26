import type { Game } from '@game/sim/Game.ts';
import { BARB_SKILLS } from '@game/classes/barbarian.ts';

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
    display:flex; gap:14px; align-items:flex-end; pointer-events:auto; }
  #hud .skill { width:62px; height:62px; border-radius:50%; background:#1a1a24cc; border:2px solid #6a5a3a;
    display:flex; align-items:center; justify-content:center; font-size:26px; position:relative; box-shadow:0 3px 8px #000a;
    color:#fff; overflow:hidden; user-select:none; -webkit-user-select:none; }
  #hud .skill:active { transform:scale(.92); }
  #hud .skill .cd { position:absolute; inset:0; background:#000b; display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:700; color:#fff; opacity:0; }
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
  private skills: { cd: HTMLElement; meta: (typeof BARB_SKILLS)[number] }[] = [];

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

    BARB_SKILLS.forEach((meta, i) => {
      const btn = document.createElement('div');
      btn.className = 'skill';
      btn.innerHTML = `${meta.icon}<div class="cd"></div><div class="nm">${meta.name}</div>`;
      const fire = (e: Event) => { e.preventDefault(); e.stopPropagation(); onSkill(i); };
      btn.addEventListener('pointerdown', fire);
      skillsEl.appendChild(btn);
      this.skills.push({ cd: btn.querySelector('.cd') as HTMLElement, meta });
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
    this.skills.forEach((s, i) => {
      const cd = this.game.skillCd[i];
      if (cd > 0.05) { s.cd.style.opacity = '1'; s.cd.textContent = cd.toFixed(1); }
      else s.cd.style.opacity = '0';
    });
  }
}
