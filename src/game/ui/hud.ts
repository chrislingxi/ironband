import type { Game } from '@game/sim/Game.ts';
import { iconImg, skillIconHtml } from '@game/ui/icon.ts';

// 轻量 DOM HUD: 血条 / 金币 / 怪物数 / 3 技能键(含冷却). 触屏友好, 适配安全区.
let styleInjected = false;
function injectStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
  #hud { position:fixed; inset:0; height:var(--app-height, 100dvh); pointer-events:none; font-family:-apple-system,"PingFang SC",sans-serif;
    padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  #hud::before { content:""; position:absolute; inset:0; pointer-events:none;
    background:linear-gradient(180deg,#0008 0%,transparent 18%,transparent 70%,#0007 100%); mix-blend-mode:multiply; }
  /* 生命条: 金边双框 + 渐变填充 + 顶部高光 */
  #hud .bar { position:absolute; left:calc(16px + env(safe-area-inset-left)); top:16px; width:216px; height:22px; border-radius:12px;
    background:linear-gradient(#160d0a,#26120d); border:1px solid #d6a64a;
    box-shadow:0 2px 9px #000d, 0 0 0 1px #00000090, 0 0 14px #7a2a1870, inset 0 1px 2px #0008; overflow:hidden; }
  #hud .bar > i { display:block; height:100%; width:100%;
    background:linear-gradient(180deg,#ff8a72 0%,#e23a2a 45%,#a81810 100%); transition:width .14s ease-out;
    box-shadow:inset 0 6px 5px -4px #ffffff70, inset 0 -4px 5px -3px #00000060; }
  #hud .hptxt { position:absolute; left:calc(16px + env(safe-area-inset-left)); top:16px; width:216px; height:22px; text-align:center; line-height:22px;
    font-size:12px; font-weight:800; color:#fff; letter-spacing:.5px; text-shadow:0 1px 2px #000,0 0 4px #0008; }
  /* 金币: 药丸徽章 */
  #hud .gold { position:absolute; left:calc(16px + env(safe-area-inset-left)); top:38px; padding:2px 10px 2px 8px; border-radius:8px;
    background:linear-gradient(180deg,#21170bee,#090807ee); border:1px solid #8b6a2d; font-size:13px; color:#ffd66d; font-weight:800;
    text-shadow:0 1px 2px #000; box-shadow:0 2px 8px #000b, inset 0 1px 0 #ffffff14; }
  /* 治疗药水: 可点红珠 (点击/低血自动饮) */
  #hud .potion { position:absolute; left:calc(108px + env(safe-area-inset-left)); top:38px; padding:2px 9px 2px 7px; border-radius:8px; pointer-events:auto;
    background:radial-gradient(circle at 45% 20%,#f08b74 0%,#8e1717 34%,#2b0606 78%); border:1px solid #d66b50; font-size:13px; color:#ffd6cc;
    font-weight:800; text-shadow:0 1px 2px #000; box-shadow:0 2px 8px #000b, 0 0 12px #9a1b1680, inset 0 1px 4px #ffffff26; user-select:none; }
  #hud .potion:active { transform:scale(.92); }
  #hud .potion.empty { filter:grayscale(1) brightness(.6); }
  /* 等级: 金色徽记 */
  #hud .lvl { position:absolute; left:calc(244px + env(safe-area-inset-left)); top:15px; padding:2px 11px; border-radius:8px;
    background:linear-gradient(#3a2a13,#130d07); border:1px solid #d6a64a;
    font-family:Cinzel,Georgia,serif; font-size:14px; font-weight:800; color:#ffe08a; text-shadow:0 1px 2px #000;
    box-shadow:0 2px 5px #0008; }
  #hud .xpbar { position:absolute; left:calc(16px + env(safe-area-inset-left)); right:calc(16px + env(safe-area-inset-right)); bottom:6px; height:6px; border-radius:3px;
    background:#000a; overflow:hidden; box-shadow:inset 0 1px 2px #000a, 0 0 0 1px #6a5a3a55; }
  #hud .xpbar > i { display:block; height:100%; width:0; background:linear-gradient(90deg,#e0a020,#ffe9b0); transition:width .2s ease; }
  #hud .info { position:absolute; left:50%; transform:translateX(-50%); top:14px; max-width:min(54vw,360px); padding:5px 12px; border-radius:8px;
    background:linear-gradient(180deg,#14100ce8,#070607e8); border:1px solid #6f5327; font-size:12px; color:#e8e0d0; text-align:center;
    text-shadow:0 1px 2px #000; box-shadow:0 2px 12px #000b; }
  /* 技能键: 宝石槽 + 金属边框, 用图标资产替换 emoji 感 */
  #hud .skills { position:absolute; right:calc(18px + env(safe-area-inset-right)); bottom:calc(30px + env(safe-area-inset-bottom));
    display:grid; grid-template-columns:62px 62px; grid-template-rows:62px 62px; gap:12px; pointer-events:auto; }
  #hud .skill { width:62px; height:62px; border-radius:12px;
    background:linear-gradient(145deg,#4c3b22 0%,#17110c 28%,#070607 100%); border:1px solid #d2a652;
    display:flex; align-items:center; justify-content:center; font-size:27px; position:relative;
    box-shadow:0 6px 16px #000d, 0 0 0 1px #000, inset 0 1px 0 #ffe8a126, inset 0 -5px 12px #000b;
    color:#fff; overflow:hidden; user-select:none; -webkit-user-select:none; transition:transform .07s, filter .12s; }
  #hud .skill::before { content:""; position:absolute; inset:6px; border-radius:9px;
    background:radial-gradient(circle at 45% 25%,#567392,#18202b 45%,#07090d 82%);
    border:1px solid #2f4862; box-shadow:inset 0 1px 6px #ffffff24, inset 0 -8px 12px #000c; }
  #hud .skill::after { content:""; position:absolute; inset:0; border-radius:12px;
    background:linear-gradient(135deg,#ffffff24 0%,transparent 28%,transparent 74%,#0009 100%); pointer-events:none; }
  #hud .skill:active { transform:scale(.92); filter:brightness(1.25); }
  #hud .skill.skill-4 { border-color:#c991ff; background:linear-gradient(145deg,#53355f 0%,#1c1024 36%,#070607 100%); }
  #hud .skill.skill-4::before { background:radial-gradient(circle at 45% 25%,#824fb4,#271439 50%,#08050c 85%); border-color:#74469a; }
  #hud .skill .ic { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; width:42px; height:42px; }
  #hud .skill-glyph { display:inline-flex; align-items:center; justify-content:center; width:42px; height:42px; }
  #hud .skill-glyph img { width:38px!important; height:38px!important;
    filter:sepia(1) saturate(2.1) hue-rotate(350deg) brightness(1.35) contrast(1.05) drop-shadow(0 2px 2px #000) drop-shadow(0 0 7px #e8c46a88)!important; }
  #hud .skill .cd { position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center;
    z-index:3; font-size:17px; font-weight:800; color:#fff; opacity:0; pointer-events:none; text-shadow:0 1px 2px #000; }
  #hud .skill .cd-arc { position:absolute; inset:0; border-radius:50%; pointer-events:none; }
  #hud .skill .nm { position:absolute; z-index:2; left:4px; right:4px; bottom:4px; height:13px; overflow:hidden; text-align:center;
    font-size:9px; line-height:13px; color:#efd895; text-shadow:0 1px 2px #000; background:#0007; border-radius:4px; }
  @media (max-width: 480px) and (orientation: portrait) {
    #hud .info { top:56px; max-width:66vw; }
    #hud .skills { right:calc(10px + env(safe-area-inset-right)); bottom:calc(22px + env(safe-area-inset-bottom)); grid-template-columns:56px 56px; grid-template-rows:56px 56px; gap:10px; }
    #hud .skill { width:56px; height:56px; }
    #hud .skill .nm { font-size:8px; }
  }
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
  private skills: { cd: HTMLElement; arc: HTMLCanvasElement; ic: HTMLElement; nm: HTMLElement; slot: number }[] = [];

  constructor(private game: Game, onSkill: (slot: number) => void) {
    injectStyle();
    const root = document.createElement('div');
    root.id = 'hud';
    root.innerHTML = `
      <div class="bar"><i></i></div>
      <div class="hptxt"></div>
      <div class="gold">⦿ 0</div>
      <div class="potion" style="display:flex;align-items:center;gap:3px">${iconImg('potion', '💊', 20)} <b>4</b></div>
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
    gridLayout.forEach(({ slot: i, row, col }) => {
      const meta = this.game.skillKey(i); // 初始图标/名称 (实时由 update 刷新, 支持改键)
      const btn = document.createElement('div');
      btn.className = i === 3 ? 'skill skill-4' : 'skill';
      btn.innerHTML = `<span class="ic" data-emoji="${meta?.icon ?? ''}">${skillIconHtml(meta?.icon ?? '·')}</span><canvas class="cd-arc" width="62" height="62"></canvas><div class="cd"></div><div class="nm">${meta?.name ?? '空'}</div>`;
      btn.style.gridRow = String(row);
      btn.style.gridColumn = String(col);
      const fire = (e: Event) => { e.preventDefault(); e.stopPropagation(); onSkill(i); };
      btn.addEventListener('pointerdown', fire);
      skillsEl.appendChild(btn);
      this.skills.push({
        cd: btn.querySelector('.cd') as HTMLElement,
        arc: btn.querySelector('.cd-arc') as HTMLCanvasElement,
        ic: btn.querySelector('.ic') as HTMLElement,
        nm: btn.querySelector('.nm') as HTMLElement,
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
    const obj = this.game.currentObjective;
    this.infoEl.innerHTML = p.dead
      ? '已阵亡'
      : this.game.currentArea?.isTown
        ? `${area} · 安全区${obj ? `<br><span style="color:#e7c66a;font-size:11px">${iconImg('bullseye', '🎯', 12)} ${obj}</span>` : ''}`
        : `${area} · 剩余怪物 ${this.game.monsters.length}${obj ? `<br><span style="color:#e7c66a;font-size:11px">${iconImg('bullseye', '🎯', 12)} ${obj}</span>` : ''}`;
    this.skills.forEach((s) => {
      const key = this.game.skillKey(s.slot); // 实时解析当前绑定 (支持改键; 空槽 undefined)
      const icon = key?.icon ?? '·', name = key?.name ?? '空';
      if (s.ic.dataset.emoji !== icon) { s.ic.dataset.emoji = icon; s.ic.innerHTML = skillIconHtml(icon); }
      if (s.nm.textContent !== name) s.nm.textContent = name;
      const cd = this.game.skillCd[s.slot];
      const maxCd = key?.cooldown ?? 1;
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
