# V4 Visual QA

## Acceptance Bar

The build is acceptable only when a player can open the live GitHub Pages version and immediately see a darker, more premium ARPG presentation without needing to know what changed.

## Device Checks

- iPhone portrait: no page zoom after repeated tapping; HUD remains usable; skill buttons do not cover browser controls.
- iPhone landscape: inventory and skill tree must not trap the whole screen in an unusable layout.
- Desktop 1280x720: title, HUD, panels, and combat silhouettes remain readable.
- Desktop 390x844 emulation: title class cards and panel buttons must not overlap.

## Visual Checks

- Title: no toy-like "Q版" positioning; class cards feel like dark fantasy character cards.
- HUD: health, level, objective, potion, and four skills are legible over combat.
- Skill icons: core class skills should use bespoke PNGs when a skill-id art asset exists; generic SVGs are only fallback.
- Inventory: paper-doll equipment slots and rarity-framed bag cells feel like the same material system as HUD.
- Skill tree: learned, selected, locked, and investable states are visually distinct.
- NPCs: camp NPCs use mature dark fantasy PNG art, with role props readable on mobile.
- Combat: common monsters must read as gritty dark fantasy creatures, not toy-like/chibi markers.

## Regression Checks

Run before every push:

```bash
npm run typecheck
npm test -- --run
npm run selftest:lint
npm run build:site
```

Then do a browser smoke check against the built page or local dev server:

- title screen appears
- new Amazon can enter the game
- HUD is visible
- inventory opens and closes
- skill tree opens and closes
- town NPC panel opens from camp

## 2026-07-05 V4 Foundation QA Record

- Local build: passed.
- Unit/regression tests: 43 files, 187 tests passed.
- Safe-area lint: passed.
- Mobile browser smoke: passed at 390x844.
- Online GitHub Pages smoke: passed at `https://chrislingxi.github.io/ironband/?v=a219c59`.
- V4 skin injection: passed.
- Title footer no longer contains toy/Q positioning language.
- Amazon class art exists on title page.
- Camp NPC PNG route exists online.
- First-run coach no longer overlaps the four skill buttons in mobile portrait.

Known remaining art gaps:

- `assets/v4-dark/` path is ready, but the first true V4 replacement pack is not yet populated.
- Title-screen Barbarian/Amazon/Sorceress class portraits now use full-body V4 dark fantasy PNGs instead of Q-style chibi art.
- `tile/hell.png` and `tile/snow.png` now resolve to generated V4 PNG tiles; they should later be replaced by hand-painted final tiles.
- Mephisto/Diablo/Baal runtime keys now resolve to V4 transparent PNG boss art; next upgrade is directional animation and in-game scale tuning.
- Runtime player and camp NPC PNGs are larger than the old procedural markers, reducing the title-to-combat quality drop.
- Rogue Encampment now has V4 campfire, exit gate, and blacksmith workstation props as low-risk scene anchors.
- Amazon Magic Arrow, Multiple Shot, and Frost Arrow now have bespoke V4 PNG HUD icons; remaining class trees still need the same treatment.
- Inventory now uses a paper-doll equipment page with rarity-framed bag cells and verified portrait/landscape mobile bounds.
- Camp NPCs now use mature 512x768 transparent PNG sprites instead of Q-style placeholder portraits.
- Fallen, Zombie, Skeleton, Shaman, Archer, and Brute now use V4 transparent monster sprites with larger runtime silhouette height.
- Barbarian Bash/Double Swing/War Cry and Sorceress Ice Bolt/Fire Bolt/Charged Bolt now have bespoke V4 PNG skill icons.
- Amazon Fire Arrow/Exploding Arrow/Ice Arrow/Guided Arrow/Strafe/Valkyrie now have bespoke V4 PNG skill icons.
- Character, NPC, and monster runtime art is single-frame PNG, not directional animation sheets.
