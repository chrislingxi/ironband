import type { Game } from '@game/sim/Game.ts';
import type { ItemInstance, EquipSlot } from '@game/systems/items/index.ts';
import { openSockets } from '@game/systems/items/index.ts';
import { runeById, RUNEWORDS, type SocketBaseClass } from '@game/data/runes.ts';
import { deriveCombat } from '@game/systems/stats/character.ts';
import { itemTip, RARITY_HEX, affixText } from '@game/ui/itemtip.ts';
import { iconImg } from '@game/ui/icon.ts';
import { itemPower } from '@game/sim/Game.ts';

type ItemLoc = { kind: 'equip'; slot: EquipSlot } | { kind: 'bag'; index: number } | null;

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器', helm: '头盔', armor: '盔甲', shield: '盾牌', gloves: '手套',
  boots: '鞋子', belt: '腰带', ring: '戒指', amulet: '护符',
};
const SLOT_ICON: Record<EquipSlot, string> = {
  weapon: '⚔', helm: '🪖', armor: '🛡', shield: '🔰', gloves: '🧤', boots: '🥾', belt: '🎗', ring: '💍', amulet: '📿',
};
// 去AI感: 装备槽 emoji → game-icons key (缺图回退 emoji)
const SLOT_KEY: Record<EquipSlot, string> = {
  weapon: 'broadsword', helm: 'helm', armor: 'armor', shield: 'shield', gloves: 'gloves', boots: 'boots', belt: 'belt', ring: 'ring', amulet: 'amulet',
};
const slotIcon = (slot: EquipSlot, px = 26): string => iconImg(SLOT_KEY[slot], SLOT_ICON[slot], px);
const SLOT_ORDER: EquipSlot[] = ['weapon', 'helm', 'armor', 'shield', 'gloves', 'boots', 'belt', 'ring', 'amulet'];

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #inv { position:absolute; inset:0; display:none; z-index:80; color:#e8dcc0;
    background:radial-gradient(120% 90% at 50% 0%, #221a22f5, #0a0709fb);
    font-family:-apple-system,"PingFang SC",sans-serif;
    padding:max(14px,env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left)); overflow:auto; }
  #inv.show { display:block; }
  #inv .hd { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #5a4f6a; padding-bottom:8px; margin-bottom:10px; }
  #inv .ttl { font-family:Georgia,"Songti SC",serif; font-size:19px; font-weight:800; color:#cdb8e8; letter-spacing:2px; text-shadow:0 2px 6px #000; }
  #inv .x { width:38px; height:38px; border-radius:9px; border:1px solid #5a4f6a; background:#1a1420cc; text-align:center; line-height:36px; font-size:20px; }
  #inv .sect { font-family:Georgia,serif; color:#c79433; font-size:13px; letter-spacing:1px; margin:4px 0 8px; display:flex; align-items:center; gap:8px; }
  #inv .sect .ln { flex:1; height:1px; background:linear-gradient(90deg,#6a5a3a88,transparent); }
  /* 装备区: 9 槽网格 */
  #inv .equip { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:7px; margin-bottom:6px; }
  #inv .slot { position:relative; display:flex; align-items:center; gap:8px; padding:8px 9px; border:1px solid #3a3024; border-radius:9px;
    background:linear-gradient(#16100acc,#0f0b07cc); min-height:38px; box-shadow:inset 0 1px 0 #ffffff0c; }
  #inv .slot.empty { opacity:.45; border-style:dashed; }
  #inv .slot .ic { font-size:18px; width:22px; text-align:center; opacity:.9; }
  #inv .slot .nm { flex:1; font-size:12px; line-height:1.25; overflow:hidden; }
  #inv .slot .nm small { opacity:.45; }
  #inv .slot .off { color:#d88; border:1px solid #6a4a4a; border-radius:5px; padding:1px 7px; font-size:11px; }
  #inv .slot:active { transform:scale(.985); }
  #inv .bar2 { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:6px 0 10px; }
  #inv .equipbest { cursor:pointer; font-weight:700; font-size:13px; color:#1a1208; padding:7px 14px; border-radius:9px;
    background:radial-gradient(circle at 50% 20%,#e8c878,#a8842c); border:1px solid #ffe9a0; box-shadow:0 2px 6px #0008; }
  #inv .equipbest:active { transform:scale(.96); }
  #inv .cap { font-size:12px; opacity:.65; }
  #inv .runes { font-size:12px; color:#caa24a; }
  #inv .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(108px,1fr)); gap:8px; }
  #inv .cell { position:relative; border:1px solid #3a3448; border-radius:9px; background:linear-gradient(#16121e,#0f0c16);
    padding:8px 9px; font-size:12px; box-shadow:inset 0 1px 0 #ffffff0c; }
  #inv .cell .nm { display:block; line-height:1.3; max-height:2.6em; overflow:hidden; }
  #inv .cell .sock { font-size:10px; opacity:.55; }
  #inv .cell .wear { position:absolute; right:6px; bottom:6px; font-size:11px; color:#8d8; border:1px solid #4a6a4a; border-radius:5px; padding:0 6px; background:#11180fdd; }
  #inv .cell .pw { display:block; font-size:10px; color:#caa24a; margin-top:3px; }
  #inv .cell:active { transform:scale(.97); }
  #inv .empty-bag { opacity:.4; padding:18px 4px; }
  #inv .tip { margin-top:12px; padding:11px 12px; border:1px solid #5a4f6a; border-radius:10px; background:#0d0a10; font-size:12px; line-height:1.65; min-height:46px; box-shadow:inset 0 1px 4px #000; }
  #inv .runechip { display:inline-block; cursor:pointer; color:#caa24a; border:1px solid #6a5a3a; border-radius:6px; padding:2px 8px; font-size:11px; margin:2px 4px 0 0; }
  #inv .codexbtn { cursor:pointer; font-weight:700; font-size:13px; color:#e7c66a; padding:7px 12px; border-radius:9px; border:1px solid #6a5a3a; background:#1a1420cc; display:inline-flex; align-items:center; gap:4px; }
  #inv .codexbtn:active { transform:scale(.96); }
  /* 符文之语图鉴 overlay */
  #runecodex { position:absolute; inset:0; z-index:90; display:none; flex-direction:column; color:#e8dcc0;
    background:radial-gradient(120% 90% at 50% 0%, #241b1af5, #0a0707fc);
    font-family:-apple-system,"PingFang SC",sans-serif;
    padding:max(14px,env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left)); }
  #runecodex.show { display:flex; }
  #runecodex .rwhd { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #6a5a3a; padding-bottom:8px; margin-bottom:8px; }
  #runecodex .rwttl { font-family:Georgia,"Songti SC",serif; font-size:18px; font-weight:800; color:#e7c66a; letter-spacing:2px; text-shadow:0 2px 6px #000; }
  #runecodex .rwx { width:38px; height:38px; border-radius:9px; border:1px solid #6a5a3a; background:#1a1420cc; text-align:center; line-height:36px; font-size:20px; }
  #runecodex .rwhint { font-size:12px; line-height:1.6; color:#b8a87a; margin-bottom:10px; }
  #runecodex .rwlist { flex:1; min-height:0; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; align-content:start; }
  #runecodex .rwcard { border:1px solid #3a3024; border-radius:11px; padding:11px 12px; background:linear-gradient(180deg,#1b1610,#120e09); }
  #runecodex .rwcard.ready { border-color:#7a9c3a; box-shadow:0 0 12px #5a7a2a55; }
  #runecodex .rwtop { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  #runecodex .rwname { font-family:Georgia,serif; font-size:16px; color:#ffd76b; letter-spacing:1px; }
  #runecodex .rwbase { font-size:11px; color:#9a8a66; border:1px solid #4a4030; border-radius:5px; padding:1px 6px; }
  #runecodex .rwprog { margin-left:auto; font-size:12px; font-weight:700; color:#caa24a; }
  #runecodex .rwseq { display:flex; align-items:center; flex-wrap:wrap; gap:3px; margin-bottom:8px; }
  #runecodex .rstep { font-size:12px; padding:3px 8px; border-radius:6px; border:1px solid #4a4030; }
  #runecodex .rstep.has { color:#1a1208; background:linear-gradient(#e7c66a,#b8923a); border-color:#e7c66a; font-weight:700; }
  #runecodex .rstep.miss { color:#8a7d62; background:#15110b; border-style:dashed; }
  #runecodex .rarrow { color:#6a5a3a; font-size:11px; margin:0 1px; }
  #runecodex .rwmods { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
  #runecodex .rmod { font-size:11px; color:#9ad0ff; border:1px solid #3a4a5a; border-radius:5px; padding:1px 7px; background:#0e1620; }
  #runecodex .rwstatus { font-size:12px; }
  #runecodex .rok { color:#8fd86a; font-weight:700; }
  #runecodex .rmissline { color:#d8946a; }
  /* 竖屏: 单列纵向滚动(原行为). 横屏: 左已装备 | 右背包 两栏一屏, 各自局部滚动, 不再上下翻找。*/
  @media (orientation:landscape) {
    #inv { display:flex; flex-direction:column; overflow:hidden; }
    #inv .cols { display:flex; gap:16px; flex:1; min-height:0; }
    #inv .col-l { flex:0 0 42%; overflow-y:auto; overflow-x:hidden; padding-right:6px; }
    #inv .col-r { flex:1; min-width:0; overflow-y:auto; overflow-x:hidden; padding-right:4px; }
    #inv .tip { margin-top:10px; flex:0 0 auto; }
  }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class InventoryPanel {
  readonly root: HTMLElement;
  open = false;
  private equipEl: HTMLElement;
  private gridEl: HTMLElement;
  private tipEl: HTMLElement;
  private runesEl: HTMLElement;
  private codexEl!: HTMLElement;
  private capEl: HTMLElement;

  constructor(private game: Game, onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'inv';
    this.root.innerHTML = `
      <div class="hd"><div class="ttl">${iconImg('bag', '🎒', 20)} 装备 / 背包</div><div class="x">✕</div></div>
      <div class="cols">
        <div class="col-l">
          <div class="sect">${iconImg('broadsword', '⚔', 16)} 已装备 <span class="ln"></span></div>
          <div class="equip"></div>
          <div class="bar2"><span class="equipbest">${iconImg('lightning-arc', '⚡', 16)} 一键穿戴</span><span class="codexbtn">${iconImg('book-cover', '📖', 16)} 符文图鉴</span><span class="cap"></span><span class="runes"></span></div>
        </div>
        <div class="col-r">
          <div class="sect">${iconImg('bag', '🎒', 16)} 背包 <span class="ln"></span></div>
          <div class="grid"></div>
        </div>
      </div>
      <div class="tip">点击物品查看 · 点「穿」装备 · 点已装备「卸」卸下</div>`;
    document.body.appendChild(this.root);
    this.equipEl = this.root.querySelector('.equip') as HTMLElement;
    this.gridEl = this.root.querySelector('.grid') as HTMLElement;
    this.tipEl = this.root.querySelector('.tip') as HTMLElement;
    this.runesEl = this.root.querySelector('.runes') as HTMLElement;
    this.capEl = this.root.querySelector('.cap') as HTMLElement;
    (this.root.querySelector('.x') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onClose(); });
    (this.root.querySelector('.equipbest') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.game.equipBest(); this.refresh(); });

    // 符文之语图鉴 overlay (盖在背包之上, 展示全部配方+进度, 解决"只有文字看不到怎么用")
    this.codexEl = document.createElement('div');
    this.codexEl.id = 'runecodex';
    document.body.appendChild(this.codexEl);
    (this.root.querySelector('.codexbtn') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.openCodex(); });
  }

  show(): void { this.open = true; this.root.classList.add('show'); this.refresh(); }
  hide(): void { this.open = false; this.root.classList.remove('show'); }

  private showTip(it: ItemInstance, loc: ItemLoc): void {
    const g = this.game;
    const d = deriveCombat(g.character);
    const ctx = { level: g.character.level, str: d.attrs.str, dex: d.attrs.dex, value: undefined as number | undefined };
    let html = itemTip(it, ctx);
    // 背包物品与已装备同槽对比
    if (loc?.kind === 'bag') {
      const eq = g.character.equipment[it.base.slot];
      if (eq && eq.uid !== it.uid) html += `<div style="margin-top:8px;border-top:1px dashed #3a3a48;padding-top:6px;opacity:.85"><div style="opacity:.5;font-size:11px">▼ 当前已装备</div>${itemTip(eq, ctx)}</div>`;
    }
    this.tipEl.innerHTML = html;
    // 镶嵌符文 (仅背包物品)
    const runeIds = Object.keys(g.runeBag).filter((id) => g.runeBag[id] > 0);
    if (loc?.kind === 'bag' && openSockets(it) > 0 && runeIds.length > 0) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:8px';
      wrap.innerHTML = '<span style="opacity:.6">镶入符文: </span>';
      for (const id of runeIds) {
        const chip = document.createElement('span');
        chip.className = 'runechip';
        chip.textContent = `${runeById(id)?.name ?? id}×${g.runeBag[id]}`;
        chip.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          if (loc.kind === 'bag' && g.socketInventory(loc.index, id)) { this.refresh(); this.showTip(it, loc); }
        });
        wrap.appendChild(chip);
      }
      this.tipEl.appendChild(wrap);
    }
  }

  refresh(): void {
    const g = this.game;
    // ----- 已装备区 -----
    this.equipEl.innerHTML = '';
    for (const slot of SLOT_ORDER) {
      const it = g.character.equipment[slot];
      const cell = document.createElement('div');
      cell.className = 'slot' + (it ? '' : ' empty');
      if (it) {
        const nm = it.identified ? it.name : `${it.base.name}(未鉴)`;
        cell.innerHTML = `<span class="ic">${slotIcon(slot)}</span><span class="nm" style="color:${RARITY_HEX[it.rarity]}">${nm}<br><small>${SLOT_LABEL[slot]} · <b style="color:#e7c66a">战力 ${itemPower(it)}</b></small></span><span class="off">卸</span>`;
        (cell.querySelector('.nm') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it, { kind: 'equip', slot }); });
        (cell.querySelector('.off') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.unequip(slot); this.refresh(); });
      } else {
        cell.innerHTML = `<span class="ic">${slotIcon(slot)}</span><span class="nm">${SLOT_LABEL[slot]} · 空</span>`;
      }
      this.equipEl.appendChild(cell);
    }

    // ----- 背包区 -----
    this.capEl.textContent = `${g.inventory.length}/${g.invCap}`;
    const runeIds = Object.keys(g.runeBag).filter((id) => g.runeBag[id] > 0);
    this.runesEl.innerHTML = runeIds.length ? `符文: ${runeIds.map((id) => `${runeById(id)?.name ?? id}×${g.runeBag[id]}`).join('  ')}` : '';
    this.gridEl.innerHTML = '';
    if (g.inventory.length === 0) { this.gridEl.innerHTML = '<div class="empty-bag">背包空空。</div>'; return; }
    g.inventory.forEach((it, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const nm = it.identified ? it.name : `${it.base.name}(未鉴)`;
      const col = it.identified ? RARITY_HEX[it.rarity] : '#c8c8c8';
      const sock = it.sockets ? `<span class="sock">[${(it.socketed?.length ?? 0)}/${it.sockets}孔]</span>` : '';
      // 战力 + 与同槽已装备对比 ↑↓ (鉴定后才显, 便于一眼识强弱)
      let pw = '';
      if (it.identified) {
        const p = itemPower(it); const eq = g.character.equipment[it.base.slot];
        const d = eq ? p - itemPower(eq) : p;
        const dh = !eq ? '' : d > 0 ? `<b style="color:#5ed85e"> ▲${d}</b>` : d < 0 ? `<b style="color:#ff7b6b"> ▼${-d}</b>` : ' =';
        pw = `<span class="pw">战力 ${p}${dh}</span>`;
      }
      cell.innerHTML = `<span class="nm" style="color:${col}">${nm}</span>${sock}${pw}<span class="wear">穿</span>`;
      cell.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it, { kind: 'bag', index: i }); });
      (cell.querySelector('.wear') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.equip(i); this.refresh(); });
      this.gridEl.appendChild(cell);
    });
  }

  // 符文之语图鉴: 列全部配方, 标已拥有/缺哪几枚 + 进度, 让玩家"看得到怎么用"。
  private openCodex(): void {
    const g = this.game;
    const baseLabel: Record<SocketBaseClass, string> = { weapon: '武器', armor: '盔甲', helm: '头盔', shield: '盾牌' };
    const cards = RUNEWORDS.map((rw) => {
      // 配方按"还需几枚"统计: 同符文可能重复, 用计数对比背包持有。
      const need: Record<string, number> = {};
      for (const id of rw.runes) need[id] = (need[id] ?? 0) + 1;
      let haveAll = true;
      const seq = rw.runes.map((id, idx) => {
        const r = runeById(id);
        // 该位之前同符文已"占用"几枚 → 判断本枚是否被背包覆盖
        const usedBefore = rw.runes.slice(0, idx).filter((x) => x === id).length;
        const owned = (g.runeBag[id] ?? 0) > usedBefore;
        if (!owned) haveAll = false;
        return `<span class="rstep ${owned ? 'has' : 'miss'}">${idx + 1}.${r?.name ?? id}</span>`;
      }).join('<span class="rarrow">→</span>');
      const missList = Object.keys(need).map((id) => {
        const lack = need[id] - (g.runeBag[id] ?? 0);
        return lack > 0 ? `${runeById(id)?.name ?? id}×${lack}` : '';
      }).filter(Boolean).join('、');
      const ownedCnt = rw.runes.filter((id, idx) => (g.runeBag[id] ?? 0) > rw.runes.slice(0, idx).filter((x) => x === id).length).length;
      const mods = rw.mods.map((m) => `<span class="rmod">${affixText(m)}</span>`).join('');
      const status = haveAll
        ? '<span class="rok">✓ 符文已齐 — 镶入对应空孔装备即成型</span>'
        : `<span class="rmissline">还缺：${missList}</span>`;
      return `<div class="rwcard ${haveAll ? 'ready' : ''}">
        <div class="rwtop"><b class="rwname">${rw.name}</b><span class="rwbase">${rw.bases.map((b) => baseLabel[b]).join('/')}</span><span class="rwprog">${ownedCnt}/${rw.runes.length}</span></div>
        <div class="rwseq">${seq}</div>
        <div class="rwmods">${mods}</div>
        <div class="rwstatus">${status}</div>
      </div>`;
    }).join('');
    this.codexEl.innerHTML = `
      <div class="rwhd"><div class="rwttl">${iconImg('book-cover', '📖', 18)} 符文之语图鉴</div><div class="rwx">✕</div></div>
      <div class="rwhint">按顺序把符文镶入「对应底材的空孔装备」即触发成语。先在背包点带孔装备 → 选符文镶入。</div>
      <div class="rwlist">${cards}</div>`;
    this.codexEl.classList.add('show');
    (this.codexEl.querySelector('.rwx') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.codexEl.classList.remove('show'); });
  }
}
