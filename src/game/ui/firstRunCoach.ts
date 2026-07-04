import type { Game } from '@game/sim/Game.ts';
import { iconImg } from '@game/ui/icon.ts';

const SEEN_KEY = 'ironband_first_run_v2_done';

interface CoachState {
  title: string;
  body: string;
  step: number;
  total: number;
  cta?: string;
  done?: boolean;
}

let styled = false;

function seen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}

function markSeen(): void {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
}

function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #coach { position:absolute; left:50%; bottom:calc(18px + env(safe-area-inset-bottom)); transform:translateX(-50%);
    width:min(520px,calc(100vw - 184px)); min-width:260px; z-index:42; color:#efe4c6;
    font-family:-apple-system,"PingFang SC",sans-serif; pointer-events:none; transition:opacity .2s ease, transform .2s ease; }
  #coach.hide { opacity:0; transform:translateX(-50%) translateY(8px); }
  #coach .box { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center;
    padding:10px 12px; border:1px solid #8a6a32; border-radius:10px;
    background:linear-gradient(180deg,#18110bdd,#090707ee);
    box-shadow:0 8px 28px #000c, inset 0 1px 0 #ffffff12; backdrop-filter:blur(5px); }
  #coach .sigil { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    border:1px solid #c79433; background:radial-gradient(circle at 50% 30%,#4a3213,#120c08 75%);
    box-shadow:0 0 14px #c7943333; }
  #coach .k { min-width:0; }
  #coach .title { font-family:Georgia,"Songti SC",serif; color:#ffd76b; font-size:14px; font-weight:800; letter-spacing:.03em; }
  #coach .body { color:#d8ccb0; font-size:12px; line-height:1.45; margin-top:2px; }
  #coach .meter { height:4px; margin-top:7px; border-radius:999px; background:#2a2118; overflow:hidden; }
  #coach .meter i { display:block; height:100%; width:0; background:linear-gradient(90deg,#a87422,#ffe08a); transition:width .2s ease; }
  #coach .cta { pointer-events:auto; border:1px solid #c79433; border-radius:8px; padding:8px 10px;
    color:#1a1208; font-weight:800; font-size:12px; white-space:nowrap;
    background:radial-gradient(circle at 50% 20%,#f0d07a,#a8792a); box-shadow:0 3px 10px #0008; }
  #coach .cta:active { transform:scale(.96); }
  @media (orientation:portrait) {
    #coach { left:calc(14px + env(safe-area-inset-left)); right:auto; transform:none;
      width:calc(100vw - 164px - env(safe-area-inset-left) - env(safe-area-inset-right)); min-width:210px;
      bottom:calc(20px + env(safe-area-inset-bottom)); }
    #coach.hide { transform:translateY(8px); }
    #coach .box { grid-template-columns:auto 1fr; }
    #coach .cta { grid-column:2; justify-self:start; padding:6px 9px; }
  }`;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

function stateOf(game: Game): CoachState {
  const hasLoot = game.inventory.length > 0;
  const inTown = game.currentArea.isTown;
  const inFirstField = game.currentArea.id === 'blood_moor';
  const equippedCount = Object.keys(game.character.equipment).length;

  if (inTown) {
    return {
      title: '第一目标：出营地',
      body: '跟随蓝色箭头走出罗格营地。先打怪拿第一件装备，营地服务稍后再看。',
      step: 1,
      total: 4,
    };
  }
  if (inFirstField && !hasLoot && game.monsters.length > 0) {
    return {
      title: '第一目标：打一小队怪',
      body: '拖动左侧移动，靠近敌人会自动攻击。第一场战斗会给一件可穿战利品。',
      step: 2,
      total: 4,
    };
  }
  if (hasLoot && equippedCount <= 1) {
    return {
      title: '第一目标：穿上战利品',
      body: '你已经拿到装备。打开背包点“一键穿戴”，立刻感受变强。',
      step: 3,
      total: 4,
      cta: '打开背包',
    };
  }
  if (game.state === 'cleared') {
    return {
      title: '第一目标：继续推进',
      body: '这片区域已清完。跟随蓝色出口去下一片区域，寻找邪恶巢穴。',
      step: 4,
      total: 4,
      done: game.currentArea.id !== 'blood_moor',
    };
  }
  return {
    title: '第一目标：刷怪拿装',
    body: '保持移动，优先击杀发光精英。精英和 Boss 更容易掉稀有装备与符文。',
    step: 4,
    total: 4,
  };
}

export class FirstRunCoach {
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private bodyEl: HTMLElement;
  private fillEl: HTMLElement;
  private ctaEl: HTMLElement;
  private disabled = seen();

  constructor(private game: Game, private onOpenInventory: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'coach';
    this.root.innerHTML = `
      <div class="box">
        <div class="sigil">${iconImg('quest', '◆', 20)}</div>
        <div class="k"><div class="title"></div><div class="body"></div><div class="meter"><i></i></div></div>
        <div class="cta" style="display:none"></div>
      </div>`;
    document.body.appendChild(this.root);
    this.titleEl = this.root.querySelector('.title') as HTMLElement;
    this.bodyEl = this.root.querySelector('.body') as HTMLElement;
    this.fillEl = this.root.querySelector('.meter i') as HTMLElement;
    this.ctaEl = this.root.querySelector('.cta') as HTMLElement;
    this.ctaEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onOpenInventory();
    });
    if (this.disabled) this.root.classList.add('hide');
  }

  update(): void {
    if (this.disabled) return;
    const s = stateOf(this.game);
    this.titleEl.textContent = s.title;
    this.bodyEl.textContent = s.body;
    this.fillEl.style.width = `${Math.min(100, (s.step / s.total) * 100)}%`;
    if (s.cta) {
      this.ctaEl.style.display = 'block';
      this.ctaEl.textContent = s.cta;
    } else {
      this.ctaEl.style.display = 'none';
    }
    if (s.done) {
      markSeen();
      this.disabled = true;
      this.root.classList.add('hide');
    }
  }
}
