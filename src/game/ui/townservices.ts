// 营地服务面板 (Phase D): 商店买卖 / 赌博 / 雇佣兵 / 鉴定 / 共享仓库.
// 点击营地 NPC 按其角色打开对应服务. 打开时暂停模拟 (与背包/技能面板一致).
import type { Game } from '@game/sim/Game.ts';
import type { ItemInstance } from '@game/systems/items/index.ts';
import { buyPrice, sellPrice } from '@game/systems/economy/index.ts';
import { RARITY_HEX, itemDisplayName, itemTip } from './inventory.ts';

export type TownMode = 'shop' | 'gamble' | 'mercenary' | 'identify' | 'stash';

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #town { position:absolute; inset:0; display:none; z-index:82; color:#e8dcc0;
    background:radial-gradient(120% 120% at 50% 0%, #241710f5, #0a0604fa);
    font-family:-apple-system,"PingFang SC",sans-serif; padding:max(16px,env(safe-area-inset-top)) 16px 16px; overflow:auto; }
  #town h3 { font-family:Georgia,serif; color:#ffd76b; font-size:18px; margin:4px 0 2px; }
  #town .sub { font-size:12px; color:#c8a860; margin-bottom:10px; }
  #town .gold { color:#ffd24a; font-weight:700; }
  #town .close { position:absolute; top:12px; right:16px; width:42px; height:42px; border-radius:8px; background:#2a2218;
    border:1px solid #6a4f2a; display:flex; align-items:center; justify-content:center; font-size:22px; }
  #town .cols { display:flex; gap:16px; flex-wrap:wrap; }
  #town .col { flex:1; min-width:260px; }
  #town h4 { font-family:Georgia,serif; color:#e8c878; font-size:14px; margin:8px 0 6px; border-bottom:1px solid #5a431f; padding-bottom:4px; }
  #town .row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; margin-bottom:6px;
    border:1px solid #3a3326; border-radius:7px; background:#181208; font-size:12px; }
  #town .row .nm { flex:1; }
  #town .row .price { color:#ffd24a; white-space:nowrap; }
  #town .btn { padding:7px 14px; border-radius:8px; border:1px solid #7a5a2a; background:#33260f; color:#ffe0a0;
    font-size:13px; white-space:nowrap; user-select:none; }
  #town .btn:active { transform:scale(.95); }
  #town .btn.dim { opacity:.4; }
  #town .big { display:block; width:100%; padding:14px; font-size:15px; text-align:center; margin:8px 0; }
  #town .tip { margin-top:8px; padding:10px; border:1px solid #3a3326; border-radius:8px; background:#100c06; font-size:12px; line-height:1.6; min-height:36px; }
  #town .empty { opacity:.4; font-size:12px; padding:6px 0; }
  #town .info { font-size:13px; line-height:1.7; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class TownPanel {
  readonly root: HTMLElement;
  open = false;
  private mode: TownMode = 'shop';
  private title = '';
  private bodyEl: HTMLElement;
  private headEl: HTMLElement;
  private tipEl: HTMLElement;

  constructor(private game: Game, private onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'town';
    this.root.innerHTML = `
      <div class="close">✕</div>
      <div class="head"></div>
      <div class="body"></div>
      <div class="tip"></div>`;
    document.body.appendChild(this.root);
    this.headEl = this.root.querySelector('.head') as HTMLElement;
    this.bodyEl = this.root.querySelector('.body') as HTMLElement;
    this.tipEl = this.root.querySelector('.tip') as HTMLElement;
    (this.root.querySelector('.close') as HTMLElement).addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.hide(); this.onClose();
    });
  }

  show(mode: TownMode, npcName: string): void {
    this.mode = mode;
    this.title = npcName;
    this.open = true;
    this.root.style.display = 'block';
    this.refresh();
  }
  hide(): void { this.open = false; this.root.style.display = 'none'; }

  private showTip(it: ItemInstance): void { this.tipEl.innerHTML = itemTip(it); }

  private goldLine(): string {
    return `<div class="sub">金币 <span class="gold">${this.game.goldTotal}</span></div>`;
  }

  // 通用动作按钮
  private btn(label: string, enabled: boolean, onTap: () => void): HTMLElement {
    const b = document.createElement('div');
    b.className = 'btn' + (enabled ? '' : ' dim');
    b.textContent = label;
    if (enabled) b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onTap(); });
    return b;
  }

  // 物品行: 名称(点击看详情) + 价格 + 动作按钮
  private itemRow(it: ItemInstance, price: number | null, actionLabel: string, enabled: boolean, onTap: () => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.innerHTML = `<span style="color:${RARITY_HEX[it.rarity]}">${itemDisplayName(it)}</span>`;
    nm.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it); });
    row.appendChild(nm);
    if (price !== null) {
      const p = document.createElement('div');
      p.className = 'price';
      p.textContent = `${price}金`;
      row.appendChild(p);
    }
    row.appendChild(this.btn(actionLabel, enabled, onTap));
    return row;
  }

  refresh(): void {
    this.headEl.innerHTML = '';
    this.bodyEl.innerHTML = '';
    this.tipEl.innerHTML = '';
    switch (this.mode) {
      case 'shop': this.renderShop(); break;
      case 'gamble': this.renderGamble(); break;
      case 'mercenary': this.renderMerc(); break;
      case 'identify': this.renderIdentify(); break;
      case 'stash': this.renderStash(); break;
    }
  }

  private renderShop(): void {
    const g = this.game;
    this.headEl.innerHTML = `<h3>${this.title} · 铁匠铺</h3>${this.goldLine()}`;
    const cols = document.createElement('div');
    cols.className = 'cols';
    // 购买列
    const buyCol = document.createElement('div'); buyCol.className = 'col';
    buyCol.innerHTML = '<h4>出售中</h4>';
    if (g.shopStock.length === 0) buyCol.innerHTML += '<div class="empty">货架空了</div>';
    g.shopStock.forEach((it, i) => {
      const price = buyPrice(it);
      buyCol.appendChild(this.itemRow(it, price, '购买', g.goldTotal >= price && g.inventory.length < g.invCap, () => {
        g.buyFromShop(i); this.refresh();
      }));
    });
    // 卖出列
    const sellCol = document.createElement('div'); sellCol.className = 'col';
    sellCol.innerHTML = '<h4>卖出背包</h4>';
    if (g.inventory.length === 0) sellCol.innerHTML += '<div class="empty">背包是空的</div>';
    g.inventory.forEach((it, i) => {
      sellCol.appendChild(this.itemRow(it, sellPrice(it), '卖出', true, () => { g.sellToShop(i); this.refresh(); }));
    });
    cols.append(buyCol, sellCol);
    this.bodyEl.appendChild(cols);
  }

  private renderGamble(): void {
    const g = this.game;
    const cost = g.gambleCost();
    this.headEl.innerHTML = `<h3>${this.title} · 赌博</h3>${this.goldLine()}`;
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `押下金币换一件未鉴定的货色 — 也许是垃圾, 也许是暗金。<br>每次花费 <span class="gold">${cost}</span> 金。`;
    this.bodyEl.appendChild(info);
    const gambleBtn = this.btn(`花 ${cost} 金赌一把`, g.goldTotal >= cost && g.inventory.length < g.invCap, () => { g.gamble(); this.refresh(); });
    gambleBtn.classList.add('big');
    this.bodyEl.appendChild(gambleBtn);
    if (g.inventory.length >= g.invCap) {
      const full = document.createElement('div'); full.className = 'empty'; full.textContent = '背包已满';
      this.bodyEl.appendChild(full);
    }
  }

  private renderMerc(): void {
    const g = this.game;
    this.headEl.innerHTML = `<h3>${this.title} · 雇佣兵</h3>${this.goldLine()}`;
    const info = document.createElement('div'); info.className = 'info';
    if (!g.mercUnlocked) {
      info.innerHTML = '我的姐妹尚未信任你 — 先完成"姐妹的安息之地"再来。';
      this.bodyEl.appendChild(info);
      return;
    }
    if (!g.merc) {
      const cost = g.hireCost();
      info.innerHTML = `一名罗格弓手可随你出征, 用箭替你压制敌人。<br>雇佣费 <span class="gold">${cost}</span> 金。`;
      this.bodyEl.appendChild(info);
      this.bodyEl.appendChild(this.btn(`花 ${cost} 金雇佣`, g.goldTotal >= cost, () => { g.hireMerc(); this.refresh(); })).classList.add('big');
      return;
    }
    const m = g.merc;
    info.innerHTML = `当前雇佣兵: 罗格弓手 (Lv ${m.combat.level})<br>状态: ${m.dead ? '<span style="color:#e25">已倒下</span>' : `存活 ${Math.ceil(m.combat.hp)}/${m.combat.maxHp}`}`;
    this.bodyEl.appendChild(info);
    if (m.dead) {
      const cost = g.reviveCost();
      this.bodyEl.appendChild(this.btn(`花 ${cost} 金复活`, g.goldTotal >= cost, () => { g.reviveMerc(); this.refresh(); })).classList.add('big');
    }
  }

  private renderIdentify(): void {
    const g = this.game;
    this.headEl.innerHTML = `<h3>${this.title} · 鉴定</h3>${this.goldLine()}`;
    const pending = g.inventory.filter((it) => !it.identified).length + g.stash.filter((it) => !it.identified).length;
    const info = document.createElement('div'); info.className = 'info';
    info.innerHTML = pending > 0
      ? `把你捡来的怪东西摊开吧 — 共有 <b>${pending}</b> 件未鉴定。`
      : '你身上没有需要鉴定的东西。';
    this.bodyEl.appendChild(info);
    this.bodyEl.appendChild(this.btn('鉴定全部 (免费)', pending > 0, () => { g.identifyAll(); this.refresh(); })).classList.add('big');
  }

  private renderStash(): void {
    const g = this.game;
    this.headEl.innerHTML = `<h3>共享仓库</h3><div class="sub">背包 ${g.inventory.length}/${g.invCap} · 仓库 ${g.stash.length}/${g.stashCap}</div>`;
    const cols = document.createElement('div'); cols.className = 'cols';
    const bagCol = document.createElement('div'); bagCol.className = 'col';
    bagCol.innerHTML = '<h4>背包 (存入)</h4>';
    if (g.inventory.length === 0) bagCol.innerHTML += '<div class="empty">空</div>';
    g.inventory.forEach((it, i) => {
      bagCol.appendChild(this.itemRow(it, null, '存入', g.stash.length < g.stashCap, () => { g.stashDeposit(i); this.refresh(); }));
    });
    const stashCol = document.createElement('div'); stashCol.className = 'col';
    stashCol.innerHTML = '<h4>仓库 (取出)</h4>';
    if (g.stash.length === 0) stashCol.innerHTML += '<div class="empty">空</div>';
    g.stash.forEach((it, i) => {
      stashCol.appendChild(this.itemRow(it, null, '取出', g.inventory.length < g.invCap, () => { g.stashWithdraw(i); this.refresh(); }));
    });
    cols.append(bagCol, stashCol);
    this.bodyEl.appendChild(cols);
  }
}
