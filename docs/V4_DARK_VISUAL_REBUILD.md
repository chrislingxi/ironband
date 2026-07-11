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
- Added a dedicated Amazon bow-draw attack pose so ranged attacks no longer reuse a generic idle/lunge silhouette.
- Replaced the inventory CSS mannequin with the active class PNG and carried the same class art into the character identity header.
- Established the base-item icon route and delivered the first six common loot icons across inventory, equipment and town commerce.
- Expanded item art to all six weapons plus both helms and shields; 12 of 18 base-item identities now have authored PNGs.
- Added dedicated attack poses for all three classes and presentation motion for single-frame monsters.
- Added original player-facing identities for all five act Bosses plus a shared Shattered Crown arena altar and readable attack telegraphs.
- Added black-iron slots, rarity frames, cooldown mask, four status icons, persistent premium loot beams and element-specific impact silhouettes.
- Reduced each deployed runtime asset tree from roughly 47 MB to 34 MB and fixed deterministic localhost visual QA captures.

## Post-V4 Expansion Queue

These are post-release expansion opportunities, not blockers for the V4 vertical slice:

1. Expand two-pose player presentation into full directional run/attack atlases when additional combat animation budget is available.
2. Add campaign-specific arena variants around the shared altar as new acts receive bespoke geometry.
3. Continue replacing semantic fallback icons only when new systems or skills are introduced; all 67 current skills and all current service/status keys have authored PNG coverage.
