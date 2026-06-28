import type { CharClass, Difficulty } from '@game/data/schema.ts';
import type { SlotMeta } from '@game/systems/save/index.ts';

// 全屏哥特风标题 + 存档槽/选职/命名流程 (纯 DOM). 深色 + 金色, Cinzel/Georgia 衬线.
// 流程: 存档槽列表 → (续玩直接开始) | (新建: 选职 → 命名). 触屏友好, 适配安全区.

/** 续玩既有存档。 */
export interface BootContinue {
  kind: 'continue';
  slotId: string;
}
/** 新建角色 (已选职业 + 命名 + 分配的槽位)。 */
export interface BootNew {
  kind: 'new';
  cls: CharClass;
  name: string;
  slotId: string;
}
/** 开局选择结果。 */
export type BootChoice = BootContinue | BootNew;

// 职业卡片元数据: 图标(emoji) + 专名 + 一句原创简介.
interface ClassCard {
  cls: CharClass;
  icon: string;
  name: string;
  blurb: string;
}

const CLASS_CARDS: ClassCard[] = [
  { cls: 'barbarian', icon: '🪓', name: '野蛮人', blurb: '近战狂战, 双手巨斧劈开血路' },
  { cls: 'amazon', icon: '🏹', name: '亚马逊', blurb: '弓与标枪, 远近皆致命的女猎手' },
  { cls: 'sorceress', icon: '🔮', name: '法师', blurb: '操弄火冰雷, 以元素法术焚尽群敌' },
];

const CLASS_ICON: Record<CharClass, string> = {
  barbarian: '🪓',
  amazon: '🏹',
  sorceress: '🔮',
};
const CLASS_NAME: Record<CharClass, string> = {
  barbarian: '野蛮人',
  amazon: '亚马逊',
  sorceress: '法师',
};
// 去AI感: 职业卡/存档槽用真实角色立绘(assets/char/<cls>.png)替 emoji; 缺图回退 emoji。
function classIconHtml(cls: CharClass): string {
  const emoji = CLASS_ICON[cls];
  return `<img class="cimg" src="assets/char/${cls}.png" alt="" `
    + `onerror="this.style.display='none';this.insertAdjacentText('afterend','${emoji}')">`;
}
const DIFF_NAME: Record<Difficulty, string> = {
  normal: '普通',
  nightmare: '噩梦',
  hell: '地狱',
};

let styleInjected = false;
function injectStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
  #title { position:absolute; inset:0; z-index:50; display:flex; flex-direction:column;
    align-items:center; justify-content:center; pointer-events:auto; overflow:hidden;
    background:radial-gradient(120% 90% at 50% 0%, #2a2018 0%, #160f0a 55%, #060403 100%);
    font-family:-apple-system,"PingFang SC",sans-serif; color:#e8e0d0;
    padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  #title h1 { margin:0 0 6px; font-family:Cinzel,Georgia,"Times New Roman",serif; font-weight:800;
    font-size:clamp(40px,11vw,84px); letter-spacing:.18em; text-transform:uppercase;
    color:#e7c66a;
    background:linear-gradient(#f7e3a0,#c79433 55%,#8a611c); -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent; text-shadow:0 3px 10px #000a; }
  #title .sub { margin:0 0 28px; font-family:Georgia,serif; font-style:italic; font-size:clamp(12px,3.4vw,17px);
    color:#a99877; letter-spacing:.05em; text-shadow:0 1px 3px #000; }
  #title .cards { display:flex; flex-wrap:wrap; gap:18px; justify-content:center; max-width:760px; padding:0 16px; }
  #title .card { width:200px; max-width:38vw; min-width:150px; padding:22px 16px 20px; border-radius:14px;
    background:linear-gradient(#241b12cc,#140d08cc); border:1px solid #6a5a3a; cursor:pointer;
    text-align:center; user-select:none; -webkit-user-select:none; pointer-events:auto;
    box-shadow:0 6px 20px #000a, 0 0 0 1px #0006 inset; transition:transform .08s ease, border-color .15s, box-shadow .15s; }
  #title .card:hover { border-color:#c79433; box-shadow:0 8px 26px #000c, 0 0 18px #c7943330; }
  #title .card:active { transform:scale(.95); }
  #title .card .ic { height:84px; display:flex; align-items:center; justify-content:center; font-size:clamp(40px,9vw,58px); line-height:1; filter:drop-shadow(0 4px 8px #000b); }
  #title .card .ic img.cimg { height:90px; width:auto; max-width:100%; object-fit:contain; }
  #title .card .nm { margin:14px 0 8px; font-family:Cinzel,Georgia,serif; font-weight:700;
    font-size:clamp(18px,4.4vw,22px); letter-spacing:.06em; color:#e7c66a; text-shadow:0 1px 3px #000; }
  #title .card .bl { font-size:clamp(11px,3vw,13px); line-height:1.5; color:#b8ab92; }
  #title .foot { position:absolute; bottom:calc(14px + env(safe-area-inset-bottom)); left:0; width:100%;
    text-align:center; font-size:11px; color:#6a5e48; letter-spacing:.08em; }
  /* --- 存档槽列表 --- */
  #title .slots { display:flex; flex-direction:column; gap:12px; width:min(440px,86vw); max-height:62vh; overflow:auto;
    -webkit-overflow-scrolling:touch; padding:2px; }
  #title .slot { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:12px;
    background:linear-gradient(#241b12cc,#140d08cc); border:1px solid #6a5a3a; cursor:pointer; pointer-events:auto;
    user-select:none; -webkit-user-select:none; transition:border-color .15s, box-shadow .15s; }
  #title .slot:hover { border-color:#c79433; box-shadow:0 0 16px #c7943322; }
  #title .slot:active { transform:scale(.98); }
  #title .slot.new { border-style:dashed; justify-content:center; color:#c79433; font-weight:700; }
  #title .slot .sic { width:44px; height:44px; display:flex; align-items:center; justify-content:center; font-size:34px; line-height:1; filter:drop-shadow(0 2px 4px #000a); }
  #title .slot .sic img.cimg { height:44px; width:auto; object-fit:contain; }
  #title .slot .meta { flex:1; min-width:0; text-align:left; }
  #title .slot .meta .snm { font-family:Cinzel,Georgia,serif; font-size:18px; color:#e7c66a; font-weight:700;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #title .slot .meta .sde { font-size:12px; color:#b8ab92; margin-top:3px; }
  #title .slot .del { font-size:20px; color:#7a5a3a; padding:6px 8px; border-radius:8px; pointer-events:auto; }
  #title .slot .del:hover { color:#d8604a; background:#0006; }
  /* --- 命名输入 --- */
  #title .namebox { display:flex; flex-direction:column; align-items:center; gap:18px; width:min(380px,84vw); }
  #title .namebox input { width:100%; box-sizing:border-box; padding:14px 16px; font-size:18px; text-align:center;
    border-radius:12px; border:1px solid #6a5a3a; background:#140d08; color:#e8e0d0; outline:none;
    font-family:Cinzel,Georgia,serif; }
  #title .namebox input:focus { border-color:#c79433; box-shadow:0 0 16px #c7943333; }
  #title .btn { padding:13px 30px; border-radius:12px; border:1px solid #6a5a3a; cursor:pointer; pointer-events:auto;
    background:linear-gradient(#3a2c18,#241a0e); color:#e7c66a; font-family:Cinzel,Georgia,serif; font-weight:700;
    font-size:16px; letter-spacing:.06em; user-select:none; -webkit-user-select:none; }
  #title .btn:hover { border-color:#c79433; box-shadow:0 0 16px #c7943333; }
  #title .btn:active { transform:scale(.96); }
  #title .btn.ghost { background:none; color:#a99877; border-color:#4a3f2a; }
  #title .back { position:absolute; top:calc(14px + env(safe-area-inset-top)); left:calc(14px + env(safe-area-inset-left));
    font-size:15px; color:#a99877; cursor:pointer; pointer-events:auto; padding:8px 12px; border-radius:8px; user-select:none; }
  #title .back:hover { color:#e7c66a; background:#0006; }
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// 触屏跟手的点击绑定: pointerdown 即触发, 阻止默认避免误触/选中.
function onTap(el: HTMLElement, fn: (e: PointerEvent) => void): void {
  el.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn(e);
  });
}

export class TitleScreen {
  private root: HTMLElement;
  private body: HTMLElement;

  /**
   * @param slots    已有存档槽摘要 (列表展示, 点击续玩)
   * @param freeSlot 下一个可用空槽 (null 表示已满, 不能再新建)
   * @param onStart  玩家完成选择后回调 (续玩或新建)
   * @param onDelete 玩家删除某槽位的回调 (调用方负责落库后刷新 slots 并重渲染)
   */
  constructor(
    private slots: SlotMeta[],
    private freeSlot: string | null,
    private onStart: (c: BootChoice) => void,
    private onDelete?: (slotId: string) => void,
  ) {
    injectStyle();
    const root = document.createElement('div');
    root.id = 'title';
    root.innerHTML = `
      <h1>Ironband</h1>
      <p class="sub">选择你的命运</p>
      <div class="body"></div>
      <div class="foot">暗夜行者 · 单机 Q 版动作 RPG</div>`;
    this.root = root;
    this.body = root.querySelector('.body') as HTMLElement;
    this.renderSlots();
  }

  // --- 屏 1: 存档槽列表 ---
  private renderSlots(): void {
    // 无任何存档时直接进入新建流程, 省一次点击。
    if (this.slots.length === 0) {
      this.renderClassSelect();
      return;
    }
    this.body.innerHTML = `<div class="slots"></div>`;
    const list = this.body.querySelector('.slots') as HTMLElement;

    for (const s of this.slots) {
      const row = document.createElement('div');
      row.className = 'slot';
      row.innerHTML = `
        <div class="sic">${classIconHtml(s.cls)}</div>
        <div class="meta">
          <div class="snm">${escapeHtml(s.name)}</div>
          <div class="sde">${CLASS_NAME[s.cls]} · Lv ${s.level} · ${DIFF_NAME[s.difficulty]}</div>
        </div>
        <div class="del" title="删除">🗑</div>`;
      onTap(row, () => {
        this.hide();
        this.onStart({ kind: 'continue', slotId: s.slotId });
      });
      const del = row.querySelector('.del') as HTMLElement;
      onTap(del, (e) => {
        e.stopPropagation();
        if (confirm(`删除存档「${s.name}」? 此操作不可撤销。`)) {
          this.slots = this.slots.filter((x) => x.slotId !== s.slotId);
          if (!this.freeSlot) this.freeSlot = s.slotId; // 删后腾出空位
          this.onDelete?.(s.slotId);
          this.renderSlots();
        }
      });
      list.appendChild(row);
    }

    if (this.freeSlot) {
      const add = document.createElement('div');
      add.className = 'slot new';
      add.textContent = '＋ 新建角色';
      onTap(add, () => this.renderClassSelect());
      list.appendChild(add);
    }
  }

  // --- 屏 2: 选职业 ---
  private renderClassSelect(): void {
    this.body.innerHTML = `<div class="cards"></div>`;
    const cardsEl = this.body.querySelector('.cards') as HTMLElement;
    for (const c of CLASS_CARDS) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="ic">${classIconHtml(c.cls)}</div>
        <div class="nm">${c.name}</div>
        <div class="bl">${c.blurb}</div>`;
      onTap(card, () => this.renderNameEntry(c.cls));
      cardsEl.appendChild(card);
    }
    if (this.slots.length > 0) this.addBack(() => this.renderSlots());
  }

  // --- 屏 3: 命名 ---
  private renderNameEntry(cls: CharClass): void {
    this.body.innerHTML = `
      <div class="namebox">
        <div style="font-size:46px">${CLASS_ICON[cls]}</div>
        <input maxlength="12" placeholder="给${CLASS_NAME[cls]}起个名字" />
        <button class="btn">踏入暗黑之地</button>
      </div>`;
    const input = this.body.querySelector('input') as HTMLInputElement;
    const btn = this.body.querySelector('.btn') as HTMLElement;
    const slotId = this.freeSlot ?? 'slot0';
    const start = (): void => {
      const name = input.value.trim() || CLASS_NAME[cls];
      this.hide();
      this.onStart({ kind: 'new', cls, name, slotId });
    };
    onTap(btn, start);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') start();
    });
    this.addBack(() => this.renderClassSelect());
    setTimeout(() => input.focus(), 50);
  }

  private addBack(fn: () => void): void {
    const back = document.createElement('div');
    back.className = 'back';
    back.textContent = '‹ 返回';
    onTap(back, fn);
    this.root.appendChild(back);
  }

  // 挂载到 body 并显示. 重复调用安全 (已挂载则忽略).
  show(): void {
    if (!this.root.isConnected) document.body.appendChild(this.root);
  }

  // 从 DOM 移除. 重复调用安全.
  hide(): void {
    if (this.root.isConnected) this.root.remove();
  }
}

// 防止角色名里的尖括号破坏 innerHTML。
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
