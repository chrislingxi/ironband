# Unity Art Provenance

Unity production assets are tracked separately from the legacy web asset contract. Every generated or externally sourced asset must have an origin, intended use, and replacement status.

| Asset | Origin | Intended use | Status |
|---|---|---|---|
| `Art/Environment/ashen-courtyard-albedo-v1.png` | OpenAI built-in image generation, 2026-07-15 | Ashen Approach courtyard floor albedo | Authored v1; material maps and true seamless edge pass pending |
| `Art/Environment/ashen-gate-facade-v1.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-15 | Ashen Approach sealed fortress entrance | Authored v1; animation and separate emissive flame pass pending |
| `Art/Bosses/ashen-castellan-v1.png` | OpenAI built-in image generation plus local chroma-key removal, 2026-07-17 | Original three-phase demo Boss | Authored v1 key sprite; animation sheet pending |

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
