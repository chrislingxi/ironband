# Unity Art Provenance

Unity production assets are tracked separately from the legacy web asset contract. Every generated or externally sourced asset must have an origin, intended use, and replacement status.

| Asset | Origin | Intended use | Status |
|---|---|---|---|
| `Art/Environment/ashen-courtyard-albedo-v1.png` | OpenAI built-in image generation, 2026-07-15 | Ashen Approach courtyard floor albedo | Authored v1; material maps and true seamless edge pass pending |
| `Art/Environment/ashen-gate-facade-v1.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-15 | Ashen Approach sealed fortress entrance | Authored v1; animation and separate emissive flame pass pending |
| `Art/Bosses/ashen-castellan-v1.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Original three-phase demo Boss | Authored v1 key sprite; animation sheet pending |
| `Art/Characters/duskweaver-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Duskweaver player character and rune-bow combat silhouette | Authored v2 key sprite; directional animation sheet pending |
| `Art/Monsters/bloodbound-fallen-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Bloodbound Fallen ordinary melee enemy | Authored v2 key sprite; directional animation sheet pending |
| `Art/Monsters/coldbone-shieldguard-v2.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Coldbone Shieldguard defensive line enemy | Authored v2 key sprite; directional animation sheet pending |

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

## Duskweaver Prompt Contract

- Original female arcane ranger-sorceress in blackened steel, oxblood leather and a storm-blue mantle, carrying a compact lightning rune bow.
- Full-body isolated production sprite with warm rim light, cold key light, mobile-readable silhouette and locally removed green chroma background.
- The supplied gameplay reference informed only finish, material richness, readability and lighting hierarchy; no character, costume, weapon, symbol or UI was copied.

## Bloodbound Fallen Prompt Contract

- Original wiry infernal raider with scarred red skin, cracked swept horns, ash-black bone-and-iron armor and a low hooked cleaver.
- Kept deliberately smaller and warmer than the player, elite and Boss silhouettes; no chibi proportions, toy surfaces, gore or franchise-specific motifs.
- Uses the Duskweaver production asset only as the internal lighting, material and camera consistency reference.

## Coldbone Shieldguard Prompt Contract

- Original skeletal line fighter in pitted black plate with a battered broad shield, restrained cyan ward marks and a rusted sword.
- Its shield-first silhouette communicates defensive pressure at mobile scale while remaining smaller and less ornate than elites and the Boss.
- Uses the Duskweaver production asset only as the internal lighting, material and camera consistency reference; no franchise emblems or recognizable equipment were copied.
