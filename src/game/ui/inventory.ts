import type { Game } from '@game/sim/Game.ts';
import type { ItemInstance, RolledAffix, EquipSlot } from '@game/systems/items/index.ts';
import { openSockets, matchRuneword } from '@game/systems/items/index.ts';
import { runeById } from '@game/data/runes.ts';
import { setById } from '@game/data/sets.ts';
import { sellPrice } from '@game/systems/town/economy.ts';
import { deriveCombat } from '@game/systems/stats/character.ts';

// 镶嵌位置: 装备槽 或 背包索引 (供 showTip 决定调用哪个镶孔方法)。
type ItemLoc = { kind: 'equip'; slot: EquipSlot } | { kind: 'bag'; index: number } | null;

const RARITY_HEX: Record<string, string> = {
  normal: '#c8c8c8', magic: '#7a9cff', rare: '#ffe85a', set: '#33cc33', unique: '#c8945a',
};
const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器', helm: '头盔', armor: '盔甲', shield: '盾牌', gloves: '手套',
  boots: '鞋子', belt: '腰带', ring: '戒指', amulet: '护符',
};
const SLOT_ORDER: EquipSlot[] = ['weapon', 'helm', 'armor', 'shield', 'gloves', 'boots', 'belt', 'ring', 'amulet'];

const STAT_TPL: Record<string, string> = {
  maxhp: '+{v} 生命', maxmana: '+{v} 法力', tohit: '+{v} 命中', tohit_perc: '+{v}% 命中',
  defense: '+{v} 防御', defense_perc: '+{v}% 防御', mindam: '+{v} 最小伤害', maxdam: '+{v} 最大伤害',
  dmg_perc: '+{v}% 增强伤害', str: '+{v} 力量', dex: '+{v} 敏捷', vit: '+{v} 体能', energy: '+{v} 精力',
  res_fire: '+{v}% 火抗', res_cold: '+{v}% 冰抗', res_lght: '+{v}% 电抗', res_pois: '+{v}% 毒抗',
  res_all: '+{v}% 全抗', lifeleech: '{v}% 吸血', ias: '+{v}% 攻击速度', fhr: '+{v}% 受身恢复',
};
function affixText(a: RolledAffix): string {
  return (STAT_TPL[a.stat] ?? `+{v} ${a.stat}`).replace('{v}', String(a.value));
}
interface TipCtx { level: number; str: number; dex: number; value?: number }
function reqLine(label: string, need: number, have: number): string {
  const ok = have >= need;
  return `<span style="color:${ok ? '#9a8a66' : '#ff6a5a'}">${label} ${need}${ok ? '' : ` (当前 ${have})`}</span>`;
}
function itemTip(it: ItemInstance, ctx?: TipCtx): string {
  // 未鉴定: 只显基础信息, 隐藏词缀/专名 (保留"鉴定开盒"的悬念)
  const dispName = it.identified ? it.name : `${it.base.name} <span style="color:#caa24a">(未鉴定)</span>`;
  const dispColor = it.identified ? RARITY_HEX[it.rarity] : '#c8c8c8';
  const lines = [`<b style="color:${dispColor}">${dispName}</b>`, `<span style="opacity:.6">${it.base.name} (ilvl ${it.ilvl})</span>`];
  if (it.base.baseDamage) lines.push(`<span style="opacity:.7">伤害 ${it.base.baseDamage[0]}-${it.base.baseDamage[1]}</span>`);
  if (it.base.baseDefense) lines.push(`<span style="opacity:.7">防御 ${it.base.baseDefense[0]}-${it.base.baseDefense[1]}</span>`);
  // 需求 (等级/力量/敏捷); 不满足红字
  const reqs: string[] = [];
  if (it.base.reqLevel > 1) reqs.push(reqLine('需要等级', it.base.reqLevel, ctx?.level ?? 99));
  if (it.base.reqStr) reqs.push(reqLine('需要力量', it.base.reqStr, ctx?.str ?? 999));
  if (it.base.reqDex) reqs.push(reqLine('需要敏捷', it.base.reqDex, ctx?.dex ?? 999));
  if (reqs.length) lines.push(reqs.join(' · '));
  if (!it.identified) { lines.push('<span style="opacity:.5">回营地鉴定后揭示属性</span>'); if (ctx?.value) lines.push(`<span style="color:#c8a860">价值 ⦿${ctx.value}</span>`); return lines.join('<br>'); }
  for (const a of it.affixes) lines.push(`<span style="color:#7a9cff">${affixText(a)}</span>`);
  // 套装: 显示所属套装与各档加成 (绿字)
  if (it.setId) {
    const set = setById(it.setId);
    if (set) {
      lines.push(`<span style="color:#33cc33;font-weight:700">套装: ${set.name}</span>`);
      for (const tier of set.bonuses) {
        const mods = tier.mods.map((m) => affixText({ stat: m.stat, value: m.value } as RolledAffix)).join(', ');
        lines.push(`<span style="color:#2a9e2a">${tier.count}件: ${mods}</span>`);
      }
    }
  }
  // 镶孔: ●已镶(符文名) / ○空孔
  if (it.sockets && it.sockets > 0) {
    const filled = (it.socketed ?? []).map((id) => `<span style="color:#c8945a">●${runeById(id)?.name ?? '?'}</span>`);
    const empty = Array.from({ length: openSockets(it) }, () => '<span style="opacity:.4">○空孔</span>');
    lines.push(`<span style="opacity:.85">镶孔 ${[...filled, ...empty].join(' ')}</span>`);
    const rw = matchRuneword(it);
    if (rw) {
      lines.push(`<span style="color:#caa24a;font-weight:700">符文之语: ${rw.name}</span>`);
      for (const m of rw.mods) lines.push(`<span style="color:#caa24a">${affixText({ stat: m.stat, value: m.value } as RolledAffix)}</span>`);
    }
  }
  if (ctx?.value) lines.push(`<span style="color:#c8a860">价值 ⦿${ctx.value}</span>`);
  return lines.join('<br>');
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #inv { position:absolute; inset:0; display:none; background:#0c0c12ee; z-index:80; color:#e8e0d0;
    font-family:-apple-system,"PingFang SC",sans-serif; padding:max(16px,env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) 16px calc(16px + env(safe-area-inset-left)); overflow:auto; }
  #inv h3 { font-family:Georgia,serif; color:#ffd76b; font-size:16px; margin:6px 0; }
  #inv .close { position:absolute; top:12px; right:16px; width:40px; height:40px; border-radius:8px; background:#2a2a36;
    display:flex; align-items:center; justify-content:center; font-size:22px; }
  #inv .cols { display:flex; gap:16px; flex-wrap:wrap; }
  #inv .col { flex:1; min-width:260px; }
  #inv .stats div { font-size:13px; line-height:1.7; }
  #inv .equip, #inv .bag { display:flex; flex-wrap:wrap; gap:8px; }
  #inv .cell { min-width:120px; padding:7px 9px; border:1px solid #3a3a48; border-radius:7px; background:#16161e; font-size:12px; }
  #inv .cell .s { opacity:.5; font-size:10px; }
  #inv .item { padding:8px 10px; border:1px solid #3a3a48; border-radius:7px; background:#16161e; font-size:12px; cursor:pointer; }
  #inv .item:active { transform:scale(.96); }
  #inv .tip { margin-top:10px; padding:10px; border:1px solid #3a3a48; border-radius:8px; background:#101018; font-size:12px; line-height:1.6; min-height:40px; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class InventoryPanel {
  readonly root: HTMLElement;
  private bagEl: HTMLElement;
  private equipEl: HTMLElement;
  private statsEl: HTMLElement;
  private tipEl: HTMLElement;
  open = false;

  constructor(private game: Game, onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'inv';
    this.root.innerHTML = `
      <div class="close">✕</div>
      <h3>角色 · 背包</h3>
      <div class="cols">
        <div class="col"><h4>属性</h4><div class="stats"></div><div class="tip"></div></div>
        <div class="col"><h4>装备 (点击卸下)</h4><div class="equip"></div></div>
        <div class="col"><h4>背包</h4><div class="runes" style="font-size:12px;color:#caa24a;margin-bottom:6px"></div><div class="bag"></div></div>
      </div>`;
    document.body.appendChild(this.root);
    this.statsEl = this.root.querySelector('.stats') as HTMLElement;
    this.equipEl = this.root.querySelector('.equip') as HTMLElement;
    this.bagEl = this.root.querySelector('.bag') as HTMLElement;
    this.tipEl = this.root.querySelector('.tip') as HTMLElement;
    (this.root.querySelector('.close') as HTMLElement).addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); onClose();
    });
  }

  show(): void { this.open = true; this.root.style.display = 'block'; this.refresh(); }
  hide(): void { this.open = false; this.root.style.display = 'none'; }

  private showTip(it: ItemInstance, loc: ItemLoc = null): void {
    const d = deriveCombat(this.game.character);
    const ctx = { level: this.game.character.level, str: d.attrs.str, dex: d.attrs.dex, value: sellPrice(it) };
    this.tipEl.innerHTML = itemTip(it, ctx);
    // 背包件: 并排显示已装备同槽对比 (Round 4 实现)
    if (loc?.kind === 'bag') {
      const eq = this.game.character.equipment[it.base.slot];
      if (eq && eq.uid !== it.uid) {
        this.tipEl.innerHTML += `<div style="margin-top:8px;border-top:1px dashed #3a3a48;padding-top:6px;opacity:.85"><div style="opacity:.6;font-size:11px">▼ 当前已装备</div>${itemTip(eq, ctx)}</div>`;
      }
    }
    // 有空孔且持有符文 → 渲染可镶符文按钮 (点击镶入并刷新)。
    const runeIds = Object.keys(this.game.runeBag).filter((id) => this.game.runeBag[id] > 0);
    if (loc && openSockets(it) > 0 && runeIds.length > 0) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:8px;display:flex;flex-wrap:wrap;gap:6px';
      wrap.innerHTML = '<span style="opacity:.6;width:100%">镶入符文:</span>';
      for (const id of runeIds) {
        const chip = document.createElement('span');
        chip.textContent = `${runeById(id)?.name ?? id} ×${this.game.runeBag[id]}`;
        chip.style.cssText = 'cursor:pointer;color:#caa24a;border:1px solid #6a5a3a;border-radius:6px;padding:2px 8px;font-size:11px';
        chip.addEventListener('pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation();
          const ok = loc.kind === 'equip' ? this.game.socketEquipped(loc.slot, id) : this.game.socketInventory(loc.index, id);
          if (ok) { this.refresh(); this.showTip(it, loc); }
        });
        wrap.appendChild(chip);
      }
      this.tipEl.appendChild(wrap);
    }
  }

  refresh(): void {
    const g = this.game;
    const d = deriveCombat(g.character);
    const sp = g.statPoints;
    // 属性行: 有未分配点时显示 [+] 按钮 (手动加点)。
    const attrRow = (label: string, a: 'str' | 'dex' | 'vit' | 'energy', v: number) =>
      `<div>${label} <b>${v}</b>${sp > 0 ? ` <span class="alloc" data-a="${a}" style="cursor:pointer;color:#7bd66a;border:1px solid #4a7a3a;border-radius:4px;padding:0 6px;margin-left:4px">+</span>` : ''}</div>`;
    const inTown = g.currentArea.isTown;
    this.statsEl.innerHTML = `
      <div>等级 ${g.character.level} · 经验 ${g.character.xp}</div>
      ${sp > 0 ? `<div style="color:#7bd66a;font-weight:700">可分配属性点: ${sp}</div>` : ''}
      ${attrRow('力量', 'str', d.attrs.str)}
      ${attrRow('敏捷', 'dex', d.attrs.dex)}
      ${attrRow('体能', 'vit', d.attrs.vit)}
      ${attrRow('精力', 'energy', d.attrs.energy)}
      <div>生命 ${Math.ceil(g.player.combat.hp)}/${d.maxHp}</div>
      <div>命中(AR) ${d.attackRating} · 防御 ${d.defense}</div>
      <div>伤害 ${d.damage[0].min}-${d.damage[0].max}</div>
      <div>抗性 火${d.resist.fire} 冰${d.resist.cold} 电${d.resist.lightning} 毒${d.resist.poison}</div>
      <div style="color:#ffd24a">金币 ${g.goldTotal}</div>
      ${inTown ? `<div class="respec" style="cursor:pointer;margin-top:6px;color:#c79433;border:1px solid #6a5a3a;border-radius:6px;padding:3px 8px;display:inline-block">洗点 (花费 ${g.respecCost()} 金)</div>` : ''}`;
    // 绑定加点/洗点 (innerHTML 重建后重新绑定)
    this.statsEl.querySelectorAll('.alloc').forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        g.allocateStat((el as HTMLElement).dataset.a as 'str' | 'dex' | 'vit' | 'energy');
        this.refresh();
      });
    });
    const respec = this.statsEl.querySelector('.respec');
    if (respec) respec.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (g.respecStats()) this.refresh();
    });

    // 符文背包 (有符文时显示, 提示去带孔装备镶嵌)
    const runeIds = Object.keys(g.runeBag).filter((id) => g.runeBag[id] > 0);
    const runeLine = this.root.querySelector('.runes') as HTMLElement;
    if (runeLine) {
      runeLine.innerHTML = runeIds.length
        ? `符文: ${runeIds.map((id) => `${runeById(id)?.name ?? id}×${g.runeBag[id]}`).join('  ')} <span style="opacity:.5">(点带孔装备镶嵌)</span>`
        : '';
    }

    // 装备槽: 点名字=查看(可镶嵌), 点"卸"=卸下
    this.equipEl.innerHTML = '';
    for (const slot of SLOT_ORDER) {
      const it = g.character.equipment[slot];
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (it) {
        const sock = it.sockets ? ` <span style="opacity:.55">[${(it.socketed?.length ?? 0)}/${it.sockets}孔]</span>` : '';
        const nm = it.identified ? it.name : `${it.base.name} (未鉴定)`;
        const col = it.identified ? RARITY_HEX[it.rarity] : '#c8c8c8';
        cell.innerHTML = `<div class="s">${SLOT_LABEL[slot]}</div>` +
          `<span class="nm" style="color:${col}">${nm}</span>${sock}` +
          ` <span class="act" style="float:right;color:#d88;border:1px solid #6a4a4a;border-radius:5px;padding:0 6px">卸</span>`;
        (cell.querySelector('.nm') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it, { kind: 'equip', slot }); });
        (cell.querySelector('.act') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.unequip(slot); this.refresh(); });
      } else {
        cell.innerHTML = `<div class="s">${SLOT_LABEL[slot]}</div><span style="opacity:.35">空</span>`;
      }
      this.equipEl.appendChild(cell);
    }

    // 背包: 点名字=查看(可镶嵌), 点"穿"=穿戴
    this.bagEl.innerHTML = '';
    if (g.inventory.length === 0) this.bagEl.innerHTML = '<span style="opacity:.35">空</span>';
    g.inventory.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'item';
      const sock = it.sockets ? ` <span style="opacity:.55">[${(it.socketed?.length ?? 0)}/${it.sockets}孔]</span>` : '';
      const nm = it.identified ? it.name : `${it.base.name} (未鉴定)`;
      const col = it.identified ? RARITY_HEX[it.rarity] : '#c8c8c8';
      el.innerHTML = `<span class="nm" style="color:${col}">${nm}</span>${sock}` +
        ` <span class="act" style="float:right;color:#8d8;border:1px solid #4a6a4a;border-radius:5px;padding:0 6px">穿</span>`;
      (el.querySelector('.nm') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it, { kind: 'bag', index: i }); });
      (el.querySelector('.act') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.equip(i); this.refresh(); });
      this.bagEl.appendChild(el);
    });
  }
}
