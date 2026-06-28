// 任务日志面板: 哥特风全屏覆盖层, 列出所有任务及其状态/描述/奖励.
import { iconImg } from '@game/ui/icon.ts';
// 风格参考 hud.ts 的 injectStyle 写法, 触屏友好, 适配安全区.
import type { Quest } from '@game/world/quests.ts';
import { isComplete, type QuestProgress } from '@game/systems/quests/state.ts';

let styleInjected = false;
function injectStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
  #questlog { position:absolute; inset:0; z-index:50; display:none; pointer-events:auto;
    background:radial-gradient(120% 120% at 50% 0%, #2a1810f2, #0a0604f8);
    font-family:Georgia,"Songti SC",serif; color:#e8dcc0;
    padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  #questlog.open { display:block; }
  #questlog .panel { position:absolute; inset:0; display:flex; flex-direction:column;
    padding:18px 16px; box-sizing:border-box; }
  #questlog .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;
    border-bottom:1px solid #6a4f2a; padding-bottom:10px; }
  #questlog .title { font-size:20px; font-weight:800; color:#e8c878; letter-spacing:2px;
    text-shadow:0 2px 4px #000, 0 0 10px #c8902040; }
  #questlog .close { width:40px; height:40px; border-radius:8px; border:1px solid #6a4f2a;
    background:#1a1208cc; color:#e8dcc0; font-size:20px; line-height:38px; text-align:center;
    user-select:none; -webkit-user-select:none; }
  #questlog .close:active { transform:scale(.92); }
  #questlog .list { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:12px; }
  #questlog .q { background:#1c130acc; border:1px solid #5a431f; border-radius:10px; padding:12px 14px;
    box-shadow:0 2px 6px #000a inset; }
  #questlog .q.done { opacity:.5; }
  #questlog .qhead { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  #questlog .qname { font-size:16px; font-weight:700; color:#f0d89a; text-shadow:0 1px 2px #000; }
  #questlog .q.done .qname { text-decoration:line-through; color:#bdae8e; }
  #questlog .badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; white-space:nowrap; }
  #questlog .badge.active { background:#3a2a10; color:#ffd76b; border:1px solid #8a6a2a; }
  #questlog .badge.done { background:#1d3320; color:#8fe0a0; border:1px solid #2f6a3f; }
  #questlog .qobj { font-size:13px; line-height:1.5; color:#ffd76b; font-weight:600; }
  #questlog .q.done .qobj { color:#9a8a66; font-weight:400; }
  #questlog .qmore { margin-top:8px; border-top:1px dashed #5a431f55; padding-top:8px; }
  #questlog .qdesc { font-size:13px; line-height:1.5; color:#d8ccaa; margin-bottom:8px; }
  #questlog .qreward { font-size:12px; color:#c8a860; }
  #questlog .qreward b { color:#ffd76b; font-weight:700; }
  #questlog .empty { text-align:center; color:#9a8a66; font-size:13px; padding:30px 0; }
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// HTML 转义, 防止任务文本中的特殊字符破坏注入的标记.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class QuestLogPanel {
  /** 面板是否处于打开状态. */
  open = false;
  private root: HTMLElement;
  private listEl: HTMLElement;

  constructor(onClose: () => void) {
    injectStyle();
    const root = document.createElement('div');
    root.id = 'questlog';
    root.innerHTML = `
      <div class="panel">
        <div class="head">
          <div class="title">${iconImg('quest','📜',18)} 任务日志</div>
          <div class="close" role="button">✕</div>
        </div>
        <div class="list"></div>
      </div>`;
    document.body.appendChild(root);
    this.root = root;
    this.listEl = root.querySelector('.list') as HTMLElement;

    const closeBtn = root.querySelector('.close') as HTMLElement;
    const fire = (e: Event) => { e.preventDefault(); e.stopPropagation(); this.hide(); onClose(); };
    closeBtn.addEventListener('pointerdown', fire);
    // 点击面板外的暗色背景同样关闭.
    root.addEventListener('pointerdown', (e: Event) => {
      if (e.target === root) fire(e);
    });
  }

  /** 渲染并显示面板. 每次打开都依据最新进度重建列表. */
  show(quests: Quest[], progress: QuestProgress): void {
    this.render(quests, progress);
    this.open = true;
    this.root.classList.add('open');
  }

  /** 隐藏面板. */
  hide(): void {
    this.open = false;
    this.root.classList.remove('open');
  }

  // 依据任务数据与进度构建内部列表 DOM。
  // 默认只显示 任务名 + 一行目标 + 状态; 剧情/奖励折叠, 点击任务卡片展开。进行中置顶。
  private render(quests: Quest[], progress: QuestProgress): void {
    if (quests.length === 0) {
      this.listEl.innerHTML = `<div class="empty">暂无任务</div>`;
      return;
    }
    // 进行中在前, 已完成在后
    const sorted = [...quests].sort((a, b) => Number(isComplete(progress, a.id)) - Number(isComplete(progress, b.id)));
    this.listEl.innerHTML = sorted
      .map((q) => {
        const done = isComplete(progress, q.id);
        const badge = done
          ? `<span class="badge done">✓ 已完成</span>`
          : `<span class="badge active">进行中</span>`;
        return `
        <div class="q${done ? ' done' : ''}" data-id="${q.id}">
          <div class="qhead">
            <span class="qname">${esc(q.name)}</span>
            ${badge}
          </div>
          <div class="qobj">▸ ${esc(q.objective)}</div>
          <div class="qmore" style="display:none">
            <div class="qdesc">${esc(q.desc)}</div>
            <div class="qreward">奖励: <b>${esc(q.reward)}</b></div>
          </div>
        </div>`;
      })
      .join('');
    // 点击卡片展开/收起剧情详情
    this.listEl.querySelectorAll('.q').forEach((card) => {
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const more = card.querySelector('.qmore') as HTMLElement;
        more.style.display = more.style.display === 'none' ? 'block' : 'none';
      });
    });
  }
}
