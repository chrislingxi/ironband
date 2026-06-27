// 营地服务 UI 面板: 商店 / 赌博 / 雇佣兵 / 鉴定 (纯 DOM, 触屏友好, 适配安全区).
// 哥特风格, 参考 hud.ts / inventory.ts 的 injectStyle 与稀有度配色约定.

// 稀有度 -> 颜色 (与 inventory.ts 一致). rarity 以 string 传入, 未知键回退灰色.
const RARITY_HEX: Record<string, string> = {
  normal: '#c8c8c8', magic: '#7a9cff', rare: '#ffe85a', set: '#33cc33', unique: '#c8945a',
};
function rarityHex(r: string): string {
  return RARITY_HEX[r] ?? '#c8c8c8';
}

// 转义文本, 防止物品名/NPC 文本注入 HTML.
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// 营地服务面板的数据快照. 由 main 在打开/刷新时从 game 状态构造并传入.
export interface TownData {
  gold: number;
  shop: { uid: number; name: string; rarity: string; price: number }[];
  inventory: { uid: number; name: string; rarity: string; sellPrice: number; identified: boolean }[];
  gambleCost: number;
  merc: { hired: boolean; dead: boolean; hireCost: number; reviveCost: number };
  stash: { uid: number; name: string; rarity: string }[]; // 仓库内物品
}

// 回调集合: 各操作连到 game 对应方法.
interface TownCallbacks {
  onBuy: (uid: number) => void;
  onSell: (uid: number) => void;
  onGamble: () => void;
  onIdentify: (uid: number) => void;
  onHireMerc: () => void;
  onReviveMerc: () => void;
  onDeposit: (uid: number) => void; // 背包→仓库
  onWithdraw: (uid: number) => void; // 仓库→背包
  onClose: () => void;
}

// 分页签标识.
type TownTab = 'shop' | 'gamble' | 'merc' | 'identify' | 'stash';

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #town { position:absolute; inset:0; display:none; background:#0b0b10f2; z-index:90; color:#e8e0d0;
    font-family:-apple-system,"PingFang SC",sans-serif;
    padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
    overflow:auto; pointer-events:auto; }
  #town h3 { font-family:Georgia,serif; color:#ffd76b; font-size:17px; margin:4px 0 2px; letter-spacing:.5px; }
  #town .sub { font-size:12px; opacity:.6; margin-bottom:10px; }
  #town .gold { font-size:14px; color:#ffd24a; font-weight:700; text-shadow:0 1px 2px #000; margin:2px 0 12px; }
  #town .close { position:absolute; top:12px; right:16px; width:40px; height:40px; border-radius:8px;
    background:#2a2a36; border:1px solid #54442a; display:flex; align-items:center; justify-content:center; font-size:22px; }
  #town .close:active { transform:scale(.92); }
  #town .tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
  #town .tab { padding:9px 16px; border:1px solid #4a3c24; border-radius:8px; background:#16161e;
    font-family:Georgia,serif; font-size:13px; color:#b8a878; user-select:none; -webkit-user-select:none; }
  #town .tab:active { transform:scale(.95); }
  #town .tab.on { background:linear-gradient(#3a2f18,#241c0e); color:#ffd76b; border-color:#8a6a3a; box-shadow:0 0 0 1px #00000080 inset; }
  #town h4 { font-family:Georgia,serif; color:#c8b890; font-size:13px; margin:14px 0 6px; opacity:.9; }
  #town .list { display:flex; flex-direction:column; gap:7px; }
  #town .row { display:flex; align-items:center; justify-content:space-between; gap:10px;
    padding:9px 12px; border:1px solid #3a3a48; border-radius:7px; background:#16161e; font-size:13px; }
  #town .row.act:active { transform:scale(.98); background:#1e1e28; }
  #town .row .price { color:#ffd24a; font-weight:700; white-space:nowrap; }
  #town .empty { font-size:12px; opacity:.35; padding:8px 2px; }
  #town .btn { display:inline-block; margin-top:8px; padding:11px 22px; border:1px solid #8a6a3a; border-radius:9px;
    background:linear-gradient(#3a2f18,#241c0e); color:#ffd76b; font-family:Georgia,serif; font-size:14px; font-weight:700;
    text-shadow:0 1px 2px #000; user-select:none; -webkit-user-select:none; }
  #town .btn:active { transform:scale(.95); }
  #town .note { font-size:13px; line-height:1.7; opacity:.85; max-width:560px; }
  #town .merc-state { font-size:14px; color:#9ad07a; font-weight:700; margin-top:6px; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class TownPanel {
  readonly root: HTMLElement;
  open = false;
  private tab: TownTab = 'shop';
  private data: TownData | null = null;

  private goldEl: HTMLElement;
  private tabsEl: HTMLElement;
  private bodyEl: HTMLElement;
  private tabBtns: Record<TownTab, HTMLElement>;

  constructor(private cb: TownCallbacks) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'town';
    this.root.innerHTML = `
      <div class="close">✕</div>
      <h3>查西的营地</h3>
      <div class="sub">铁链之外, 此处暂得喘息. 商人吉德、流浪术士卡夏与老兵凯恩在此候命.</div>
      <div class="gold">⦿ 0</div>
      <div class="tabs"></div>
      <div class="body"></div>`;
    document.body.appendChild(this.root);

    this.goldEl = this.root.querySelector('.gold') as HTMLElement;
    this.tabsEl = this.root.querySelector('.tabs') as HTMLElement;
    this.bodyEl = this.root.querySelector('.body') as HTMLElement;

    (this.root.querySelector('.close') as HTMLElement).addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.cb.onClose();
    });

    // 构建四个分页签.
    const tabDefs: { key: TownTab; label: string }[] = [
      { key: 'shop', label: '商店' },
      { key: 'gamble', label: '赌博' },
      { key: 'merc', label: '雇佣兵' },
      { key: 'identify', label: '鉴定' },
      { key: 'stash', label: '仓库' },
    ];
    const btns = {} as Record<TownTab, HTMLElement>;
    for (const def of tabDefs) {
      const b = document.createElement('div');
      b.className = 'tab';
      b.textContent = def.label;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.tab = def.key;
        this.render();
      });
      this.tabsEl.appendChild(b);
      btns[def.key] = b;
    }
    this.tabBtns = btns;
  }

  show(data: TownData): void {
    this.open = true;
    this.data = data;
    this.root.style.display = 'block';
    this.render();
  }

  hide(): void {
    this.open = false;
    this.root.style.display = 'none';
  }

  // 用新快照刷新 (操作后由 main 调用). 保持当前分页签.
  refresh(data: TownData): void {
    this.data = data;
    if (this.open) this.render();
  }

  // 整体重绘当前分页签内容.
  private render(): void {
    const d = this.data;
    if (!d) return;
    this.goldEl.textContent = `⦿ ${d.gold}`;
    for (const key of Object.keys(this.tabBtns) as TownTab[]) {
      this.tabBtns[key].classList.toggle('on', key === this.tab);
    }
    this.bodyEl.innerHTML = '';
    switch (this.tab) {
      case 'shop': this.renderShop(d); break;
      case 'gamble': this.renderGamble(d); break;
      case 'merc': this.renderMerc(d); break;
      case 'identify': this.renderIdentify(d); break;
      case 'stash': this.renderStash(d); break;
    }
  }

  // 仓库 (守秘人): 上方背包 (点击存入), 下方仓库 (点击取出)。物品随角色存档保存。
  private renderStash(d: TownData): void {
    const h1 = document.createElement('h4');
    h1.textContent = '存入仓库 (点击背包物品)';
    this.bodyEl.appendChild(h1);
    const depo = document.createElement('div');
    depo.className = 'list';
    if (d.inventory.length === 0) {
      depo.innerHTML = '<div class="empty">背包空空。</div>';
    } else {
      for (const it of d.inventory) {
        depo.appendChild(this.makeRow(it.name, it.rarity, '存入 ⇩', () => this.cb.onDeposit(it.uid)));
      }
    }
    this.bodyEl.appendChild(depo);

    const h2 = document.createElement('h4');
    h2.textContent = '取出仓库 (点击仓库物品)';
    this.bodyEl.appendChild(h2);
    const list = document.createElement('div');
    list.className = 'list';
    if (d.stash.length === 0) {
      list.innerHTML = '<div class="empty">仓库是空的。</div>';
    } else {
      for (const it of d.stash) {
        list.appendChild(this.makeRow(it.name, it.rarity, '取出 ⇧', () => this.cb.onWithdraw(it.uid)));
      }
    }
    this.bodyEl.appendChild(list);
  }

  // 一行: 物品名(稀有度配色) + 右侧价格. act=true 时可点击.
  private makeRow(name: string, rarity: string, priceLabel: string, onTap?: () => void): HTMLElement {
    const row = document.createElement('div');
    row.className = onTap ? 'row act' : 'row';
    row.innerHTML =
      `<span style="color:${rarityHex(rarity)}">${esc(name)}</span>` +
      `<span class="price">${esc(priceLabel)}</span>`;
    if (onTap) {
      row.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); onTap();
      });
    }
    return row;
  }

  // 商店: 上方店内商品 (点击购买), 下方背包 (点击出售).
  private renderShop(d: TownData): void {
    const h1 = document.createElement('h4');
    h1.textContent = '吉德的货架 (点击购买)';
    this.bodyEl.appendChild(h1);
    const buyList = document.createElement('div');
    buyList.className = 'list';
    if (d.shop.length === 0) {
      buyList.innerHTML = '<div class="empty">货架空空如也。</div>';
    } else {
      for (const it of d.shop) {
        buyList.appendChild(this.makeRow(it.name, it.rarity, `⦿ ${it.price}`, () => this.cb.onBuy(it.uid)));
      }
    }
    this.bodyEl.appendChild(buyList);

    const h2 = document.createElement('h4');
    h2.textContent = '出售背包 (点击售出)';
    this.bodyEl.appendChild(h2);
    const sellList = document.createElement('div');
    sellList.className = 'list';
    if (d.inventory.length === 0) {
      sellList.innerHTML = '<div class="empty">背包空空。</div>';
    } else {
      for (const it of d.inventory) {
        sellList.appendChild(this.makeRow(it.name, it.rarity, `售 ⦿ ${it.sellPrice}`, () => this.cb.onSell(it.uid)));
      }
    }
    this.bodyEl.appendChild(sellList);
  }

  // 赌博: 说明 + 花费, 一个"赌一件"按钮.
  private renderGamble(d: TownData): void {
    const note = document.createElement('div');
    note.className = 'note';
    note.innerHTML =
      '卡夏摊开一块脏布, 上面盖着不明来路的货色。<br>' +
      `付一笔钱掀开它 —— 也许是垃圾, 也许是宝贝。每次花费 <b style="color:#ffd24a">⦿ ${d.gambleCost}</b>。`;
    this.bodyEl.appendChild(note);

    const btn = document.createElement('div');
    btn.className = 'btn';
    btn.textContent = `赌一件 (⦿ ${d.gambleCost})`;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.cb.onGamble();
    });
    this.bodyEl.appendChild(btn);
  }

  // 雇佣兵: 未雇 -> 雇佣; 已雇且死亡 -> 复活; 已雇存活 -> 随行中.
  private renderMerc(d: TownData): void {
    const m = d.merc;
    if (!m.hired) {
      const note = document.createElement('div');
      note.className = 'note';
      note.innerHTML = '老兵凯恩靠在火堆旁。给够价钱, 他便愿与你同赴铁链深处。';
      this.bodyEl.appendChild(note);

      const btn = document.createElement('div');
      btn.className = 'btn';
      btn.textContent = `雇佣 (⦿ ${m.hireCost})`;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); this.cb.onHireMerc();
      });
      this.bodyEl.appendChild(btn);
    } else if (m.dead) {
      const note = document.createElement('div');
      note.className = 'note';
      note.innerHTML = '凯恩倒下了, 但还有一口气。付钱让他重新站起来。';
      this.bodyEl.appendChild(note);

      const btn = document.createElement('div');
      btn.className = 'btn';
      btn.textContent = `复活 (⦿ ${m.reviveCost})`;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); this.cb.onReviveMerc();
      });
      this.bodyEl.appendChild(btn);
    } else {
      const state = document.createElement('div');
      state.className = 'merc-state';
      state.textContent = '凯恩 · 随行中';
      this.bodyEl.appendChild(state);
    }
  }

  // 鉴定: 列出背包中未鉴定的物品, 点击鉴定 (显示鉴定价).
  private renderIdentify(d: TownData): void {
    const note = document.createElement('div');
    note.className = 'note';
    note.innerHTML = '吉德也懂些鉴物的门道。未辨明的货色, 点一下便为你揭晓。';
    this.bodyEl.appendChild(note);

    const list = document.createElement('div');
    list.className = 'list';
    const unidentified = d.inventory.filter((it) => !it.identified);
    if (unidentified.length === 0) {
      list.innerHTML = '<div class="empty">没有待鉴定的物品。</div>';
    } else {
      for (const it of unidentified) {
        // 未鉴定物品统一以未知色显示, 不泄露真实稀有度.
        list.appendChild(this.makeRow(it.name, 'normal', '鉴定 ⦿ ' + it.sellPrice, () => this.cb.onIdentify(it.uid)));
      }
    }
    this.bodyEl.appendChild(list);
  }
}
