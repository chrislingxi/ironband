import type { Game } from '@game/sim/Game.ts';
import type { ItemInstance, EquipSlot } from '@game/systems/items/index.ts';
import { openSockets } from '@game/systems/items/index.ts';
import { runeById } from '@game/data/runes.ts';
import { deriveCombat } from '@game/systems/stats/character.ts';
import { itemTip, RARITY_HEX } from '@game/ui/itemtip.ts';

type ItemLoc = { kind: 'equip'; slot: EquipSlot } | { kind: 'bag'; index: number } | null;

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
  #inv .bar2 { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
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
  #inv .cell:active { transform:scale(.97); }
  #inv .empty { opacity:.4; padding:18px 4px; }
  #inv .tip { margin-top:12px; padding:11px 12px; border:1px solid #5a4f6a; border-radius:10px; background:#0d0a10; font-size:12px; line-height:1.65; min-height:46px; box-shadow:inset 0 1px 4px #000; }
  #inv .runechip { display:inline-block; cursor:pointer; color:#caa24a; border:1px solid #6a5a3a; border-radius:6px; padding:2px 8px; font-size:11px; margin:2px 4px 0 0; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class InventoryPanel {
  readonly root: HTMLElement;
  open = false;
  private gridEl: HTMLElement;
  private tipEl: HTMLElement;
  private runesEl: HTMLElement;
  private capEl: HTMLElement;

  constructor(private game: Game, onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'inv';
    this.root.innerHTML = `
      <div class="hd"><div class="ttl">🎒 背包</div><div class="x">✕</div></div>
      <div class="bar2"><span class="equipbest">⚡ 一键穿戴</span><span class="cap"></span><span class="runes"></span></div>
      <div class="grid"></div>
      <div class="tip">点击物品查看 · 点「穿」装备</div>`;
    document.body.appendChild(this.root);
    this.gridEl = this.root.querySelector('.grid') as HTMLElement;
    this.tipEl = this.root.querySelector('.tip') as HTMLElement;
    this.runesEl = this.root.querySelector('.runes') as HTMLElement;
    this.capEl = this.root.querySelector('.cap') as HTMLElement;
    (this.root.querySelector('.x') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onClose(); });
    (this.root.querySelector('.equipbest') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.game.equipBest(); this.refresh(); });
  }

  show(): void { this.open = true; this.root.classList.add('show'); this.refresh(); }
  hide(): void { this.open = false; this.root.classList.remove('show'); }

  private showTip(it: ItemInstance, loc: ItemLoc): void {
    const g = this.game;
    const d = deriveCombat(g.character);
    const ctx = { level: g.character.level, str: d.attrs.str, dex: d.attrs.dex, value: undefined as number | undefined };
    let html = itemTip(it, ctx);
    // 与已装备同槽对比
    if (loc?.kind === 'bag') {
      const eq = g.character.equipment[it.base.slot];
      if (eq && eq.uid !== it.uid) html += `<div style="margin-top:8px;border-top:1px dashed #3a3a48;padding-top:6px;opacity:.85"><div style="opacity:.5;font-size:11px">▼ 当前已装备</div>${itemTip(eq, ctx)}</div>`;
    }
    this.tipEl.innerHTML = html;
    // 镶嵌符文
    const runeIds = Object.keys(g.runeBag).filter((id) => g.runeBag[id] > 0);
    if (loc && openSockets(it) > 0 && runeIds.length > 0) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:8px';
      wrap.innerHTML = '<span style="opacity:.6">镶入符文: </span>';
      for (const id of runeIds) {
        const chip = document.createElement('span');
        chip.className = 'runechip';
        chip.textContent = `${runeById(id)?.name ?? id}×${g.runeBag[id]}`;
        chip.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          const ok = loc.kind === 'bag' ? g.socketInventory(loc.index, id) : false;
          if (ok) { this.refresh(); this.showTip(it, loc); }
        });
        wrap.appendChild(chip);
      }
      this.tipEl.appendChild(wrap);
    }
  }

  refresh(): void {
    const g = this.game;
    this.capEl.textContent = `${g.inventory.length}/${g.invCap}`;
    const runeIds = Object.keys(g.runeBag).filter((id) => g.runeBag[id] > 0);
    this.runesEl.innerHTML = runeIds.length ? `符文: ${runeIds.map((id) => `${runeById(id)?.name ?? id}×${g.runeBag[id]}`).join('  ')}` : '';
    this.gridEl.innerHTML = '';
    if (g.inventory.length === 0) { this.gridEl.innerHTML = '<div class="empty">背包空空。</div>'; return; }
    g.inventory.forEach((it, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const nm = it.identified ? it.name : `${it.base.name}(未鉴)`;
      const col = it.identified ? RARITY_HEX[it.rarity] : '#c8c8c8';
      const sock = it.sockets ? `<span class="sock">[${(it.socketed?.length ?? 0)}/${it.sockets}孔]</span>` : '';
      cell.innerHTML = `<span class="nm" style="color:${col}">${nm}</span>${sock}<span class="wear">穿</span>`;
      cell.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it, { kind: 'bag', index: i }); });
      (cell.querySelector('.wear') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.equip(i); this.refresh(); });
      this.gridEl.appendChild(cell);
    });
  }
}
