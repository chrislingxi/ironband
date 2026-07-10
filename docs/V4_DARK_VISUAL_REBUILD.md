# Ironband V4 Dark Visual Rebuild

## Studio Contract

Chris only owns game direction and planning decisions. Codex owns engineering, art implementation, UI, audio, QA, release, and GitHub iteration until a playable version is online.

## Target

V4 moves the game away from placeholder/Q-style presentation toward a high-end dark fantasy ARPG slice: metal, leather, blood, candlelight, readable combat silhouettes, and iconography that feels made for a serious loot game.

This version must improve every first-five-minute touchpoint:

- title and class select
- combat HUD
- skill buttons and icon treatment
- inventory/equipment pages
- skill tree page
- character/town/quest panels
- camp NPC presentation
- asset override pipeline for future hero, monster, NPC, tile, UI, and icon packs

## Art Direction

- Palette: near-black base, blood red accents, tarnished gold UI lines, cold teal magic highlights.
- Shape language: square or lightly chamfered metal frames, engraved panels, heavy shadows, minimal rounded toy-like forms.
- Characters: compact isometric silhouettes are acceptable for now, but all runtime paths must prefer real PNG art over procedural fallback.
- Monsters: bulk, asymmetry, bone/leather materials, clear elite aura readability.
- UI: dense and operational, not a marketing page; every panel should feel like an in-world artifact.
- Icons: no plain emoji as final art. SVG/game-icon fallback is allowed, but all icons must pass through the V4 frame, glow, and shadow system.

## Runtime Asset Contract

All renderers load by key and should prefer higher quality packs first:

1. `assets/extracted/<key>.png`
2. `assets/v4-dark/<key>.png`
3. `assets/<key>.png`
4. procedural fallback or SVG fallback

Required key families:

- `char/barbarian`, `char/amazon`, `char/sorceress`
- `mon/fallen`, `mon/skeleton`, `mon/zombie`, `mon/shaman`, `mon/archer`, `mon/hound`, `mon/brute`, `mon/spitter`, `mon/andariel`, `mon/duriel`, `mon/mephisto`, `mon/diablo`, `mon/baal`
- `npc/akara`, `npc/kashya`, `npc/charsi`, `npc/gheed`, `npc/warriv`, `npc/cain`
- `tile/wilderness`, `tile/town`, `tile/desert`, `tile/hell`, `tile/snow`
- `ui/panel`, `ui/btn_frame`, `ui/hp_orb`, `ui/mana_orb`
- `icon/<semantic-key>.svg`

## Implemented In This Pass

- Added the V4 theme-pack path to the asset loader.
- Added a global V4 dark visual skin for title, HUD, inventory, skill tree, character, town, quest, waypoint, map, settings, and tutorial surfaces.
- Upgraded icon HTML to carry V4 classes and semantic icon ids for batch styling.
- Connected camp NPC PNGs through `buildNpcSpriteWithArt`, replacing procedural NPCs whenever real art exists.
- Removed the visible "Q版" positioning from the title footer.
- Replaced all five environment tiles with painted source textures and a reproducible isometric projection pipeline.
- Removed the global canvas brightness penalty after real-device QA showed it crushed character and NPC midtones.

## Next Art Production Queue

1. Add directional/attack animation sheets for player, common monsters, and act bosses; current PNGs are single-frame runtime art.
2. Create separate class portrait variants for title/class select and in-game actor scale.
3. Complete authored combat FX, item/service icons, status icons, and rarity frames from the asset manifest.
4. Replace remaining legacy instructional copy and emoji fallback marks inside operational panels.
5. Skill icon replacement is complete for the current data set: all 67 current class skill definitions have bespoke PNG coverage. New future skills should ship with PNG icons and asset-regression coverage in the same pass.
