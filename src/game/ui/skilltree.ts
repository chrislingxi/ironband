import type { Game } from '@game/sim/Game.ts';
import type { SkillDef } from '@game/data/schema.ts';
import { CLASS_SKILLS, TAB_NAMES } from '@game/classes/registry.ts';
import { canInvest, pointsIn, requiredLevel } from '@game/classes/skilltree.ts';
import { DIFFICULTIES } from '@game/systems/difficulty.ts';

const DIFF_LABEL: Record<string, string> = { normal: '普通', nightmare: '噩梦', hell: '地狱' };

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #skt { position:absolute; inset:0; display:none; background:#0c0c12ee; z-index:80; color:#e8e0d0;
    font-family:-apple-system,"PingFang SC",sans-serif; padding:max(16px,env(safe-area-inset-top)) 14px 16px; overflow:auto; }
  #skt h3 { font-family:Georgia,serif; color:#ffd76b; font-size:16px; margin:4px 0; }
  #skt .close { position:absolute; top:12px; right:16px; width:40px; height:40px; border-radius:8px; background:#2a2a36; display:flex; align-items:center; justify-content:center; font-size:22px; }
  #skt .top { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
  #skt .pts { color:#ffe08a; font-weight:700; }
  #skt .diff { display:flex; gap:6px; }
  #skt .diff button { padding:5px 10px; border-radius:6px; border:1px solid #4a4a58; background:#16161e; color:#ccc; font-size:12px; }
  #skt .diff button.on { background:#6a2a2a; border-color:#c05; color:#fff; }
  #skt .tabs { display:flex; gap:12px; flex-wrap:wrap; }
  #skt .tab { flex:1; min-width:240px; }
  #skt .tab h4 { font-family:Georgia,serif; color:#bcd; font-size:13px; margin:6px 0; border-bottom:1px solid #333; }
  #skt .sk { display:flex; align-items:center; gap:8px; padding:6px; border:1px solid #2e2e3a; border-radius:7px; margin-bottom:6px; background:#14141c; }
  #skt .sk.locked { opacity:.4; }
  #skt .sk .ic { font-size:20px; width:26px; text-align:center; }
  #skt .sk .nm { flex:1; font-size:12px; }
  #skt .sk .nm small { opacity:.6; }
  #skt .sk .lv { font-size:12px; color:#ffe08a; min-width:42px; text-align:right; }
  #skt .sk .add { width:30px; height:30px; border-radius:6px; border:1px solid #6a5a3a; background:#23231a; color:#ffe08a; font-size:18px; font-weight:700; }
  #skt .sk .add:disabled { opacity:.25; }
  #skt .load { margin:6px 0 12px; padding:10px; border:1px solid #3a3a48; border-radius:9px; background:#101018; }
  #skt .load h4 { font-family:Georgia,serif; color:#bcd; font-size:13px; margin:0 0 8px; }
  #skt .slotrow { display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  #skt .slotlbl { font-size:12px; color:#ffd76b; width:46px; }
  #skt .chips { display:flex; gap:6px; flex-wrap:wrap; }
  #skt .chip { font-size:12px; padding:4px 9px; border-radius:7px; border:1px solid #4a4a58; background:#16161e; color:#cbd; }
  #skt .chip.on { border-color:#ffd76b; background:#3a2c14; color:#fff; font-weight:700; }
  #skt .chip.dis { opacity:.3; }
  #skt .assign { margin-left:6px; display:inline-flex; gap:3px; }
  #skt .assign b { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:4px;
    border:1px solid #6a5a3a; background:#1a1a24; color:#cbd; font-size:11px; font-weight:700; cursor:pointer; }
  #skt .assign b.on { background:#3a2c14; border-color:#ffd76b; color:#fff; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class SkillTreePanel {
  readonly root: HTMLElement;
  private body: HTMLElement;
  open = false;

  constructor(private game: Game, onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'skt';
    this.root.innerHTML = `<div class="close">✕</div><h3>技能树</h3><div class="body"></div>`;
    document.body.appendChild(this.root);
    this.body = this.root.querySelector('.body') as HTMLElement;
    (this.root.querySelector('.close') as HTMLElement).addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); onClose();
    });
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
      if (!unlocked) { b.classList.add('locked'); b.disabled = true; b.title = '通关上一难度后解锁'; }
      else b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.setDifficulty(d); this.refresh(); });
      diff.appendChild(b);
    }
    top.appendChild(diff);
    this.body.appendChild(top);

    // 技能键装载: 4 个槽各可绑定任意"已学(投过点)"的可施放技能
    this.body.appendChild(this.loadoutSection());

    // 三系
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    for (let tab = 0; tab < 3; tab++) {
      const col = document.createElement('div');
      col.className = 'tab';
      col.innerHTML = `<h4>${tabNames[tab]}</h4>`;
      const list = defs.filter((d) => d.tab === tab).sort((a, b) => a.tier - b.tier);
      for (const def of list) {
        col.appendChild(this.skillRow(def, defs));
      }
      tabs.appendChild(col);
    }
    this.body.appendChild(tabs);
  }

  // 技能键装载概览: 槽0=普通攻击(锁定), 槽1-3=当前绑定或"空"(可一键清空)。
  // 指派操作在下方技能树每行的 [1][2][3] 按钮完成 (已学主动技才出现)。
  private loadoutSection(): HTMLElement {
    const g = this.game;
    const wrap = document.createElement('div');
    wrap.className = 'load';
    wrap.innerHTML = `<h4>⚔ 技能键 (槽0=普通攻击; 槽1-3在下方技能上点 ①②③ 装载)</h4>`;
    const row = document.createElement('div');
    row.className = 'slotrow';
    for (let slot = 0; slot < 4; slot++) {
      const key = g.skillKey(slot);
      const cell = document.createElement('span');
      cell.className = 'chip' + (slot === 0 ? ' on' : '');
      cell.innerHTML = key ? `${slot === 0 ? '🔒' : slot} ${key.icon}${key.name}` : `${slot} <span style="opacity:.5">空</span>`;
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

  private skillRow(def: SkillDef, defs: SkillDef[]): HTMLElement {
    const g = this.game;
    const lvl = pointsIn(def.id, g.skillTree);
    const investable = g.skillPointsAvailable() > 0 && canInvest(def, g.character.level, g.skillTree, defs);
    const locked = lvl === 0 && !investable;
    const row = document.createElement('div');
    row.className = 'sk' + (locked ? ' locked' : '');
    // 已学的主动技 (可施放) 显示 ①②③ 装载按钮
    const canCast = !def.passive && g.canAssignSkill(def.id);
    const assignBtns = canCast
      ? `<span class="assign">${[1, 2, 3].map((s) => `<b data-slot="${s}" class="${g.assignedSkills[s] === def.id ? 'on' : ''}">${s}</b>`).join('')}</span>`
      : '';
    row.innerHTML =
      `<div class="ic">${def.icon}</div>` +
      `<div class="nm">${def.name}${assignBtns}<br><small>需 Lv${requiredLevel(def)}${def.prereqs.length ? ' · 前置:' + def.prereqs.length + '项' : ''}</small></div>` +
      `<div class="lv">${lvl}/${def.maxLevel}</div>`;
    // 绑定装载按钮
    row.querySelectorAll('.assign b').forEach((el) => el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (g.assignSkill(Number((el as HTMLElement).dataset.slot), def.id)) this.refresh();
    }));
    const add = document.createElement('button');
    add.className = 'add';
    add.textContent = '+';
    add.disabled = !investable;
    add.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (g.investSkill(def.id)) this.refresh();
    });
    row.appendChild(add);
    return row;
  }
}
