// 航点传送面板 (哥特风, 触屏友好). 纯 DOM 覆盖层, 不依赖 Game.
// 由 main 持有: 点击航点按钮时以 listWaypoints(...) 结果调用 show(),
// 选中某航点 → hide() + onTravel(id)(由 main 转给 game.loadArea).

let styleInjected = false;
function injectStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
  #wp { position:absolute; inset:0; z-index:40; pointer-events:none; display:none;
    font-family:-apple-system,"PingFang SC",sans-serif;
    align-items:center; justify-content:center;
    padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  #wp.show { display:flex; }
  #wp .scrim { position:absolute; inset:0; background:#000a; pointer-events:auto; }
  #wp .panel { position:relative; pointer-events:auto; width:min(86vw,340px); max-height:74vh;
    display:flex; flex-direction:column; background:linear-gradient(#241d17,#15100c);
    border:2px solid #6a5a3a; border-radius:12px; box-shadow:0 8px 30px #000c, 0 0 0 1px #0008 inset;
    color:#e8e0d0; overflow:hidden; }
  #wp .head { display:flex; align-items:center; justify-content:space-between;
    padding:12px 14px; border-bottom:1px solid #6a5a3a55;
    background:linear-gradient(#2e2419,#221a12); }
  #wp .title { font-family:Georgia,serif; font-size:18px; font-weight:800;
    letter-spacing:3px; color:#ffd76b; text-shadow:0 1px 2px #000; }
  #wp .x { width:34px; height:34px; flex:0 0 auto; border-radius:50%;
    background:#1a1a24cc; border:1px solid #6a5a3a; color:#e8d8b8;
    font-size:18px; line-height:32px; text-align:center; cursor:pointer;
    user-select:none; -webkit-user-select:none; }
  #wp .x:active { transform:scale(.92); }
  #wp .list { overflow-y:auto; -webkit-overflow-scrolling:touch; padding:8px; }
  #wp .item { display:block; width:100%; text-align:left; margin:6px 0; padding:12px 14px;
    background:#1c1610; border:1px solid #5a4a30; border-radius:8px;
    color:#ede3cf; font-size:15px; cursor:pointer; box-shadow:0 1px 3px #0008;
    user-select:none; -webkit-user-select:none; }
  #wp .item::before { content:"❖"; color:#9fc7ff; margin-right:8px; }
  #wp .item:active { transform:scale(.98); background:#2a2014; border-color:#8a743f; }
  #wp .empty { padding:26px 16px; text-align:center; color:#a89a80; font-size:14px; line-height:1.6; }
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// 转义 HTML, 防止区域名注入(原则上数据可控, 仍稳妥处理).
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;'
      : c === '<' ? '&lt;'
        : c === '>' ? '&gt;'
          : c === '"' ? '&quot;'
            : '&#39;');
}

export class WaypointPanel {
  open = false;
  private root: HTMLElement;
  private listEl: HTMLElement;

  constructor(
    private onTravel: (areaId: string) => void,
    private onClose: () => void,
  ) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'wp';
    this.root.innerHTML = `
      <div class="scrim"></div>
      <div class="panel">
        <div class="head">
          <div class="title">航点</div>
          <div class="x" role="button" aria-label="关闭">✕</div>
        </div>
        <div class="list"></div>
      </div>`;
    document.body.appendChild(this.root);
    this.listEl = this.root.querySelector('.list') as HTMLElement;

    const close = (e: Event) => { e.preventDefault(); e.stopPropagation(); this.hide(); this.onClose(); };
    (this.root.querySelector('.x') as HTMLElement).addEventListener('pointerdown', close);
    (this.root.querySelector('.scrim') as HTMLElement).addEventListener('pointerdown', close);
  }

  // 以当前已发现航点列表渲染并显示面板.
  show(list: { id: string; name: string }[]): void {
    this.listEl.innerHTML = '';
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = '尚未发现任何航点。\n探索世界以点亮传送点。';
      this.listEl.appendChild(empty);
    } else {
      for (const wp of list) {
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('role', 'button');
        item.innerHTML = esc(wp.name);
        const go = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          this.hide();
          this.onTravel(wp.id);
        };
        item.addEventListener('pointerdown', go);
        this.listEl.appendChild(item);
      }
    }
    this.open = true;
    this.root.classList.add('show');
  }

  // 隐藏面板(不触发 onClose; onClose 仅由 ✕/遮罩主动关闭时调用).
  hide(): void {
    this.open = false;
    this.root.classList.remove('show');
  }
}
