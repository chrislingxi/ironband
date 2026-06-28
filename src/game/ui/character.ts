import type { Game } from '@game/sim/Game.ts';
import { iconImg } from '@game/ui/icon.ts';
import { deriveCombat } from '@game/systems/stats/character.ts';

// 逐职业加点导向 (回应"什么职业加什么属性")。
const CLASS_GUIDE: Record<string, string> = {
  barbarian: '野蛮人: 力量↑(增伤·穿重甲) + 体能↑(生命); 少量敏捷保命中',
  amazon: '亚马逊: 敏捷↑(命中·伤害) + 体能↑(生命); 少量力量够穿装',
  sorceress: '法师: 精力↑(法力) + 体能↑(生命); 力量仅加到够穿装即可, 不堆力量',
};
const CLASS_NAME: Record<string, string> = { barbarian: '野蛮人', amazon: '亚马逊', sorceress: '法师' };
const ATTR_DESC: Record<string, string> = {
  str: '力量: 增强物理伤害, 满足装备力量需求',
  dex: '敏捷: 提升命中(AR), 满足装备敏捷需求',
  vit: '体能: 每点提升生命上限 (最重要的保命属性)',
  energy: '精力: 提升法力上限 (法师核心)',
};

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #charp { position:absolute; inset:0; display:none; z-index:80; color:#e8dcc0;
    background:radial-gradient(120% 90% at 50% 0%, #241a14f5, #0c0907fb);
    font-family:-apple-system,"PingFang SC",sans-serif;
    padding:max(14px,env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left)); overflow:auto; }
  #charp.show { display:block; }
  #charp .hd { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #6a4f2a; padding-bottom:8px; margin-bottom:10px; }
  #charp .ttl { font-family:Georgia,"Songti SC",serif; font-size:19px; font-weight:800; color:#e8c878; letter-spacing:2px; text-shadow:0 2px 6px #000,0 0 12px #c8902040; }
  #charp .x { width:38px; height:38px; border-radius:9px; border:1px solid #6a4f2a; background:#1a1208cc; text-align:center; line-height:36px; font-size:20px; }
  #charp .x:active { transform:scale(.92); }
  /* 角色名牌: 职业 + 等级大徽记 + 经验进度 */
  #charp .hero { display:flex; align-items:center; gap:14px; margin-bottom:12px; padding:12px 14px;
    background:linear-gradient(#241a0fdd,#160f08dd); border:1px solid #6a5223; border-radius:12px; box-shadow:0 2px 8px #0007, inset 0 1px 0 #ffffff12; }
  #charp .lvbadge { width:58px; height:58px; flex:none; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center;
    background:radial-gradient(circle at 50% 30%,#4a3818,#1c1408); border:2px solid #c79433; box-shadow:0 2px 6px #000a, inset 0 2px 4px #ffffff18; }
  #charp .lvbadge small { font-size:9px; color:#c8a860; letter-spacing:1px; }
  #charp .lvbadge b { font-family:Cinzel,Georgia,serif; font-size:22px; color:#ffe08a; line-height:1; text-shadow:0 1px 2px #000; }
  #charp .heroinfo { flex:1; min-width:0; }
  #charp .heroinfo .cls { font-family:Georgia,serif; font-size:16px; color:#e8c878; font-weight:800; }
  #charp .xpwrap { margin-top:7px; }
  #charp .xpbar { height:10px; border-radius:6px; background:#0a0704; overflow:hidden; border:1px solid #5a4a2a; box-shadow:inset 0 1px 3px #000; }
  #charp .xpbar > i { display:block; height:100%; background:linear-gradient(90deg,#e0a020,#ffe9b0); box-shadow:0 0 6px #ffcf6a55; }
  #charp .xptxt { font-size:11px; color:#caa24a; margin-top:3px; }
  #charp .cols { display:flex; gap:14px; flex-wrap:wrap; }
  #charp .col { flex:1; min-width:280px; }
  #charp .card { background:linear-gradient(#1c140bdd,#140e08dd); border:1px solid #5a431f; border-radius:12px; padding:12px 14px; margin-bottom:12px; box-shadow:0 2px 8px #0007, inset 0 1px 0 #ffffff10; }
  #charp .card h4 { font-family:Georgia,serif; color:#c79433; font-size:13px; letter-spacing:1px; margin:0 0 8px; }
  #charp .pts { color:#7bd66a; font-weight:800; }
  #charp .attr { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #ffffff0a; }
  #charp .attr .nm { width:42px; color:#e8d8a8; }
  #charp .attr .v { font-weight:800; color:#fff; min-width:36px; text-align:right; }
  #charp .attr .d { flex:1; font-size:11px; opacity:.55; }
  #charp .plus { width:30px; height:30px; border-radius:7px; border:1px solid #4a7a3a; background:#1c2a16; color:#7bd66a; font-size:18px; font-weight:800; line-height:28px; text-align:center; }
  #charp .plus:active { transform:scale(.9); }
  #charp .guide { font-size:12px; line-height:1.6; color:#cbb88a; background:#241a0f88; border:1px dashed #6a5a3a; border-radius:8px; padding:8px 10px; }
  #charp .stat { font-size:13px; line-height:1.85; }
  #charp .stat b { color:#ffe08a; }
  #charp .respec { display:inline-block; margin-top:8px; cursor:pointer; color:#c79433; border:1px solid #6a5a3a; border-radius:7px; padding:5px 12px; font-size:12px; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class CharacterPanel {
  readonly root: HTMLElement;
  open = false;
  private body: HTMLElement;

  constructor(private game: Game, onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'charp';
    this.root.innerHTML = `<div class="hd"><div class="ttl">${iconImg('char','🧍',18)} 角色</div><div class="x">✕</div></div><div class="body"></div>`;
    document.body.appendChild(this.root);
    this.body = this.root.querySelector('.body') as HTMLElement;
    (this.root.querySelector('.x') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onClose(); });
  }

  show(): void { this.open = true; this.root.classList.add('show'); this.refresh(); }
  hide(): void { this.open = false; this.root.classList.remove('show'); }

  refresh(): void {
    const g = this.game;
    const d = deriveCombat(g.character);
    const sp = g.statPoints;
    const cls = g.character.cls;
    const xpNext = g.xpForNext();
    const xpPct = Math.min(100, (g.character.xp / Math.max(1, xpNext)) * 100);
    const attrRow = (label: string, a: 'str' | 'dex' | 'vit' | 'energy', v: number) =>
      `<div class="attr"><span class="nm">${label}</span><span class="v">${v}</span><span class="d">${ATTR_DESC[a].split(':')[1]}</span>${sp > 0 ? `<span class="plus" data-a="${a}">+</span>` : ''}</div>`;
    this.body.innerHTML = `
      <div class="hero">
        <div class="lvbadge"><small>LV</small><b>${g.character.level}</b></div>
        <div class="heroinfo">
          <div class="cls">${CLASS_NAME[cls] ?? cls}</div>
          <div class="xpwrap">
            <div class="xpbar"><i style="width:${xpPct}%"></i></div>
            <div class="xptxt">经验 ${g.character.xp} / ${xpNext}　(${xpPct.toFixed(0)}%)</div>
          </div>
        </div>
      </div>
      <div class="cols">
        <div class="col">
          <div class="card"><h4>属性 ${sp > 0 ? `· <span class="pts">可分配 ${sp}</span>` : ''}</h4>
            ${attrRow('力量', 'str', d.attrs.str)}
            ${attrRow('敏捷', 'dex', d.attrs.dex)}
            ${attrRow('体能', 'vit', d.attrs.vit)}
            ${attrRow('精力', 'energy', d.attrs.energy)}
            <div class="guide" style="margin-top:8px">💡 ${CLASS_GUIDE[cls] ?? ''}</div>
            ${g.currentArea.isTown ? `<div class="respec">洗点 (花费 ${g.respecCost()} 金)</div>` : ''}
          </div>
        </div>
        <div class="col">
          <div class="card"><h4>战斗数值</h4><div class="stat">
            <div>生命 <b>${Math.ceil(g.player.combat.hp)}</b> / ${d.maxHp}</div>
            <div>命中(AR) <b>${d.attackRating}</b> · 防御 <b>${d.defense}</b></div>
            <div>伤害 <b>${d.damage[0].min}-${d.damage[0].max}</b></div>
            <div>抗性 火${d.resist.fire} 冰${d.resist.cold} 电${d.resist.lightning} 毒${d.resist.poison}</div>
            <div style="color:#ffd24a">金币 ${g.goldTotal}</div>
          </div></div>
        </div>
      </div>`;

    this.body.querySelectorAll('.plus').forEach((el) => el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      g.allocateStat((el as HTMLElement).dataset.a as 'str' | 'dex' | 'vit' | 'energy'); this.refresh();
    }));
    const respec = this.body.querySelector('.respec');
    if (respec) respec.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (g.respecStats()) this.refresh(); });
  }
}
