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
- Title background: first viewport should show a real dark gothic scene behind the class cards, not a CSS-only gradient.
- HUD: health, level, objective, potion, and four skills are legible over combat.
- Landscape HUD: side utility buttons should collapse into a compact bottom row and not block the left combat lane.
- Skill icons: core class skills should use bespoke PNGs when a skill-id art asset exists; generic SVGs are only fallback.
- Inventory: paper-doll equipment slots and rarity-framed bag cells feel like the same material system as HUD.
- UI materials: global panel and button-frame textures should read as dark leather/black iron, not bright parchment or chrome.
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

- `assets/v4-dark/` path is ready, but the first external override pack is not yet populated.
- Title-screen Barbarian/Amazon/Sorceress class portraits now use full-body V4 dark fantasy PNGs instead of Q-style chibi art.
- Wilderness, town, desert, hell, and snow now use painted 768x768 source textures projected into seamless 256x128 RGBA isometric tiles by `npm run assets:v4-tiles`.
- All five act bosses now resolve to V4 transparent PNG boss art and keep distinct runtime subKinds; next upgrade is directional/attack animation.
- Runtime player and camp NPC PNGs are larger than the old procedural markers, reducing the title-to-combat quality drop.
- Rogue Encampment now has V4 campfire, exit gate, and blacksmith workstation props as low-risk scene anchors.
- Skill icon coverage is complete for the current data set: all 67 current class skill definitions now route to bespoke V4 PNG icons.
- Inventory now uses a paper-doll equipment page with rarity-framed bag cells and verified portrait/landscape mobile bounds.
- Camp NPCs now use mature 512x768 transparent PNG sprites instead of Q-style placeholder portraits.
- Fallen, Zombie, Skeleton, Shaman, Archer, and Brute now use V4 transparent monster sprites with larger runtime silhouette height.
- Hound and Spitter V4 monster PNGs are now covered by asset regression tests; all five act bosses keep distinct runtime subKinds.
- Barbarian Bash/Double Swing/War Cry and Sorceress Ice Bolt/Fire Bolt/Charged Bolt now have bespoke V4 PNG skill icons.
- Amazon Fire Arrow/Exploding Arrow/Ice Arrow/Guided Arrow/Strafe/Valkyrie now have bespoke V4 PNG skill icons.
- Sorceress Frozen Armor/Ice Blast/Warmth/Inferno/Static Field/Telekinesis now have bespoke V4 PNG skill icons.
- Sorceress Frost Nova/Glacial Spike/Blizzard/Frozen Orb/Fire Ball/Meteor now have bespoke V4 PNG skill icons.
- Barbarian Stun/Double Throw/Sword Mastery/Axe Mastery/Howl/Shout now have bespoke V4 PNG skill icons.
- Barbarian Concentrate/Frenzy/Whirlwind/Berserk, remaining masteries/passives, and battle shout utility skills now have bespoke V4 PNG skill icons.
- Amazon passive/magic, javelin/spear skills and remaining Sorceress fire/lightning utility skills now have bespoke V4 PNG skill icons.
- Title screen now uses a full-screen dark gothic cathedral-gate PNG background.
- Short landscape play now uses a compact bottom utility row and matching joystick dead zone.
- Global `ui/panel.png` and `ui/btn_frame.png` now use darker black-iron V4 material art.
- Character, NPC, and monster runtime art is single-frame PNG, not directional animation sheets.

## 2026-07-11 Painted Environment QA Record

- Full self-test: 45 files, 191 tests passed.
- Asset gate: all five painted source textures and both runtime copies are required; output dimensions, RGBA format, and copy identity are tested.
- Desktop 1280x720: title and game entered successfully; town ground material and character silhouettes remained readable.
- iPhone portrait 390x844: no page overflow; HUD and objective panel remained inside the viewport.
- iPhone landscape 844x390: inventory and skill tree filled the viewport without trapping the player; both close controls remained reachable and worked.
- Browser warnings/errors: none.
- Online GitHub Pages verification: passed at `c58ca13` after fixing stale browser asset caching and the 0.9s large-art timeout. Portrait loaded painted tiles plus full character/NPC art with zero overflow or console errors; landscape inventory stayed bounded with a reachable close control.
