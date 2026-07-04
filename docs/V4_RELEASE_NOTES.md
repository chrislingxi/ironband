# V4 Release Notes

## a219c59 - Dark Visual Rebuild Foundation

This release is the first production pass of the V4 visual rebuild.

Player-facing changes:

- Added a global dark fantasy UI skin across title, HUD, inventory, character, skill tree, town, quest, waypoint, world map, settings, and tutorial surfaces.
- Reworked icon HTML so every semantic icon can receive a unified V4 frame, glow, and shadow treatment.
- Connected camp NPC PNG assets to runtime rendering; NPCs now use real art when available instead of only procedural figures.
- Moved the first-run objective coach to the lower-left safe area on mobile portrait, avoiding overlap with the four skill buttons.
- Removed visible Q-style positioning language from the title screen.

Production changes:

- Added `assets/v4-dark/<key>.png` to the runtime asset override order.
- Added V4 art bible, asset manifest, visual QA, and release-note docs.
- Documented that Chris owns game planning while Codex owns implementation, art production, QA, release, and GitHub iteration.

Verification:

- `npm run typecheck`
- `npm test -- --run`
- `npm run selftest:lint`
- `npm run build:site`
- Mobile browser smoke at 390x844
- GitHub Pages smoke with cachebuster `?v=a219c59`

## Icon Pass - Amazon Starter Skills

This pass replaces the most visible Amazon starter skill icon fallbacks with original V4 SVG assets:

- `skill-magic-arrow.svg`
- `skill-multiple-arrow.svg`
- `skill-frost-arrow.svg`
- `skill-ice-arrow.svg`
- `skill-exploding-arrow.svg`

The runtime emoji mapping now routes Amazon bow/cold/burst symbols into these bespoke dark framed icons instead of generic library symbols.

## Environment Tile Pass - Hell and Snow

This pass removes two visible environment fallbacks from late-game areas:

- Added generated V4 isometric `hell.png` tile assets for Act IV-style scorched red stone.
- Added generated V4 isometric `snow.png` tile assets for Act V-style cold cracked stone.
- Added `npm run assets:v4-tiles` so the tile assets are reproducible from `scripts/gen-v4-tiles.mjs`.

The runtime tile preload now resolves `tile/hell` and `tile/snow` to real PNG textures instead of procedural fallback.

## Boss Art Pass - Prime Evils

This pass removes three high-impact monster fallbacks from late-game encounters:

- Added transparent V4 PNG boss art for `mephisto.png`, `diablo.png`, and `baal.png`.
- Added `scripts/chroma-key-png.mjs` to convert green-background AI renders into alpha PNG game assets without needing Pillow.
- Kept `scripts/gen-v4-bosses.mjs` as a deterministic placeholder generator only, exposed as `npm run assets:v4-boss-placeholders`, so final boss art is not accidentally overwritten.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the three boss PNGs.

The runtime already resolves monsters by `mon/<defId>.png`, so these assets are picked up without additional gameplay code.
