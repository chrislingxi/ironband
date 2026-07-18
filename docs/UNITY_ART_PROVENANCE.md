# Unity Art Provenance

Unity production assets are tracked separately from the legacy web asset contract. Every generated or externally sourced asset must have an origin, intended use, and replacement status.

| Asset | Origin | Intended use | Status |
|---|---|---|---|
| `Art/Environment/ashen-courtyard-albedo-v1.png` | OpenAI built-in image generation, 2026-07-15 | Ashen Approach courtyard floor albedo | Authored v1; material maps and true seamless edge pass pending |
| `Art/Environment/ashen-gate-facade-v1.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-15 | Ashen Approach sealed fortress entrance | Authored v1; animation and separate emissive flame pass pending |
| `Art/Bosses/ashen-castellan-v1.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Original three-phase demo Boss | Authored v1 key sprite; animation sheet pending |
| `Art/Bosses/castellan-*-v2.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Ashen Castellan three phase and three attack animation set | Authored v2 production animation set |
| `Art/Characters/duskweaver-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Duskweaver player character and rune-bow combat silhouette | Authored v2 key sprite; directional animation sheet pending |
| `Art/Characters/duskweaver-*-v3.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Duskweaver idle, run, attack, hit and defeated animation set | Authored v3 production animation set |
| `Art/Monsters/bloodbound-fallen-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Bloodbound Fallen ordinary melee enemy | Authored v2 key sprite; directional animation sheet pending |
| `Art/Monsters/bloodbound-*-v3.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Bloodbound Fallen advance, cleave, hit and defeated state set | Authored v3 production action set |
| `Art/Monsters/coldbone-shieldguard-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Coldbone Shieldguard defensive line enemy | Authored v2 key sprite; directional animation sheet pending |
| `Art/Monsters/coldbone-*-v3.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal, component cleanup and normalized frame alignment, 2026-07-18 | Coldbone Shieldguard advance, guarded strike, hit and defeated state set | Authored v3 production action set |
| `Art/Monsters/blood-ash-hound-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-18 | Blood-Ash Hound fast flanking enemy | Authored v2 key sprite; directional animation sheet pending |
| `Art/Monsters/blood-ash-hound-*-v3.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal, component cleanup and normalized frame alignment, 2026-07-18 | Blood-Ash Hound run, pounce, hit and defeated state set | Authored v3 production action set |
| `Art/Monsters/blue-ash-juggernaut-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-18 | Blue-Ash Juggernaut heavy and elite encounter anchor | Authored v2 key sprite; directional animation sheet pending |
| `Art/Monsters/blue-ash-juggernaut-*-v3.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Blue-Ash Juggernaut advance, overhead slam, hit and defeated state set | Authored v3 production action set |
| `Art/UI/panel-v2.png` | OpenAI built-in image generation plus local chroma-key removal and alpha-bound crop, 2026-07-18 | Shared 9-slice HUD, objective, Boss and interaction panel | Authored v2 production frame |
| `Art/Icons/skill-chain-arc-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Chain Arc skill icon | Authored v2 production icon |
| `Art/Icons/skill-static-dominion-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Static Dominion skill icon | Authored v2 production icon |
| `Art/Icons/skill-phase-step-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Phase Step skill icon | Authored v2 production icon |
| `Art/Icons/skill-frozen-star-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Frozen Star skill icon | Authored v2 production icon |
| `Art/UI/hero-portrait-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Duskweaver hero HUD portrait | Authored v2 production medallion |
| `Art/UI/vitality-orb-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Player vitality HUD vessel | Authored v2 production vessel |
| `Art/UI/aether-orb-v2.png` | OpenAI built-in image generation plus local sheet crop and chroma-key removal, 2026-07-18 | Player aether HUD vessel | Authored v2 production vessel |
| `Art/UI/joystick-v2.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and radial split, 2026-07-18 | Touch movement outer ring | Authored v2 production control |
| `Art/UI/joystick-core-v2.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and radial split, 2026-07-18 | Touch movement responsive core | Authored v2 production control |
| `Art/NPCs/mara-ash-warden-v2.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Mara, Ash Warden camp quest NPC | Authored v2 production sprite |
| `Art/NPCs/veyra-forgekeeper-v2.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Veyra, Forgekeeper camp NPC | Authored v2 production sprite |
| `Art/NPCs/sister-elowen-v2.png` | OpenAI built-in image generation plus local sheet crop, chroma-key removal and normalized frame alignment, 2026-07-18 | Sister Elowen camp ritual NPC | Authored v2 production sprite |

## Ashen Courtyard Prompt Contract

- Original dark-fantasy basalt flagstone floor with worn joints, soot, ash, restrained blood stains and bronze fragments.
- Reference image used only for quality, material density, lighting hierarchy and mood.
- No copied characters, UI, symbols, architecture, names or franchise motifs.
- Flat top-down presentation without props, text, logos, borders or baked directional shadows.

## Ashen Gate Prompt Contract

- Original wide basalt fortress entrance with battered towers, iron braces, torn unmarked cloth, restrained spikes, ember braziers and cold arcane seals.
- Built as an isolated 3/4 isometric environment sprite; green chroma background removed locally with soft matte and despill.
- No copied emblems, symbols, layouts, names or architecture from the quality reference.

## Ashen Castellan Prompt Contract

- Original fallen fortress commander with layered black-iron and basalt armor, cold ward chains, an ember gauntlet and an asymmetrical cleaver-polearm.
- Isolated 3/4 isometric full-body sprite; green chroma background removed locally with soft matte and despill.
- Explicitly excludes identifiable characters, symbols, silhouettes and equipment from existing dark-fantasy franchises.

## Ashen Castellan Animation Prompt Contract

- Six consistent full-body frames preserve the authored Castellan armor, ward chains, ember gauntlet and asymmetrical cleaver-polearm across three phases and their signature attacks.
- Phase identity changes through pose and restrained cyan, ember and magenta ward states rather than random costume changes, tint-only swaps or gross scaling.
- Local processing only removes chroma, normalizes the shared canvas and aligns the pivot; no existing franchise animation or Boss silhouette was copied.

## Duskweaver Prompt Contract

- Original female arcane ranger-sorceress in blackened steel, oxblood leather and a storm-blue mantle, carrying a compact lightning rune bow.
- Full-body isolated production sprite with warm rim light, cold key light, mobile-readable silhouette and locally removed green chroma background.
- The supplied gameplay reference informed only finish, material richness, readability and lighting hierarchy; no character, costume, weapon, symbol or UI was copied.

## Duskweaver Animation Prompt Contract

- Eight consistent full-body frames preserve the authored Duskweaver face, silver hair, armor, storm-blue mantle and compact rune bow across idle, movement, attack, hit and defeated states.
- Every frame shares the same isometric camera, scale, ground contact and lighting contract; local processing only removes chroma, normalizes the shared canvas and aligns the pivot.
- No animation pose, costume element, weapon design or silhouette was copied from an existing franchise.

## Bloodbound Fallen Prompt Contract

- Original wiry infernal raider with scarred red skin, cracked swept horns, ash-black bone-and-iron armor and a low hooked cleaver.
- Kept deliberately smaller and warmer than the player, elite and Boss silhouettes; no chibi proportions, toy surfaces, gore or franchise-specific motifs.
- Uses the Duskweaver production asset only as the internal lighting, material and camera consistency reference.

## Bloodbound Fallen Animation Prompt Contract

- Four consistent full-body states preserve the authored red skin, swept horns, bone-and-iron armor and hooked cleaver across advance, cleave, hit and defeated poses.
- Every state shares the same isometric camera, grounded scale and lighting contract; local processing only removes chroma, normalizes the canvas and aligns the pivot.
- No animation pose, costume element, weapon design or silhouette was copied from an existing franchise.

## Coldbone Shieldguard Prompt Contract

- Original skeletal line fighter in pitted black plate with a battered broad shield, restrained cyan ward marks and a rusted sword.
- Its shield-first silhouette communicates defensive pressure at mobile scale while remaining smaller and less ornate than elites and the Boss.
- Uses the Duskweaver production asset only as the internal lighting, material and camera consistency reference; no franchise emblems or recognizable equipment were copied.

## Coldbone Shieldguard Animation Prompt Contract

- Four consistent full-body states preserve the authored skull, cyan eyes, pitted black plate, broad ward-marked shield and rusted sword across advance, guarded strike, hit and defeated poses.
- The shield remains the dominant readable silhouette during movement and frontal mitigation; local processing only removes chroma, clears disconnected sheet spill, normalizes the canvas and aligns the pivot.
- No animation pose, equipment design, emblem or silhouette was copied from an existing franchise.

## Blood-Ash Hound Prompt Contract

- Original lean corrupted war hound with charcoal hide, restrained ember fissures, asymmetrical basalt armor and a battered black-iron muzzle.
- Low stalking posture and long-limbed silhouette communicate speed and flanking pressure at mobile scale without cute, toy-like or excessively gory treatment.
- Uses the Duskweaver and Bloodbound Fallen assets only as internal camera, lighting and material references; no franchise creature design or symbols were copied.

## Blood-Ash Hound Animation Prompt Contract

- Four consistent full-body states preserve the authored charcoal hide, ember fissures, asymmetrical basalt armor, back spikes, iron muzzle and long tail across run, pounce, hit and defeated poses.
- The airborne pounce silhouette remains active across the telegraph and landing window; local processing only removes chroma, clears disconnected sheet spill, normalizes the canvas and aligns the pivot.
- No creature animation, armor treatment or silhouette was copied from an existing franchise.

## Blue-Ash Juggernaut Prompt Contract

- Original fortress enforcer in layered pitted black-iron and basalt plate, oxblood bindings, restrained blue-ash ward seals and a caged helm.
- Broad shoulder bastion, grounded stance and a practical two-handed maul-cleaver communicate slow overhead impact and elite mass at mobile scale.
- Uses project character assets only as internal camera, lighting and material references; no recognizable franchise armor, weapon, insignia or silhouette was copied.

## Blue-Ash Juggernaut Animation Prompt Contract

- Four consistent full-body states preserve the authored caged helm, massive basalt plate, shoulder bastions, chains, oxblood bindings, cyan ward seals and two-handed maul-cleaver across advance, overhead slam, hit and defeated poses.
- The vertical wind-up silhouette remains active through the long slam telegraph; local processing only removes chroma, normalizes the canvas and aligns the pivot.
- No animation pose, armor treatment, weapon design or silhouette was copied from an existing franchise.

## Nightfall HUD Panel Prompt Contract

- Original front-facing nine-slice frame built from forged black iron, basalt, restrained antique brass, oxblood bindings and sparse cold-cyan ward lines.
- Symmetric protected corners, quiet stretchable edges and a low-contrast charcoal center preserve readability across compact mobile HUD dimensions.
- Contains no copied crest, skull, icon, text, layout or recognizable franchise ornament.

## Duskweaver Skill Icon Prompt Contract

- Original four-icon family: a chained storm arc, a concentric static dominion, a dissolving phase step and a crystalline frozen star.
- Shared front-facing black-iron bevel, basalt field, antique-brass rim and cold emissive lighting preserve consistency and mobile readability.
- Contains no text, copied ability symbol, recognizable franchise iconography or existing game UI layout.

## Nightfall HUD Vessel Prompt Contract

- Original Duskweaver portrait, crimson vitality vessel, cobalt aether vessel and split touch-control ring built as one coherent black-iron and antique-brass family.
- The portrait derives only from the project's authored Duskweaver character; the vessels and control contain no copied skull, frame, symbol or recognizable existing-game HUD design.
- Separate transparent joystick ring and center assets preserve live input motion instead of presenting a static decorative control.

## Emberwatch NPC Prompt Contract

- Original camp trio with distinct professions: Mara's ward spear and buckler, Veyra's forging hammer and ember tongs, and Elowen's blue-flame ashwood reliquary staff.
- Shared isometric camera, grounded human scale, warm camp rim light and cool key light align the NPCs with the authored Duskweaver production set.
- No old compatibility character appearance, copied costume, familiar franchise symbol or existing NPC silhouette was retained.
