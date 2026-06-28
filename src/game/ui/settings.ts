// 设置面板: 音量 / 音效·BGM 开关 / 自动饮药 / 重置存档。
// 纯 DOM + 内联样式; 通过回调与 main 的 audio/game/save 解耦。

export interface SettingsHooks {
  getVolume(): number;          // 0..1
  setVolume(v: number): void;
  getSfxOn(): boolean;
  setSfxOn(on: boolean): void;
  getBgmOn(): boolean;
  setBgmOn(on: boolean): void;
  getAutoQuaff(): boolean;
  setAutoQuaff(on: boolean): void;
  onResetSave(): void;          // 删除当前存档槽并回标题
  onClose(): void;
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #settings { position:absolute; inset:0; z-index:110; display:none; align-items:center; justify-content:center;
    background:#05060be0; font-family:-apple-system,"PingFang SC",sans-serif; color:#e8e0d0;
    padding:max(20px,env(safe-area-inset-top)) calc(20px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(20px + env(safe-area-inset-left)); }
  #settings .card { width:min(400px,92vw); background:linear-gradient(180deg,#181420,#0f0c16);
    border:1.5px solid #c79433; border-radius:16px; padding:20px; box-shadow:0 10px 40px #000c; }
  #settings h3 { font-family:Georgia,serif; color:#ffd76b; font-size:18px; margin:0 0 14px; text-align:center; }
  #settings .row { display:flex; align-items:center; justify-content:space-between; padding:11px 2px; border-bottom:1px solid #2a2436; }
  #settings .row .lbl { font-size:14px; }
  #settings input[type=range] { width:150px; accent-color:#c79433; }
  #settings .sw { width:52px; height:30px; border-radius:15px; background:#3a3346; position:relative; transition:background .15s; }
  #settings .sw.on { background:#7a9c3a; }
  #settings .sw .dot { position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#e8e0d0; transition:left .15s; }
  #settings .sw.on .dot { left:25px; }
  #settings .reset { margin-top:14px; text-align:center; padding:11px; border-radius:10px; font-size:14px; font-weight:700;
    border:1.5px solid #8a3a2a; background:#2a1414; color:#ff9a88; cursor:pointer; }
  #settings .reset.confirm { background:#7a1414; color:#fff; border-color:#c24a3a; }
  #settings .done { margin-top:10px; text-align:center; padding:12px; border-radius:10px; font-size:15px; font-weight:700;
    background:radial-gradient(circle at 50% 20%,#c79433,#8a6420); color:#1a1208; cursor:pointer; }
  #settings .row:active, #settings .done:active, #settings .reset:active { filter:brightness(1.1); }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

export class SettingsPanel {
  readonly root: HTMLElement;
  open = false;
  private resetArmed = false;

  constructor(private hooks: SettingsHooks) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.id = 'settings';
    this.root.innerHTML = `
      <div class="card">
        <h3>⚙ 设置</h3>
        <div class="row"><span class="lbl">主音量</span><input type="range" min="0" max="100" class="vol"></div>
        <div class="row"><span class="lbl">音效</span><div class="sw sfx"><div class="dot"></div></div></div>
        <div class="row"><span class="lbl">背景音乐</span><div class="sw bgm"><div class="dot"></div></div></div>
        <div class="row"><span class="lbl">低血自动饮药</span><div class="sw auto"><div class="dot"></div></div></div>
        <div class="reset">重置存档 (删除当前角色)</div>
        <div class="done">完成</div>
      </div>`;
    document.body.appendChild(this.root);

    const vol = this.root.querySelector('.vol') as HTMLInputElement;
    vol.addEventListener('input', () => this.hooks.setVolume(Number(vol.value) / 100));

    const bindSwitch = (cls: string, get: () => boolean, set: (b: boolean) => void) => {
      const el = this.root.querySelector(cls) as HTMLElement;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const next = !get();
        set(next);
        el.classList.toggle('on', next);
      });
    };
    bindSwitch('.sfx', () => this.hooks.getSfxOn(), (b) => this.hooks.setSfxOn(b));
    bindSwitch('.bgm', () => this.hooks.getBgmOn(), (b) => this.hooks.setBgmOn(b));
    bindSwitch('.auto', () => this.hooks.getAutoQuaff(), (b) => this.hooks.setAutoQuaff(b));

    const reset = this.root.querySelector('.reset') as HTMLElement;
    reset.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!this.resetArmed) {
        this.resetArmed = true;
        reset.textContent = '确认删除? 再点一次 (不可恢复)';
        reset.classList.add('confirm');
      } else {
        this.hooks.onResetSave();
      }
    });

    const done = this.root.querySelector('.done') as HTMLElement;
    done.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.hide(); this.hooks.onClose(); });
  }

  show(): void {
    this.open = true;
    this.resetArmed = false;
    const reset = this.root.querySelector('.reset') as HTMLElement;
    reset.textContent = '重置存档 (删除当前角色)';
    reset.classList.remove('confirm');
    // 同步当前值
    (this.root.querySelector('.vol') as HTMLInputElement).value = String(Math.round(this.hooks.getVolume() * 100));
    (this.root.querySelector('.sfx') as HTMLElement).classList.toggle('on', this.hooks.getSfxOn());
    (this.root.querySelector('.bgm') as HTMLElement).classList.toggle('on', this.hooks.getBgmOn());
    (this.root.querySelector('.auto') as HTMLElement).classList.toggle('on', this.hooks.getAutoQuaff());
    this.root.style.display = 'flex';
  }

  hide(): void { this.open = false; this.root.style.display = 'none'; }
}
