# V4 Visual QA

## Combat FX And Town Services Gate

- [x] Amazon projectile reads as an arrow at mobile game scale.
- [x] Elemental impact color and silhouette differ by damage type.
- [x] Rare/set/unique drops show a persistent beam, halo and name even when auto-pickup fires in the same simulation frame.
- [x] Forge/shop/heal/identify icons load as 256px PNG assets without fallback glyphs.
- [x] Town tabs fit at 390px CSS width without horizontal overflow.

## Character Progression Art Gate

- [x] Inventory paper-doll loads the active class PNG at portrait and landscape sizes.
- [x] Character header loads the active class PNG without covering level, XP or close controls.
- [x] Both pages remain horizontally bounded at 390x844 and 844x390.

## First Loot Art Gate

- [x] Short bow, cap, buckler, club, sash and ring load as 256px PNGs in inventory and town commerce.
- [x] Finished item art and unfinished semantic fallbacks coexist without failed requests, broken-image markers or boot errors.
- [x] Three-column mobile inventory cells keep icon, name, power delta and wear action legible.

## Weapon And Defense Loot Gate

- [x] Hand axe, short sword, mace, double axe, skull cap and small shield load as 256px PNGs.
- [x] Weapon silhouettes remain distinct at 38-44px in shop and inventory rows.
- [x] The delivered registry covers every weapon, helm and shield base key without missing requests.

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

Historical foundation gaps and their V4 closure:

- `assets/v4-dark/` remains an optional user override path; shipped V4 art lives in the primary `assets/` contract and does not depend on an external pack.
- Title-screen Barbarian/Amazon/Sorceress class portraits now use full-body V4 dark fantasy PNGs instead of Q-style chibi art.
- Wilderness, town, desert, hell, and snow now use painted 768x768 source textures projected into seamless 256x128 RGBA isometric tiles by `npm run assets:v4-tiles`.
- All five act bosses resolve to distinct V4 transparent PNG art, original player-facing identities, arena altar anchors and attack telegraphs.
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
- Common single-frame monster art now has presentation stride, attack compression and hit jolt; all three player classes have dedicated attack poses. Full directional atlases remain a post-V4 expansion.

## 2026-07-11 Painted Environment QA Record

- Full self-test: 45 files, 191 tests passed.
- Asset gate: all five painted source textures and both runtime copies are required; output dimensions, RGBA format, and copy identity are tested.
- Desktop 1280x720: title and game entered successfully; town ground material and character silhouettes remained readable.
- iPhone portrait 390x844: no page overflow; HUD and objective panel remained inside the viewport.
- iPhone landscape 844x390: inventory and skill tree filled the viewport without trapping the player; both close controls remained reachable and worked.
- Browser warnings/errors: none.
- Online GitHub Pages verification: passed at `c58ca13` after fixing stale browser asset caching and the 0.9s large-art timeout. Portrait loaded painted tiles plus full character/NPC art with zero overflow or console errors; landscape inventory stayed bounded with a reachable close control.

## 2026-07-11 Combat Readability QA Record

- Arrow rendering uses a 45px directional silhouette with shaft, head, fletching and elemental edge light instead of a generic projectile diamond.
- Lightning, poison and magic bolts now use separate zig-zag, globule and rune-shard silhouettes; fire and cold retain their own ball and crystal language.
- Loot presentation is decoupled from inventory pickup. Premium beams, ground halos and labels remain visible for 1.35 seconds after the item enters the bag.
- Portrait 390x844 and landscape 844x390 browser checks remained horizontally bounded; the landscape inventory covered the viewport without browser overflow or navigation interception.
- Full self-test: 46 files, 198 tests passed, including UI and mobile zoom gates.

## 2026-07-11 UI Material Kit QA Record

- Black-iron empty/equipped slots and common/magic/rare/unique frames are authored RGBA PNGs, mirrored byte-for-byte between dev and Pages paths.
- Cooldown mask and burn/freeze/poison/bleed status icons share the same worn-metal frame, light direction and mobile-readable contrast.
- Landscape 844x390 inventory loaded the authored slot URLs, stayed exactly viewport-bounded and kept all equipment labels readable.
- Static asset revision advanced to `20260711-v4-ui-kit` so iOS Safari and GitHub Pages cannot reuse the older painted-environment cache entries.

## 2026-07-11 Three-Class Attack Pose QA Record

- Amazon, Barbarian and Sorceress each have a dedicated 512x768 transparent attack pose with a complete weapon silhouette and bottom-center foot anchor.
- Runtime pose swapping uses the existing attack cooldown window only; combat timing, damage and collision remain unchanged.
- Barbarian overhead axe and Sorceress forward sigil remain readable when mirrored and reduced to mobile actor scale.
- Common monsters now carry visible stride weight, attack compression and short hit-jolt motion even when only one authored PNG frame exists.
- All five act Bosses display a pulsing ground warning during their attack window without changing the simulation hit timing.

## 2026-07-11 Release Candidate Performance And Capture Record

- Full-resolution class, late-act Boss and camp-prop sources are retained under `art_source/v4/runtime`; deployed copies are capped at a 768px longest edge.
- Each runtime asset tree decreased from roughly 47 MB to 34 MB and is guarded by a 38 MiB automated ceiling.
- UI and mobile self-tests now serve the production build over localhost, matching GitHub Pages origin behavior and preventing false `file://` texture results.
- Fixed the local QA texture path so Pixi and DOM assets share the same `Image -> Texture` loading route; real character, NPC, prop and tile art is now visible in deterministic captures.
- Seven reproducible title, camp, combat, inventory and skill screenshots are committed under `docs/screenshots/v4` at portrait and landscape phone sizes.
- Complete logic suite: 46 files, 201 tests passed. Mobile zoom, fixed-body viewport and safe-area gates passed independently.
