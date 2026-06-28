// 世界地图: 点击小地图弹出的全屏关卡链路图。
// 按幕分组展示所有区域, 标注 当前区/已激活航点/Boss区/城镇;
// 点击"已激活航点"节点直接传送 (复用航点传送), 解决"看不到全局、传送找不到"的问题。

export interface WorldArea {
  id: string;
  name: string;
  act: number;
  isTown: boolean;
  waypoint: boolean;
  isBoss: boolean;
}

export interface WorldMapState {
  currentId: string;
  discovered: Set<string>; // 已激活(可传送)的航点区域
  areas: WorldArea[];      // 全部区域 (按推进顺序)
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #worldmap { position:absolute; inset:0; z-index:90; display:none; background:#05060bf2; color:#e8e0d0;
    font-family:-apple-system,"PingFang SC",sans-serif; overflow:auto;
    padding:max(16px,env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left)); }
  #worldmap.show { display:block; }
  #worldmap .x { position:absolute; top:calc(12px + env(safe-area-inset-top)); right:calc(16px + env(safe-area-inset-right)); width:40px; height:40px; border-radius:8px; background:#2a2a36;
    display:flex; align-items:center; justify-content:center; font-size:22px; z-index:2; }
  #worldmap h2 { font-family:Georgia,serif; color:#ffd76b; font-size:18px; text-align:center; margin:4px 0 4px; letter-spacing:2px; }
  #worldmap .hint { text-align:center; font-size:12px; color:#9a8a66; margin-bottom:12px; }
  #worldmap .act { margin:0 0 16px; }
  #worldmap .acttitle { font-family:Georgia,serif; font-size:15px; color:#c79433; letter-spacing:3px; margin:0 2px 8px; border-bottom:1px solid #5a431f55; padding-bottom:4px; }
  #worldmap .row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
  #worldmap .node { padding:8px 11px; border-radius:9px; border:1px solid #3a3a48; background:#16161e; font-size:13px;
    color:#b8b0a0; position:relative; white-space:nowrap; }
  #worldmap .node.wp { color:#cfe6ff; border-color:#4a6a8a; cursor:pointer; }
  #worldmap .node.wp::before { content:"❖ "; color:#9fc7ff; }
  #worldmap .node.wp:active { transform:scale(.96); background:#1c2630; }
  #worldmap .node.town { border-color:#8a6a2a; background:#241a10; color:#ffd8a0; }
  #worldmap .node.town::before { content:"🏛 "; }
  #worldmap .node.boss::after { content:" ☠"; color:#ff6a5a; }
  #worldmap .node.current { border-color:#ffd76b; box-shadow:0 0 0 1px #ffd76b, 0 0 12px #ffd76b55; color:#fff; font-weight:700; }
  #worldmap .node .you { position:absolute; top:-9px; left:50%; transform:translateX(-50%); font-size:9px;
    color:#1a1208; background:#ffd76b; border-radius:6px; padding:0 5px; white-space:nowrap; }
  #worldmap .arrow { color:#5a5040; font-size:12px; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class WorldMapPanel {
  readonly root: HTMLElement;
  open = false;

  constructor(private onTravel: (id: string) => void, private onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'worldmap';
    this.root.innerHTML = `<div class="x">✕</div><h2>世界地图</h2><div class="hint">❖ 已点亮航点可点击传送 · 🏛 城镇 · ☠ Boss</div><div class="body"></div>`;
    document.body.appendChild(this.root);
    (this.root.querySelector('.x') as HTMLElement).addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); this.hide(); this.onClose();
    });
  }

  show(state: WorldMapState): void {
    const body = this.root.querySelector('.body') as HTMLElement;
    body.innerHTML = '';
    const acts = [...new Set(state.areas.map((a) => a.act))].sort((a, b) => a - b);
    for (const act of acts) {
      const sec = document.createElement('div');
      sec.className = 'act';
      const list = state.areas.filter((a) => a.act === act);
      const nodes = list.map((a) => {
        const cls = ['node'];
        const teleportable = a.waypoint && state.discovered.has(a.id);
        if (a.isTown) cls.push('town');
        if (teleportable) cls.push('wp');
        if (a.isBoss) cls.push('boss');
        if (a.id === state.currentId) cls.push('current');
        const you = a.id === state.currentId ? '<span class="you">你在此</span>' : '';
        return `<span class="${cls.join(' ')}" data-wp="${teleportable ? a.id : ''}">${you}${a.name}</span>`;
      });
      sec.innerHTML = `<div class="acttitle">第${['一', '二', '三', '四', '五'][act - 1] ?? act}幕</div>` +
        `<div class="row">${nodes.join('<span class="arrow">›</span>')}</div>`;
      body.appendChild(sec);
    }
    // 绑定可传送节点
    body.querySelectorAll('.node.wp').forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const id = (el as HTMLElement).dataset.wp;
        if (id) { this.hide(); this.onTravel(id); }
      });
    });
    this.open = true;
    this.root.classList.add('show');
  }

  hide(): void { this.open = false; this.root.classList.remove('show'); }
}
