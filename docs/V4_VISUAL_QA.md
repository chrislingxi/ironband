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
- Skill icons: no naked emoji in normal operation when a semantic SVG exists.
- Inventory: equipment and bag cells feel like the same material system as HUD.
- Skill tree: learned, selected, locked, and investable states are visually distinct.
- NPCs: camp NPCs use PNG art when available.
- Combat: canvas filter must not make monsters or loot unreadable.

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
