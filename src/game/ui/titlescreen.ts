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
  fantasy: string;
  tags: string[];
}

const CLASS_CARDS: ClassCard[] = [
  { cls: 'barbarian', icon: '🪓', name: '野蛮人', blurb: '近战狂战, 双手巨斧劈开血路', fantasy: '冲锋 · 流血 · 战吼', tags: ['近战', '坦度', '爆发'] },
  { cls: 'amazon', icon: '🏹', name: '亚马逊', blurb: '穿透箭雨, 冰控风筝, 远距离压制兽群', fantasy: '多重箭 · 冰冻箭 · 穿透构筑', tags: ['推荐', '远程', '控场'] },
  { cls: 'sorceress', icon: '🔮', name: '法师', blurb: '操弄火冰雷, 以元素法术焚尽群敌', fantasy: '冰控 · 火墙 · 雷暴', tags: ['法术', 'AOE', '脆皮'] },
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
    align-items:center; justify-content:safe center; pointer-events:auto; overflow-y:auto; -webkit-overflow-scrolling:touch;
    background:
      linear-gradient(90deg,#020202e8 0%,#0008 22%,#0004 50%,#0008 78%,#020202e8 100%),
      radial-gradient(60% 54% at 50% 18%, #22150a20 0%, transparent 62%),
      url("assets/ui/title-bg.png"),
      linear-gradient(180deg, #080706 0%, #100b0a 54%, #020202 100%);
    background-size:cover, cover, cover, cover;
    background-position:center, center, center, center;
    font-family:-apple-system,"PingFang SC",sans-serif; color:#e8e0d0;
    padding:calc(12px + env(safe-area-inset-top)) env(safe-area-inset-right) calc(40px + env(safe-area-inset-bottom)) env(safe-area-inset-left); }
  #title::before { content:""; position:absolute; inset:0; pointer-events:none;
    background:
      linear-gradient(180deg,#0008 0%,#00000018 24%,#00000026 55%,#000d 100%),
      radial-gradient(54% 35% at 50% 9%,#fff0b50e,transparent 65%),
      radial-gradient(82% 70% at 50% 50%,transparent 24%,#000c 100%);
    mix-blend-mode:normal; }
  #title::after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.28;
    background:
      linear-gradient(90deg, transparent 0 47px, #ffffff08 48px 49px, transparent 50px),
      repeating-linear-gradient(115deg, transparent 0 18px, #ffffff05 19px 20px); }
  #title h1 { margin:0 0 6px; font-family:Cinzel,Georgia,"Times New Roman",serif; font-weight:800;
    position:relative; z-index:1; font-size:clamp(40px,10vw,88px); letter-spacing:.14em; text-transform:uppercase;
    color:#e7c66a;
    background:linear-gradient(#f7e3a0,#c79433 55%,#8a611c); -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent; text-shadow:0 3px 10px #000a; filter:drop-shadow(0 0 18px #8b4b1690); }
  #title .sub { margin:0 0 22px; position:relative; z-index:1; font-family:Georgia,serif; font-style:italic; font-size:clamp(12px,3.4vw,17px);
    color:#a99877; letter-spacing:.05em; text-shadow:0 1px 3px #000; }
  #title .body { position:relative; z-index:1; width:100%; display:flex; justify-content:center; }
  #title .cards { display:grid; grid-template-columns:minmax(170px, .78fr) minmax(230px, 1.25fr) minmax(170px, .78fr);
    gap:14px; justify-content:center; align-items:stretch; width:min(960px,94vw); padding:0 10px; }
  #title .card { min-height:360px; position:relative; overflow:hidden; padding:18px 16px 16px; border-radius:10px;
    background:
      linear-gradient(180deg,#26170ff0,#080605f7),
      url("assets/ui/panel.png");
    background-size:auto, 240px 240px;
    border:1px solid #7a5a2b; cursor:pointer;
    text-align:left; user-select:none; -webkit-user-select:none; pointer-events:auto;
    box-shadow:0 20px 52px #000f, 0 0 0 1px #000 inset, inset 0 1px 0 #ffe9a025;
    transition:transform .08s ease, border-color .15s, box-shadow .15s, filter .15s; }
  #title .card::before { content:""; position:absolute; inset:0;
    background:
      radial-gradient(circle at 50% 18%,#d0a14b22,transparent 42%),
      linear-gradient(180deg,#00000008 0%,transparent 35%,#000e 100%);
    pointer-events:none; z-index:1; }
  #title .card::after { content:""; position:absolute; inset:10px; border:1px solid #c49a4a33; border-radius:7px; pointer-events:none; z-index:2; }
  #title .card:hover { border-color:#d6a64a; box-shadow:0 22px 58px #000, 0 0 30px #c7943345, inset 0 1px 0 #ffe9a030; filter:brightness(1.08); }
  #title .card:active { transform:scale(.975); }
  #title .card.amazon { min-height:410px; border-color:#d6a64a; background:linear-gradient(180deg,#2b2118f0,#090807f4); }
  #title .card.amazon::before { background:radial-gradient(circle at 48% 26%,#45f1d13a,transparent 39%), radial-gradient(circle at 54% 45%,#b0181840,transparent 50%), linear-gradient(180deg,transparent 38%,#000e 100%); }
  #title .card .ic { position:absolute; inset:0 0 86px; display:flex; align-items:flex-end; justify-content:center; font-size:clamp(44px,9vw,64px); line-height:1; filter:drop-shadow(0 12px 18px #000); }
  #title .card .ic img.cimg { height:min(262px,38vh); width:auto; max-width:128%; object-fit:contain; transform:translateY(18px); }
  #title .card.amazon .ic img.cimg { height:min(338px,48vh); transform:translateY(20px) scale(1.08); }
  #title .card .copy { position:absolute; left:16px; right:16px; bottom:20px; z-index:2; }
  #title .card .tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
  #title .card .tag { padding:2px 7px; border-radius:4px; border:1px solid #71582f; background:#080706cc; color:#e2c36e; font-size:10px; letter-spacing:.08em; }
  #title .card.amazon .tag:first-child { border-color:#6ee6ce; color:#9fffe9; box-shadow:0 0 10px #40e8c055; }
  #title .card .nm { margin:0 0 5px; font-family:Cinzel,Georgia,serif; font-weight:800;
    font-size:clamp(21px,4vw,28px); letter-spacing:.08em; color:#f1d889; text-shadow:0 2px 6px #000; }
  #title .card .fantasy { font-size:12px; color:#d7b66a; margin-bottom:6px; text-shadow:0 1px 2px #000; }
  #title .card .bl { font-size:clamp(11px,2.4vw,13px); line-height:1.55; color:#c8bdad; text-shadow:0 1px 2px #000; }
  #title .foot { position:absolute; bottom:calc(14px + env(safe-area-inset-bottom)); left:0; width:100%;
    text-align:center; font-size:11px; color:#6a5e48; letter-spacing:.08em; pointer-events:none; }
  /* 短屏(横屏/小机)紧凑职业卡, 防越界/与页脚重叠堆叠 */
  @media (max-height:620px) {
    #title h1 { font-size:clamp(30px,7vw,52px); margin-bottom:2px; }
    #title .sub { margin-bottom:12px; }
    #title .cards { gap:10px; grid-template-columns:1fr 1.25fr 1fr; }
    #title .card, #title .card.amazon { min-height:236px; padding:12px; border-radius:14px; }
    #title .card .ic { inset:0 0 62px; } #title .card .ic img.cimg { height:150px; }
    #title .card.amazon .ic img.cimg { height:190px; }
    #title .card .copy { left:12px; right:12px; bottom:14px; }
    #title .card .nm { font-size:clamp(16px,3.4vw,22px); }
    #title .card .fantasy, #title .card .bl { display:none; }
    #title .foot { display:none; }
  }
  @media (max-width:680px) and (orientation:portrait) {
    #title { justify-content:flex-start; }
    #title .cards { grid-template-columns:1fr; width:min(420px,92vw); }
    #title .card, #title .card.amazon { min-height:190px; }
    #title .card .ic { inset:-8px 0 -6px auto; width:50%; align-items:center; }
    #title .card .ic img.cimg, #title .card.amazon .ic img.cimg { height:202px; transform:translate(10px, 10px); }
    #title .card .copy { right:45%; bottom:18px; }
  }
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
  #title .nbportrait img.cimg { height:104px; width:auto; object-fit:contain; filter:drop-shadow(0 4px 8px #000b); }
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
      <div class="foot">暗夜行者 · 单机暗黑动作 RPG</div>`;
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
        <div class="del" title="删除"><img src="assets/icon/trash-can.svg" alt="" style="width:16px;height:16px;vertical-align:middle;opacity:.85" onerror="this.style.display='none';this.insertAdjacentText('afterend','🗑')"></div>`;
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
      card.className = `card ${c.cls}`;
      card.innerHTML = `
        <div class="ic">${classIconHtml(c.cls)}</div>
        <div class="copy">
          <div class="tags">${c.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
          <div class="nm">${c.name}</div>
          <div class="fantasy">${escapeHtml(c.fantasy)}</div>
          <div class="bl">${escapeHtml(c.blurb)}</div>
        </div>`;
      onTap(card, () => this.renderNameEntry(c.cls));
      cardsEl.appendChild(card);
    }
    if (this.slots.length > 0) this.addBack(() => this.renderSlots());
  }

  // --- 屏 3: 命名 ---
  private renderNameEntry(cls: CharClass): void {
    this.body.innerHTML = `
      <div class="namebox">
        <div class="nbportrait" style="font-size:46px">${classIconHtml(cls)}</div>
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
