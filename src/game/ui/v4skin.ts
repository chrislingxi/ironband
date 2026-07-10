import { assetUrl } from '@engine/assets/url.ts';

let injected = false;

export function injectV4Skin(): void {
  if (injected) return;
  injected = true;
  const css = `
  :root {
    --v4-bg0:#050403; --v4-bg1:#100b08; --v4-bg2:#1a100b;
    --v4-panel:#140f0c; --v4-panel2:#201610; --v4-line:#8c6630;
    --v4-gold:#d7a84b; --v4-gold2:#ffe2a0; --v4-blood:#8e1712;
    --v4-text:#eadfca; --v4-muted:#a99677; --v4-blue:#5fc8e8; --v4-green:#4fd8aa;
  }
  body::before {
    content:""; position:fixed; inset:0; pointer-events:none; z-index:1;
    background:
      radial-gradient(80% 62% at 50% 38%, transparent 48%, #0005 88%),
      linear-gradient(180deg,#0005 0%,transparent 24%,transparent 68%,#0008 100%);
  }
  body::after {
    content:""; position:fixed; inset:0; pointer-events:none; z-index:2; opacity:.14;
    background-image:
      linear-gradient(90deg, transparent 0 47px, #ffffff12 48px 49px, transparent 50px),
      linear-gradient(0deg, transparent 0 47px, #000 48px 49px, transparent 50px);
    mix-blend-mode:overlay;
  }
  canvas { filter:saturate(.98) contrast(1.06) brightness(1); }
  #title {
    background:
      linear-gradient(90deg,#020202e8 0%,#0008 22%,#0004 50%,#0008 78%,#020202e8 100%),
      radial-gradient(60% 54% at 50% 18%, #22150a20 0%, transparent 62%),
      url("${assetUrl('assets/ui/title-bg.png')}"),
      linear-gradient(180deg,#080706 0%,#140b08 52%,#030202 100%) !important;
    background-size:cover, cover, cover, cover !important;
    background-position:center, center, center, center !important;
  }
  #title .sub { color:#d7b66f !important; text-transform:uppercase; }
  #title .foot { color:#8c7750 !important; }
  #title .card, #title .slot, #title .namebox input, #title .btn {
    border-radius:8px !important;
    border-color:#8c6630 !important;
    background-image:
      linear-gradient(180deg,#2b1b12ea,#0b0706f4),
      url("${assetUrl('assets/ui/panel.png')}") !important;
    background-size:auto, 220px 220px !important;
    box-shadow:0 18px 44px #000e, inset 0 1px 0 #ffe7a026, inset 0 0 0 1px #000 !important;
  }
  #title .card .nm, #title h1 {
    letter-spacing:.08em !important;
    text-shadow:0 2px 4px #000, 0 0 18px #9b641c66 !important;
  }
  #title .card .ic img.cimg {
    filter:brightness(1.08) contrast(1.08) saturate(1.08) drop-shadow(0 18px 16px #000) drop-shadow(0 0 18px #d7a84b36);
  }
  #hud::before {
    background:
      radial-gradient(44% 44% at 50% 48%, transparent 44%, #00000038 100%),
      linear-gradient(180deg,#0009 0%,transparent 18%,transparent 70%,#000a 100%) !important;
  }
  #hud .bar, #hud .gold, #hud .lvl, #hud .info, #hud .potion {
    border-radius:6px !important;
    border-color:var(--v4-line) !important;
    background-image:linear-gradient(180deg,#22150fef,#080605ef), url("${assetUrl('assets/ui/panel.png')}") !important;
    background-size:auto, 190px 190px !important;
  }
  #hud .bar { height:24px !important; width:236px !important; }
  #hud .hptxt { width:236px !important; line-height:24px !important; }
  #hud .bar > i {
    background:linear-gradient(180deg,#ff9a7a 0%,#bc2118 48%,#5c0808 100%) !important;
    box-shadow:inset 0 5px 4px -3px #fff8, inset 0 -5px 8px #0008, 0 0 18px #9b1a12aa !important;
  }
  #hud .skills { gap:10px !important; }
  #hud .skill {
    border-radius:8px !important;
    background-image:linear-gradient(145deg,#5b4020,#120c08 42%,#050403), url("${assetUrl('assets/ui/btn_frame.png')}") !important;
    background-size:auto, cover !important;
    border-color:#c99745 !important;
  }
  #hud .skill::before { inset:8px !important; border-radius:7px !important; }
  #hud .skill .nm {
    background:#050403d9 !important; color:#f5d982 !important; border:1px solid #6b4b22;
  }
  #hud .skill-glyph img, .skill-glyph img {
    filter:brightness(1.16) contrast(1.22) saturate(1.25) drop-shadow(0 2px 2px #000) drop-shadow(0 0 9px #d7a84b70) !important;
  }
  #inv, #charp, #skt, #town, #questlog, #wp, #worldmap, #settings, #runecodex, #tut {
    background:
      radial-gradient(80% 70% at 50% 0%, #2a1a14f0 0%, transparent 56%),
      linear-gradient(180deg,#0f0a08f7,#050403fb) !important;
    color:var(--v4-text) !important;
  }
  #inv .hd, #charp .hd, #questlog .head, #wp .head, #runecodex .rwhd {
    border-bottom:1px solid #8c6630 !important;
    box-shadow:0 1px 0 #000, 0 10px 22px #0006;
  }
  #inv .ttl, #charp .ttl, #skt h3, #town h3, #questlog .title, #wp .title, #worldmap h2, #runecodex .rwttl {
    color:var(--v4-gold2) !important;
    font-family:Cinzel,Georgia,"Songti SC",serif !important;
    letter-spacing:.08em !important;
    text-shadow:0 2px 4px #000, 0 0 16px #b7772458 !important;
  }
  #inv .slot, #inv .cell, #inv .tip, #charp .card, #charp .hero, #skt .detail, #skt .load, #skt .tabhost,
  #town .row, #town .tab, #town .btn, #runecodex .rwcard, #questlog .panel, #questlog .q, #wp .panel, #worldmap .act,
  #settings .card, #tut .card {
    border-radius:7px !important;
    border-color:#5f4526 !important;
    background-image:linear-gradient(180deg,#1d130eed,#0b0706f4), url("${assetUrl('assets/ui/panel.png')}") !important;
    background-size:auto, 230px 230px !important;
    box-shadow:0 10px 24px #0009, inset 0 1px 0 #ffe7a018 !important;
  }
  #inv .cell, #inv .slot, #town .row, #skt .sk { transition:filter .12s ease, transform .07s ease; }
  #inv .cell:hover, #inv .slot:hover, #town .row.act:hover, #skt .sk:hover { filter:brightness(1.12); }
  #inv .wear, #inv .off, #charp .plus, #skt .detail .inv, #skt .systab.on, #town .tab.on, #town .btn,
  #runecodex .rstep.has {
    border-radius:5px !important;
    background:linear-gradient(180deg,#e2bd68,#8f6726) !important;
    color:#140c05 !important;
    border-color:#f1d28a !important;
    text-shadow:none !important;
  }
  #skt .sk {
    border-radius:8px !important;
    background:radial-gradient(circle at 42% 26%,#343044,#080609 80%) !important;
    border-color:#5d4931 !important;
  }
  #skt .sk.learned, #skt .sk.sel {
    border-color:#d7a84b !important;
    box-shadow:0 0 0 1px #000 inset, 0 0 18px #d7a84b58 !important;
  }
  #skt .sk.investable { border-color:#5fc08b !important; }
  #town .sub, #questlog .qdesc, #wp .empty, #worldmap .hint { color:var(--v4-muted) !important; opacity:1 !important; }
  @media (max-width:680px) and (orientation:portrait) {
    #hud .bar, #hud .hptxt { width:188px !important; }
    #hud .lvl { left:calc(214px + env(safe-area-inset-left)) !important; }
  }
  `;
  const tag = document.createElement('style');
  tag.id = 'v4-dark-visual-skin';
  tag.textContent = css;
  document.head.appendChild(tag);
}
