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
