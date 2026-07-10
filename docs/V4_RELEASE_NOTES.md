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

## Class Art Pass - Title Screen Rebuild

This pass replaces the most visible chibi/Q-style class portraits on the title screen:

- Replaced Amazon, Barbarian, and Sorceress class PNGs with full-body dark fantasy character art.
- Tuned mobile title-card image sizing so the new character silhouettes are larger and more readable on 390px-wide phones.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the three class PNGs.

The first screen now presents the game as a darker ARPG instead of a cute mobile-card prototype.

## Runtime Silhouette Pass - Combat Readability

This pass reduces the quality drop between the title screen and the first playable combat scene:

- Increased runtime player texture height so Amazon/Barbarian/Sorceress silhouettes remain readable on mobile.
- Increased camp NPC PNG scale so town services no longer collapse into tiny marker figures.
- Kept logic hitboxes unchanged; only the visual texture layer is larger.

## Camp Prop Pass - Town Memory Points

This pass gives the first town scene a stronger sense of place:

- Added transparent V4 PNG props for `campfire.png`, `exit_gate.png`, and `blacksmith_anvil.png`.
- Added a static prop layer in the isometric scene; props do not affect collision or gameplay logic.
- Placed a campfire at the town center, an exit gate near the area transition, and a forge workstation near the blacksmith.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the three prop PNGs.

## Skill Icon Pass - Amazon PNG Upgrade

This pass upgrades the most-used Amazon HUD buttons from generic SVG symbols to premium V4 PNG icons:

- Added PNG versions of Magic Arrow, Multiple Shot, and Frost Arrow.
- Updated `iconImg` so those three semantic keys prefer PNG while the rest of the icon library continues to use SVG.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the three PNG skill icons.

## Inventory Page Pass - Paper Doll Equipment

This pass rebuilds the inventory page from a flat list into a darker ARPG equipment screen:

- Replaced the equipped-item list with a paper-doll layout for weapon, helm, armor, shield, gloves, boots, belt, ring, and amulet.
- Added rarity-framed loot cells for the bag grid so magic, rare, and unique items read as distinct materials.
- Rebalanced portrait and landscape layouts so the inventory no longer becomes a full-screen blocker on mobile landscape.
- Removed instructional filler copy from the default detail panel; the page now opens as a finished UI surface instead of a prototype help screen.

## Camp NPC Art Pass - Mature Dark Fantasy Cast

This pass replaces the Q-style camp NPC art with mature dark fantasy PNG sprites:

- Replaced Akara, Kashya, Charsi, Gheed, Warriv, and Cain with 512x768 transparent character art.
- Kept each NPC's role readable at mobile scale: priestess orb, rogue bow, blacksmith hammer, gambler purse, caravan map/lantern, scholar staff/scrolls.
- Updated both runtime and GitHub Pages asset copies.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of all six camp NPC sprites.

## Common Monster Art Pass - Act I Readability

This pass replaces the highest-frequency early combat monsters with mature dark fantasy PNG sprites:

- Replaced Fallen, Zombie, Skeleton, Shaman, Archer, and Brute with transparent V4 monster art.
- Increased generic runtime monster sprite height so the new art reads in the first five minutes without changing collision or combat values.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the six common monster sprites.

## Skill Icon Pass - Barbarian and Sorceress Core

This pass broadens premium PNG skill icons beyond the Amazon starter kit:

- Added PNG icons for Bash, Double Swing, War Cry, Ice Bolt, Fire Bolt, and Charged Bolt.
- Added skill-id based icon routing so a combat skill can use a bespoke PNG without replacing generic equipment/system icons that share the same emoji.
- Updated HUD and skill-tree rendering to pass skill ids into the icon resolver.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the six new skill PNGs.

## Skill Icon Pass - Amazon Bow Kit

This pass closes the most visible Amazon bow fantasy gap after the starter icons:

- Added PNG icons for Fire Arrow, Exploding Arrow, Ice Arrow, Guided Arrow, Strafe, and Valkyrie.
- Routed those Amazon skill ids through the same bespoke icon layer used by the HUD and skill tree.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the six new Amazon skill PNGs.

## Title Screen Art Pass - Cathedral Gate

This pass upgrades the first impression of the game before combat starts:

- Added a full-screen dark gothic cathedral-gate background for the title screen.
- Reworked title-screen layering so class cards sit on a real scene instead of a pure CSS gradient.
- Kept the class-select flow and mobile safe-area structure intact while increasing card material contrast.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the title background.

## Landscape HUD Pass - Compact Side Tools

This pass reduces accidental obstruction in short landscape play:

- Collapsed the six left-side utility buttons into a compact bottom row in landscape view.
- Made the joystick dead zone switch with the responsive HUD layout instead of blocking a tall left strip in landscape.
- Added semantic roles and data-ui hooks to the side/corner utility buttons for more reliable self-tests.

## Skill Icon Pass - Sorceress Early Kit

This pass reduces the remaining early-game skill-tree quality drop for Sorceress:

- Added PNG icons for Frozen Armor, Ice Blast, Warmth, Inferno, Static Field, and Telekinesis.
- Routed those Sorceress skill ids through the bespoke PNG icon layer.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the six new Sorceress skill PNGs.

## Skill Icon Pass - Barbarian Early Kit

This pass reduces the remaining early-game skill-tree quality drop for Barbarian:

- Added PNG icons for Stun, Double Throw, Sword Mastery, Axe Mastery, Howl, and Shout.
- Routed those Barbarian skill ids through the bespoke PNG icon layer.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the six new Barbarian skill PNGs.

## Monster Runtime Pass - Boss Identity Routing

This pass fixes an art-routing inconsistency before adding more monster assets:

- Preserved distinct runtime subKinds for Mephisto, Diablo, and Baal instead of routing them through the Andariel fallback.
- Expanded Boss texture scaling recognition to all five act bosses.
- Added Hound and Spitter monster PNGs to the V4 asset regression test, since their existing art already meets the current dark-fantasy bar.

## UI Material Pass - Black Iron Panels

This pass upgrades the global material base used by most panels and skill buttons:

- Replaced the light parchment/wood `ui/panel.png` with a dark leather and blackened iron panel texture.
- Replaced the bright silver `ui/btn_frame.png` with a tarnished black iron and bronze skill-button frame.
- Kept the same asset keys so inventory, skill tree, character, town, settings, and HUD surfaces inherit the darker material treatment without code churn.

## Skill Icon Pass - Sorceress Power Kit

This pass extends Sorceress PNG coverage into the mid/late fantasy spells players recognize:

- Added PNG icons for Frost Nova, Glacial Spike, Blizzard, Frozen Orb, Fire Ball, and Meteor.
- Routed those Sorceress skill ids through the bespoke PNG icon layer.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the six new Sorceress power-skill PNGs.

## Skill Icon Pass - Barbarian Tree Completion

This pass removes the largest remaining Barbarian skill-tree quality drop:

- Added reproducible PNG icons for Concentrate, Frenzy, Whirlwind, Berserk, Mace Mastery, Increased Stamina, Increased Speed, Iron Skin, Natural Resistance, Weapon Block, Taunt, Battle Cry, Battle Orders, and Battle Command.
- Routed those fourteen Barbarian skill ids through the bespoke PNG icon layer used by HUD and skill tree surfaces.
- Added `npm run assets:v4-barbarian-icons` so the Barbarian icon batch can be regenerated without external copyrighted source art.
- Extended the V4 asset regression test to require both dev and GitHub Pages copies of the fourteen new skill PNGs.

## Skill Icon Pass - Full Current Tree Coverage

This pass closes the remaining current skill-icon coverage gap:

- Added reproducible PNG icons for Amazon passive/magic skills, javelin/spear skills, and the remaining Sorceress fire/lightning utility skills.
- Routed every current class skill id in `amazon.ts`, `barbarianTree.ts`, and `sorceress.ts` through the bespoke PNG icon layer.
- Added `npm run assets:v4-remaining-skill-icons` so the final skill icon batch can be regenerated without external copyrighted source art.
- Expanded the V4 asset regression test so all current skill PNGs must exist in both dev and GitHub Pages asset locations.

## Environment Art Pass - Painted Ground Set

This pass replaces the five procedural-looking ground tiles with an authored source-art pipeline:

- Added 768x768 painted source textures for wilderness, town, desert, hell, and snow under `art_source/v4/tiles/`.
- Rebuilt `npm run assets:v4-tiles` to decode the source PNGs, project them into 2:1 isometric diamonds, feather opposite edges for repeatability, apply a shared combat-readable grade, and write identical dev/Pages copies.
- Removed straight crossing crack lines and flat color-noise treatment that made the previous tiles read like generated placeholders.
- Lifted runtime canvas midtones so dark-fantasy atmosphere comes from material, local light, and palette instead of a global near-black exposure penalty.
- Added regression checks for all five source textures, all ten runtime copies, exact 256x128 RGBA output, and byte-identical dev/Pages assets.
- Added one release-aware asset URL builder for textures, portraits, UI materials, icons, and audio so GitHub Pages/iOS caches cannot combine new code with stale art.

Visual QA passed at 1280x720, 390x844, and 844x390. Inventory and skill-tree panels opened and closed successfully in landscape, page overflow remained zero, and the browser console stayed clean.
