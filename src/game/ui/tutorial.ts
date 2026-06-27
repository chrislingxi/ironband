// 首次启动新手引导: 分步卡片浮层, 讲清核心操作。
// 用 localStorage 记忆是否看过; 可从菜单「❓帮助」重看。
// 纯 DOM + 内联样式, 与项目其余 UI 风格一致, 零依赖。

const SEEN_KEY = 'ironband_tutorial_done';

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: '🕹',
    title: '移动与攻击',
    body: '拖动左下角<b>摇杆</b>移动。靠近敌人会<b>自动普攻</b>，无需点击。',
  },
  {
    icon: '✨',
    title: '技能键',
    body: '右下角四个键：<b>槽1</b> 固定为<b>普通攻击</b>。其余三槽需在<b>技能树</b>(📖)学技能后，点技能上的 <b>①②③</b> 装载。',
  },
  {
    icon: '📖',
    title: '技能树',
    body: '点 <b>📖</b> 打开技能树：升级获得技能点，投点学习暗黑2风格技能(冰火电/弓矛/战吼…)，前置满足才能解锁高阶技能。',
  },
  {
    icon: '💊',
    title: '受伤与回血',
    body: '受伤后点左上<b>红色药水珠</b>回血，或低血时<b>自动饮药</b>。药水从怪物掉落，<b>回营地自动补满</b>。',
  },
  {
    icon: '🎒',
    title: '装备与加点',
    body: '点 <b>🎒</b> 打开背包：点背包物品<b>穿戴</b>、点装备槽<b>卸下</b>。升级后这里会出现 <b>[+]</b> 自由分配属性点。',
  },
  {
    icon: '🏛',
    title: '营地服务',
    body: '回到营地点 <b>🏛</b> 可<b>买卖 / 修理 / 雇佣 / 洗点</b>。走近 NPC 头顶出现 ▸ 提示时，点 NPC 接取或推进<b>任务</b>。',
  },
  {
    icon: '🗺',
    title: '推进剧情',
    body: '<b>清光</b>区域怪物后，跟随<b>出口箭头</b>进入下一区。点 <b>📜</b> 查看任务目标，击败各幕 <b>Boss</b> 解锁噩梦 / 地狱难度。',
  },
];

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // localStorage 不可用(隐私模式)时忽略, 引导每次启动都会出现, 不致命。
  }
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const css = `
  #tut { position:absolute; inset:0; z-index:120; display:flex; align-items:center; justify-content:center;
    background:#05060be0; font-family:-apple-system,"PingFang SC",sans-serif; color:#e8e0d0;
    padding:max(20px,env(safe-area-inset-top)) 20px 20px; }
  #tut .card { width:min(420px,90vw); background:linear-gradient(180deg,#181420,#0f0c16);
    border:1.5px solid #c79433; border-radius:16px; padding:22px 20px 18px; box-shadow:0 10px 40px #000c; }
  #tut .icon { font-size:42px; text-align:center; margin-bottom:6px; }
  #tut h3 { font-family:Georgia,serif; color:#ffd76b; font-size:19px; text-align:center; margin:0 0 12px; }
  #tut .body { font-size:14px; line-height:1.8; min-height:88px; }
  #tut .body b { color:#ffe08a; }
  #tut .dots { display:flex; gap:7px; justify-content:center; margin:16px 0 14px; }
  #tut .dot { width:8px; height:8px; border-radius:50%; background:#4a4458; }
  #tut .dot.on { background:#c79433; }
  #tut .row { display:flex; gap:10px; }
  #tut .btn { flex:1; text-align:center; padding:12px; border-radius:10px; font-size:15px; font-weight:700;
    border:1.5px solid #6a5a3a; background:#221c2c; color:#e8d8a8; cursor:pointer; user-select:none; }
  #tut .btn.primary { background:radial-gradient(circle at 50% 20%,#c79433,#8a6420); border-color:#e0b450; color:#1a1208; }
  #tut .btn:active { transform:scale(.97); }
  #tut .skip { text-align:center; margin-top:12px; font-size:12px; opacity:.5; cursor:pointer; }
  `;
  const t = document.createElement('style');
  t.textContent = css;
  document.head.appendChild(t);
}

// 显示引导。onDone 在关闭(看完/跳过)时回调, 供主流程恢复输入。
export function showTutorial(onDone?: () => void): void {
  injectStyle();
  let i = 0;

  const root = document.createElement('div');
  root.id = 'tut';
  root.innerHTML = `
    <div class="card">
      <div class="icon"></div>
      <h3></h3>
      <div class="body"></div>
      <div class="dots"></div>
      <div class="row">
        <div class="btn prev">上一步</div>
        <div class="btn primary next">下一步</div>
      </div>
      <div class="skip">跳过引导</div>
    </div>`;
  document.body.appendChild(root);

  const iconEl = root.querySelector('.icon') as HTMLElement;
  const titleEl = root.querySelector('h3') as HTMLElement;
  const bodyEl = root.querySelector('.body') as HTMLElement;
  const dotsEl = root.querySelector('.dots') as HTMLElement;
  const prevEl = root.querySelector('.prev') as HTMLElement;
  const nextEl = root.querySelector('.next') as HTMLElement;
  const skipEl = root.querySelector('.skip') as HTMLElement;

  function go(n: number): void { i = Math.max(0, Math.min(STEPS.length - 1, n)); render(); }

  function render(): void {
    const s = STEPS[i];
    iconEl.textContent = s.icon;
    titleEl.textContent = s.title;
    bodyEl.innerHTML = s.body;
    dotsEl.innerHTML = STEPS.map((_, k) => `<div class="dot${k === i ? ' on' : ''}" data-k="${k}"></div>`).join('');
    // dots 可点跳转
    dotsEl.querySelectorAll('.dot').forEach((d) => d.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); go(Number((d as HTMLElement).dataset.k));
    }));
    prevEl.style.visibility = i === 0 ? 'hidden' : 'visible';
    nextEl.textContent = i === STEPS.length - 1 ? '开始游戏' : '下一步';
  }

  function close(): void {
    markSeen();
    root.remove();
    onDone?.();
  }

  const tap = (el: HTMLElement, fn: () => void) =>
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });

  tap(prevEl, () => go(i - 1));
  tap(nextEl, () => { if (i < STEPS.length - 1) go(i + 1); else close(); });
  tap(skipEl, close);

  // 左右滑动翻页 (移动端手感): 在卡片上记录起点, 抬手按位移翻页。
  const card = root.querySelector('.card') as HTMLElement;
  let sx = 0, sy = 0, swiping = false;
  card.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; swiping = true; });
  const endSwipe = (e: PointerEvent) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) { if (i < STEPS.length - 1) go(i + 1); else close(); } // 左滑前进
      else go(i - 1); // 右滑后退
    }
  };
  card.addEventListener('pointerup', endSwipe);
  card.addEventListener('pointercancel', () => { swiping = false; });
  // 吃掉浮层上的所有指针事件, 防止穿透到摇杆/按钮。
  root.addEventListener('pointerdown', (e) => { e.stopPropagation(); });

  render();
}

// 首次启动时自动展示(已看过则不展示)。返回是否展示了。
export function maybeShowTutorial(onDone?: () => void): boolean {
  if (tutorialSeen()) return false;
  showTutorial(onDone);
  return true;
}
