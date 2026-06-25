import type { Game } from '@game/sim/Game.ts';
import type { ItemInstance, RolledAffix, EquipSlot } from '@game/systems/items/index.ts';
import { deriveCombat } from '@game/systems/stats/character.ts';

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
  res_all: '+{v}% 全抗', lifeleech: '{v}% 吸血',
};
function affixText(a: RolledAffix): string {
  return (STAT_TPL[a.stat] ?? `+{v} ${a.stat}`).replace('{v}', String(a.value));
}
function itemTip(it: ItemInstance): string {
  const lines = [`<b style="color:${RARITY_HEX[it.rarity]}">${it.name}</b>`, `<span style="opacity:.6">${it.base.name} (ilvl ${it.ilvl})</span>`];
  if (it.base.baseDamage) lines.push(`<span style="opacity:.7">伤害 ${it.base.baseDamage[0]}-${it.base.baseDamage[1]}</span>`);
  if (it.base.baseDefense) lines.push(`<span style="opacity:.7">防御 ${it.base.baseDefense[0]}-${it.base.baseDefense[1]}</span>`);
  for (const a of it.affixes) lines.push(`<span style="color:#7a9cff">${affixText(a)}</span>`);
  return lines.join('<br>');
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #inv { position:absolute; inset:0; display:none; background:#0c0c12ee; z-index:80; color:#e8e0d0;
    font-family:-apple-system,"PingFang SC",sans-serif; padding:max(16px,env(safe-area-inset-top)) 16px 16px; overflow:auto; }
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
        <div class="col"><h4>背包 (点击穿戴)</h4><div class="bag"></div></div>
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

  private showTip(it: ItemInstance): void { this.tipEl.innerHTML = itemTip(it); }

  refresh(): void {
    const g = this.game;
    const d = deriveCombat(g.character);
    this.statsEl.innerHTML = `
      <div>等级 ${g.character.level} · 经验 ${g.character.xp}</div>
      <div>力量 ${d.attrs.str} · 敏捷 ${d.attrs.dex} · 体能 ${d.attrs.vit} · 精力 ${d.attrs.energy}</div>
      <div>生命 ${Math.ceil(g.player.combat.hp)}/${d.maxHp}</div>
      <div>命中(AR) ${d.attackRating} · 防御 ${d.defense}</div>
      <div>伤害 ${d.damage[0].min}-${d.damage[0].max}</div>
      <div>抗性 火${d.resist.fire} 冰${d.resist.cold} 电${d.resist.lightning} 毒${d.resist.poison}</div>
      <div style="color:#ffd24a">金币 ${g.goldTotal}</div>`;

    // 装备槽
    this.equipEl.innerHTML = '';
    for (const slot of SLOT_ORDER) {
      const it = g.character.equipment[slot];
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerHTML = `<div class="s">${SLOT_LABEL[slot]}</div>` +
        (it ? `<span style="color:${RARITY_HEX[it.rarity]}">${it.name}</span>` : '<span style="opacity:.35">空</span>');
      if (it) {
        cell.addEventListener('pointerenter', () => this.showTip(it));
        cell.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it); g.unequip(slot); this.refresh(); });
      }
      this.equipEl.appendChild(cell);
    }

    // 背包
    this.bagEl.innerHTML = '';
    if (g.inventory.length === 0) this.bagEl.innerHTML = '<span style="opacity:.35">空</span>';
    g.inventory.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `<span style="color:${RARITY_HEX[it.rarity]}">${it.name}</span>`;
      el.addEventListener('pointerenter', () => this.showTip(it));
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.showTip(it); g.equip(i); this.refresh(); });
      this.bagEl.appendChild(el);
    });
  }
}
