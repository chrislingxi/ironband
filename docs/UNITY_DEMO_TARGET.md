# Nightfall 3 Unity 2.5D Demo Target

## Product Contract

The Unity demo is the first acceptance milestone on the path to a complete Act I. It is not a separate prototype and does not replace the Act I target.

- Experience length: 15-20 minutes on a first clear.
- Camera: authored 2.5D isometric presentation with real depth, lighting and collision.
- Content: one complete class, camp, exploration space, common and elite encounters, a three-phase Boss, loot and growth.
- Delivery: high-quality iPhone build plus a reduced-cost iPhone Safari Web build from one Unity project.
- Quality bar: commercial-showcase visuals, readable combat, decisive impact, touch-first interaction and no temporary UI or unframed placeholder art in the acceptance build.

## Reference Interpretation

The supplied reference locks quality, not IP. The demo must reach its density, material separation, lighting hierarchy, combat readability and HUD confidence without copying characters, layouts, iconography, names or environment construction.

## Runtime Architecture

The legacy TypeScript game remains the authoritative source for validated balance concepts, quest sequencing and loot semantics. Unity owns presentation and moment-to-moment runtime behavior.

1. Preserve semantic ids where they reduce migration risk.
2. Re-author movement, animation, collisions, hit reactions, camera, VFX, audio and touch input in Unity.
3. Treat V4 PNG actors as temporary migration bridges only. Acceptance actors require coherent animation sets or authored 3D/2.5D rigs.
4. Keep gameplay deterministic enough for headless combat tests and automated build gates.

## Two Quality Profiles

| Area | iPhone Native | iPhone Safari Web |
|---|---|---|
| Target frame rate | 60 fps | 30-60 fps adaptive |
| Lighting | main shadowed light plus local lights | baked/fake local lights, one shadowed key |
| Textures | ASTC, high-resolution hero/Boss | compressed, reduced mip ceiling |
| VFX | full particles, trails and distortion where supported | pooled particles, no expensive distortion |
| Crowd | full encounter budget | reduced simultaneous enemies if thermal budget requires |
| Content | identical | identical |

## Acceptance Gates

- Player movement, basic attack and four skills have complete anticipation, active, recovery, hit and cancel windows.
- Every damaging action has synchronized animation contact, hit stop, victim reaction, sound, camera response and readable VFX.
- Common enemies have distinct tactical roles; elite and Boss attacks always telegraph before damage.
- HUD is safe-area aware in portrait and landscape and never covers mandatory encounter information.
- The demo builds from a clean checkout through command-line entry points.
- Native and Web builds are tested on real iPhone-class dimensions; final native acceptance requires a physical device run.

## Production Phases

1. Foundation: Unity project, build matrix, deterministic scene, input and combat feedback baseline.
2. Visual target: camp and corrupted wilds, final lighting/material language, hero and enemy animation contract.
3. Combat target: full class kit, common/elite roster, loot and progression loop.
4. Boss target: three phases, arena transformation, cinematic introduction and reward climax.
5. Release: audio mix, UI polish, accessibility, performance budgets, iPhone/Web builds and public playable delivery.
