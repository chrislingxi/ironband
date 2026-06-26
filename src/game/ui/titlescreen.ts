import type { CharClass } from '@game/data/schema.ts';

// 全屏哥特风标题 / 选职界面 (纯 DOM). 深色 + 金色, Cinzel/Georgia 衬线标题.
// 三张职业卡片, 点选后 hide() 并回调 onSelect(cls). 触屏友好, 适配安全区.

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
  #title .sub { margin:0 0 34px; font-family:Georgia,serif; font-style:italic; font-size:clamp(12px,3.4vw,17px);
    color:#a99877; letter-spacing:.05em; text-shadow:0 1px 3px #000; }
  #title .cards { display:flex; flex-wrap:wrap; gap:18px; justify-content:center; max-width:760px; padding:0 16px; }
  #title .card { width:200px; max-width:38vw; min-width:150px; padding:22px 16px 20px; border-radius:14px;
    background:linear-gradient(#241b12cc,#140d08cc); border:1px solid #6a5a3a; cursor:pointer;
    text-align:center; user-select:none; -webkit-user-select:none; pointer-events:auto;
    box-shadow:0 6px 20px #000a, 0 0 0 1px #0006 inset; transition:transform .08s ease, border-color .15s, box-shadow .15s; }
  #title .card:hover { border-color:#c79433; box-shadow:0 8px 26px #000c, 0 0 18px #c7943330; }
  #title .card:active { transform:scale(.95); }
  #title .card .ic { font-size:clamp(40px,9vw,58px); line-height:1; filter:drop-shadow(0 3px 6px #000a); }
  #title .card .nm { margin:14px 0 8px; font-family:Cinzel,Georgia,serif; font-weight:700;
    font-size:clamp(18px,4.4vw,22px); letter-spacing:.06em; color:#e7c66a; text-shadow:0 1px 3px #000; }
  #title .card .bl { font-size:clamp(11px,3vw,13px); line-height:1.5; color:#b8ab92; }
  #title .foot { position:absolute; bottom:calc(14px + env(safe-area-inset-bottom)); left:0; width:100%;
    text-align:center; font-size:11px; color:#6a5e48; letter-spacing:.08em; }
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

export class TitleScreen {
  private root: HTMLElement;

  // onSelect: 玩家点选某职业后触发的回调.
  constructor(private onSelect: (cls: CharClass) => void) {
    injectStyle();
    const root = document.createElement('div');
    root.id = 'title';
    root.innerHTML = `
      <h1>Ironband</h1>
      <p class="sub">选择你的命运</p>
      <div class="cards"></div>
      <div class="foot">点击卡片以踏入暗黑之地</div>`;
    const cardsEl = root.querySelector('.cards') as HTMLElement;

    for (const c of CLASS_CARDS) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="ic">${c.icon}</div>
        <div class="nm">${c.name}</div>
        <div class="bl">${c.blurb}</div>`;
      // pointerdown 即触发, 触屏更跟手; 阻止默认避免误触/选中.
      card.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        this.onSelect(c.cls);
      });
      cardsEl.appendChild(card);
    }

    this.root = root;
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
