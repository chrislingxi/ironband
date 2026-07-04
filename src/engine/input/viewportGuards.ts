let installed = false;

function prevent(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}

function applyViewportMeta(): void {
  const content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content';
  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.prepend(meta);
  }
  if (meta.content !== content) meta.content = content;
}

function lockViewport(): void {
  const vv = window.visualViewport;
  const width = vv?.width ?? window.innerWidth ?? document.documentElement.clientWidth;
  const height = vv?.height ?? window.innerHeight ?? document.documentElement.clientHeight;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--app-width', `${Math.round(width)}px`);
  rootStyle.setProperty('--app-height', `${Math.round(height)}px`);
  rootStyle.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.inset = '0';
  window.scrollTo(0, 0);
}

// Mobile WebKit can still zoom on rapid taps even with user-scalable=no.
// Install one capture-phase guard for all high-frequency game controls.
export function installViewportGuards(): void {
  if (installed) return;
  installed = true;
  applyViewportMeta();
  lockViewport();

  const style = document.createElement('style');
  style.textContent = `
    html, body, #app, canvas {
      touch-action: none;
      overscroll-behavior: none;
      -webkit-user-select: none;
      user-select: none;
      -webkit-text-size-adjust: 100%;
    }
    #app {
      width: var(--app-width, 100vw);
      height: var(--app-height, 100dvh);
    }
    button, [role="button"], .plus, .skill, .potion, .x, .respec, .btn, .slot, .codexbtn, .equipbest, .wear, .off {
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('resize', lockViewport, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(lockViewport, 80), { passive: true });
  window.visualViewport?.addEventListener('resize', lockViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', lockViewport, { passive: true });
  window.addEventListener('scroll', lockViewport, { passive: true });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 420) e.preventDefault();
    lastTouchEnd = now;
    window.setTimeout(lockViewport, 0);
  }, { passive: false, capture: true });

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false, capture: true });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false, capture: true });
  document.addEventListener('dblclick', prevent, { capture: true });

  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(ev, prevent, { capture: true });
  }
}
