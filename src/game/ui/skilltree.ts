import type { Game } from '@game/sim/Game.ts';
import type { SkillDef } from '@game/data/schema.ts';
import { CLASS_SKILLS, TAB_NAMES } from '@game/classes/registry.ts';
import { canInvest, pointsIn, requiredLevel } from '@game/classes/skilltree.ts';
import { SKILL_EXEC } from '@game/classes/exec.ts';
import { DIFFICULTIES } from '@game/systems/difficulty.ts';
import { skillIconHtml } from '@game/ui/icon.ts';

const DTYPE: Record<string, string> = { fire: '火', cold: '冰', lightning: '电', poison: '毒', magic: '魔', physical: '物理' };
const DIFF_LABEL: Record<string, string> = { normal: '普通', nightmare: '噩梦', hell: '地狱' };

// D2 式网格布局: 把一系(tab)的技能放进 3 列 × N 行(tier) 的网格, 前置链尽量同列, 便于连线。
interface Cell { row: number; col: number }
function layoutTab(list: SkillDef[], pos: Map<string, Cell>): number {
  const tiers = [...new Set(list.map((d) => d.tier))].sort((a, b) => a - b);
  let maxCol = 0;
  tiers.forEach((tier, rowIdx) => {
    const skills = list.filter((d) => d.tier === tier);
    const used = new Set<number>();
    const pending: SkillDef[] = [];
    // 第一遍: 有前置的技能放到首个前置所在列(若空)
    for (const sk of skills) {
      const pre = sk.prereqs.map((id) => pos.get(id)?.col).find((c) => c !== undefined);
      if (pre !== undefined && !used.has(pre)) { pos.set(sk.id, { row: rowIdx, col: pre }); used.add(pre); }
      else pending.push(sk);
    }
    // 第二遍: 其余技能依次填入空列
    for (const sk of pending) {
      let c = 0; while (used.has(c)) c++;
      pos.set(sk.id, { row: rowIdx, col: c }); used.add(c);
    }
    maxCol = Math.max(maxCol, ...[...used]);
  });
  return maxCol + 1;
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #skt { position:absolute; inset:0; display:none; background:radial-gradient(120% 90% at 50% 0%, #14121cf6, #07060afb); z-index:80; color:#e8e0d0;
    font-family:-apple-system,"PingFang SC",sans-serif;
    padding:max(16px,env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left)); overflow:auto; }
  #skt h3 { font-family:Georgia,serif; color:#ffd76b; font-size:17px; margin:2px 0 8px; letter-spacing:2px; text-shadow:0 2px 6px #000; }
  #skt .close { position:absolute; top:calc(12px + env(safe-area-inset-top)); right:calc(16px + env(safe-area-inset-right)); width:40px; height:40px; border-radius:9px; border:1px solid #54486a; background:#1a1626cc; display:flex; align-items:center; justify-content:center; font-size:20px; z-index:3; }
  #skt .top { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
  #skt .pts { color:#ffe08a; font-weight:800; }
  #skt .diff { display:flex; gap:6px; }
  #skt .diff button { padding:5px 10px; border-radius:6px; border:1px solid #4a4a58; background:#16161e; color:#ccc; font-size:12px; }
  #skt .diff button.on { background:#6a2a2a; border-color:#c05; color:#fff; }
  /* 技能键装载概览 */
  #skt .load { margin:4px 0 10px; padding:10px; border:1px solid #3a3a48; border-radius:9px; background:#100e18cc; }
  #skt .load h4 { font-family:Georgia,serif; color:#bcd; font-size:12px; margin:0 0 8px; }
  #skt .slotrow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  #skt .chip { font-size:12px; padding:4px 9px; border-radius:7px; border:1px solid #4a4a58; background:#16161e; color:#cbd; }
  #skt .chip.on { border-color:#ffd76b; background:#3a2c14; color:#fff; font-weight:700; }
  /* 选中详情 */
  #skt .detail { margin:8px 0 12px; padding:11px 13px; border:1px solid #5a431f; border-radius:11px; background:linear-gradient(#150f08,#0c0905); font-size:12px; line-height:1.7; min-height:40px; box-shadow:inset 0 1px 4px #000; }
  #skt .detail b { color:#ffe08a; }
  #skt .detail .up { color:#7bd66a; }
  #skt .detail .ctl { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:9px; }
  #skt .detail .inv { padding:7px 16px; border-radius:8px; border:1px solid #6a5a3a; background:radial-gradient(circle at 50% 20%,#e8c878,#a8842c); color:#1a1208; font-weight:800; font-size:13px; }
  #skt .detail .inv:disabled { opacity:.3; background:#2a2620; color:#888; }
  #skt .detail .asg { display:inline-flex; gap:4px; align-items:center; }
  #skt .detail .asg span { opacity:.65; font-size:11px; }
  #skt .detail .asg b { width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px;
    border:1px solid #6a5a3a; background:#1a1a24; color:#cbd; font-size:12px; font-weight:700; }
  #skt .detail .asg b.on { background:#3a2c14; border-color:#ffd76b; color:#fff; }
  /* 三系网格 */
  #skt .tabs { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; }
  #skt .tab { flex:1; min-width:236px; background:linear-gradient(#161320cc,#0d0b14cc); border:1px solid #3a3450; border-radius:12px; padding:10px 10px 12px; }
  #skt .tab h4 { font-family:Georgia,serif; color:#bcd; font-size:13px; margin:2px 0 10px; text-align:center; border-bottom:1px solid #3a3450; padding-bottom:5px; }
  #skt .grid { position:relative; display:grid; gap:14px 10px; justify-items:center; }
  #skt .grid svg.links { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0; overflow:visible; }
  #skt .sk { position:relative; z-index:1; width:54px; height:54px; border-radius:12px; display:flex; align-items:center; justify-content:center;
    font-size:25px; border:2px solid #34303f; background:radial-gradient(circle at 50% 32%,#23202e,#100e16 78%);
    box-shadow:0 2px 6px #000a, inset 0 1px 3px #ffffff10; cursor:pointer; transition:transform .07s; }
  #skt .sk:active { transform:scale(.92); }
  #skt .sk.learned { border-color:#c79433; box-shadow:0 0 0 1px #c7943355, 0 0 10px #c7943340; }
  #skt .sk.investable { border-color:#5a8a4a; }
  #skt .sk.sel { border-color:#ffd76b; box-shadow:0 0 12px #ffd76b88; }
  #skt .sk.locked { opacity:.38; filter:grayscale(.6); }
  #skt .sk .lv { position:absolute; right:-4px; bottom:-5px; min-width:20px; height:17px; padding:0 3px; border-radius:9px;
    background:#0c0a12; border:1px solid #6a5a3a; font-size:10px; font-weight:800; color:#ffe08a; display:flex; align-items:center; justify-content:center; line-height:1; }
  #skt .sk.maxed .lv { color:#7bd66a; border-color:#4a7a3a; }
  #skt .sk .plus { position:absolute; right:-7px; top:-7px; width:20px; height:20px; border-radius:50%;
    background:radial-gradient(circle at 50% 30%,#7be06a,#2c7a1c); border:1px solid #b6f0a0; color:#0a1808; font-size:14px; font-weight:900;
    display:flex; align-items:center; justify-content:center; line-height:1; box-shadow:0 1px 4px #000a; }
  #skt .nm { position:absolute; left:50%; transform:translateX(-50%); bottom:-13px; white-space:nowrap; font-size:9px; color:#c0b48a; text-shadow:0 1px 1px #000; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class SkillTreePanel {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private selectedId: string | null = null;
  open = false;

  constructor(private game: Game, onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'skt';
    this.root.innerHTML = `<div class="close">✕</div><h3>技能树</h3><div class="body"></div>`;
    document.body.appendChild(this.root);
    this.body = this.root.querySelector('.body') as HTMLElement;
    (this.root.querySelector('.close') as HTMLElement).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onClose(); });
    window.addEventListener('resize', () => { if (this.open) this.drawAllLinks(); });
  }

  show(): void { this.open = true; this.root.style.display = 'block'; this.refresh(); }
  hide(): void { this.open = false; this.root.style.display = 'none'; }

  refresh(): void {
    const g = this.game;
    const cls = g.character.cls;
    const defs = CLASS_SKILLS[cls];
    const tabNames = TAB_NAMES[cls];
    this.body.innerHTML = '';

    // 顶部: 可用点数 + 难度切换
    const top = document.createElement('div');
    top.className = 'top';
    top.innerHTML = `<span class="pts">可用技能点: ${g.skillPointsAvailable()}</span><span style="opacity:.6">·</span><span>难度</span>`;
    const diff = document.createElement('div');
    diff.className = 'diff';
    for (const d of DIFFICULTIES) {
      const b = document.createElement('button');
      const unlocked = g.isDifficultyUnlocked(d);
      b.textContent = unlocked ? DIFF_LABEL[d] : `🔒 ${DIFF_LABEL[d]}`;
      if (d === g.difficulty) b.classList.add('on');
      if (!unlocked) { b.disabled = true; b.title = '通关上一难度后解锁'; }
      else b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.setDifficulty(d); this.refresh(); });
      diff.appendChild(b);
    }
    top.appendChild(diff);
    this.body.appendChild(top);

    // 技能键装载概览
    this.body.appendChild(this.loadoutSection());

    // 选中技能详情 (含投点/装载操作)
    const detail = document.createElement('div');
    detail.className = 'detail';
    if (this.selectedId) this.fillDetail(detail, defs);
    else detail.innerHTML = '点击技能图标查看「本级/下一级」效果与解锁条件, 并在此投点 / 装载';
    this.body.appendChild(detail);

    // 三系网格树
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    for (let tab = 0; tab < 3; tab++) {
      const col = document.createElement('div');
      col.className = 'tab';
      col.innerHTML = `<h4>${tabNames[tab]}</h4>`;
      const list = defs.filter((d) => d.tab === tab);
      const pos = new Map<string, Cell>();
      const cols = layoutTab(list, pos);
      const grid = document.createElement('div');
      grid.className = 'grid';
      grid.style.gridTemplateColumns = `repeat(${cols}, 54px)`;
      // 连线层
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'links');
      grid.appendChild(svg);
      for (const def of list) {
        const cell = pos.get(def.id)!;
        const tile = this.skillTile(def, defs);
        tile.style.gridRow = String(cell.row + 1);
        tile.style.gridColumn = String(cell.col + 1);
        grid.appendChild(tile);
      }
      col.appendChild(grid);
      tabs.appendChild(col);
    }
    this.body.appendChild(tabs);
    // 等布局完成后绘制连线
    requestAnimationFrame(() => this.drawAllLinks());
  }

  // 为每个 tab 绘制 前置→技能 的连线 (基于实际 DOM 位置)。
  private drawAllLinks(): void {
    const defs = CLASS_SKILLS[this.game.character.cls];
    this.body.querySelectorAll('.grid').forEach((grid) => {
      const svg = grid.querySelector('svg.links') as SVGSVGElement | null;
      if (!svg) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const gr = (grid as HTMLElement).getBoundingClientRect();
      const tiles = new Map<string, DOMRect>();
      grid.querySelectorAll('.sk').forEach((el) => {
        const id = (el as HTMLElement).dataset.id;
        if (id) tiles.set(id, el.getBoundingClientRect());
      });
      for (const def of defs) {
        const to = tiles.get(def.id);
        if (!to) continue;
        const lvl = pointsIn(def.id, this.game.skillTree);
        for (const pid of def.prereqs) {
          const from = tiles.get(pid);
          if (!from) continue;
          const x1 = from.left + from.width / 2 - gr.left, y1 = from.bottom - gr.top;
          const x2 = to.left + to.width / 2 - gr.left, y2 = to.top - gr.top;
          const active = lvl > 0 || pointsIn(pid, this.game.skillTree) > 0;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const my = (y1 + y2) / 2;
          line.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
          line.setAttribute('fill', 'none');
          line.setAttribute('stroke', active ? '#c79433' : '#4a4458');
          line.setAttribute('stroke-width', active ? '2.4' : '1.6');
          if (!active) line.setAttribute('stroke-dasharray', '3 3');
          svg.appendChild(line);
        }
      }
    });
  }

  private fillDetail(el: HTMLElement, defs: SkillDef[]): void {
    const g = this.game;
    const def = defs.find((d) => d.id === this.selectedId);
    if (!def) { el.textContent = '点击技能图标查看效果'; return; }
    const lvl = pointsIn(def.id, g.skillTree);
    const exec = SKILL_EXEC[def.id];
    const lines = [`<b>${skillIconHtml(def.icon, 20)} ${def.name}</b> · ${def.passive ? '被动' : '主动'} · 等级 ${lvl}/${def.maxLevel}`];
    if (def.baseDamage) {
      const base = Math.max(1, lvl);
      const cur = def.baseDamage(base);
      const nxt = def.baseDamage(base + 1);
      lines.push(`基础伤害 <b>${cur[0]}-${cur[1]}</b>${lvl < def.maxLevel ? ` <span class="up">→ ${nxt[0]}-${nxt[1]} (下一级)</span>` : ''}${exec?.damageType ? ` · ${DTYPE[exec.damageType] ?? ''}系` : ''}`);
    }
    if (exec?.radius) lines.push(`作用范围 ${exec.radius} 格`);
    if (exec?.count) lines.push(`投射数 ${exec.count}`);
    if (exec?.stun) lines.push(`控制 ${exec.stun}s`);
    if (exec?.cooldown) lines.push(`冷却 ${exec.cooldown}s`);
    if (def.manaCost) lines.push(`法力消耗 ${def.manaCost(Math.max(1, lvl))}`);
    if (def.synergies?.length) lines.push(`<span style="opacity:.7">协同: 投点于 ${def.synergies.map((s) => defs.find((d) => d.id === s.skill)?.name ?? s.skill).join('/')} 进一步增强</span>`);
    const need: string[] = [`角色等级 ${requiredLevel(def)}`];
    for (const pid of def.prereqs) need.push(`${defs.find((d) => d.id === pid)?.name ?? pid} ≥1级`);
    lines.push(`<span style="opacity:.65">解锁: ${need.join(' + ')}</span>`);

    const investable = g.skillPointsAvailable() > 0 && canInvest(def, g.character.level, g.skillTree, defs);
    const canCast = !def.passive && g.canAssignSkill(def.id);
    const asg = canCast
      ? `<span class="asg"><span>装载到槽:</span>${[1, 2, 3].map((s) => `<b data-slot="${s}" class="${g.assignedSkills[s] === def.id ? 'on' : ''}">${s}</b>`).join('')}</span>`
      : '';
    el.innerHTML = lines.join('<br>') +
      `<div class="ctl"><button class="inv" ${investable ? '' : 'disabled'}>+ 投点</button>${asg}</div>`;

    const inv = el.querySelector('.inv') as HTMLButtonElement;
    inv.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (g.investSkill(def.id)) this.refresh(); });
    el.querySelectorAll('.asg b').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (g.assignSkill(Number((b as HTMLElement).dataset.slot), def.id)) this.refresh();
    }));
  }

  private loadoutSection(): HTMLElement {
    const g = this.game;
    const wrap = document.createElement('div');
    wrap.className = 'load';
    wrap.innerHTML = `<h4>⚔ 技能键 (槽0=普通攻击; 选中技能后在上方详情里装载到 ①②③)</h4>`;
    const row = document.createElement('div');
    row.className = 'slotrow';
    for (let slot = 0; slot < 4; slot++) {
      const key = g.skillKey(slot);
      const cell = document.createElement('span');
      cell.className = 'chip' + (slot === 0 ? ' on' : '');
      cell.innerHTML = key ? `${slot === 0 ? '🔒' : slot} ${skillIconHtml(key.icon, 18)}${key.name}` : `${slot} <span style="opacity:.5">空</span>`;
      if (slot >= 1 && key) {
        const x = document.createElement('span');
        x.textContent = ' ✕'; x.style.cssText = 'color:#d88;cursor:pointer';
        x.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.clearSkillSlot(slot); this.refresh(); });
        cell.appendChild(x);
      }
      row.appendChild(cell);
    }
    wrap.appendChild(row);
    return wrap;
  }

  private skillTile(def: SkillDef, defs: SkillDef[]): HTMLElement {
    const g = this.game;
    const lvl = pointsIn(def.id, g.skillTree);
    const investable = g.skillPointsAvailable() > 0 && canInvest(def, g.character.level, g.skillTree, defs);
    const locked = lvl === 0 && !investable;
    const maxed = lvl >= def.maxLevel;
    const tile = document.createElement('div');
    tile.className = 'sk' + (locked ? ' locked' : '') + (lvl > 0 ? ' learned' : '') + (investable ? ' investable' : '') +
      (maxed ? ' maxed' : '') + (this.selectedId === def.id ? ' sel' : '');
    tile.dataset.id = def.id;
    tile.innerHTML = `${skillIconHtml(def.icon, 30)}<span class="lv">${lvl}/${def.maxLevel}</span>${investable ? '<span class="plus">+</span>' : ''}<span class="nm">${def.name}</span>`;
    // 点图标主体 → 选中
    tile.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.selectedId = def.id; this.refresh(); });
    // 点右上 + → 直接投点
    const plus = tile.querySelector('.plus');
    if (plus) plus.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.selectedId = def.id;
      if (g.investSkill(def.id)) this.refresh(); else this.refresh();
    });
    return tile;
  }
}
