# V4 Painted Tile Sources

These five 768x768 source textures were created for Ironband with the built-in OpenAI image generation tool on 2026-07-11. They are original ground-material studies and do not use extracted or copied game assets.

Shared production prompt:

> Production-quality hand-painted realistic ground texture for an original premium dark-fantasy isometric action RPG. Perfectly top-down orthographic square, diffuse ambient light, physically believable material breakup, seamless opposing edges, no perspective, border, vignette, focal prop, text, watermark, UI, runes, weapons, footprints, straight grid, crossing scratches, checkerboard repetition, or copyrighted franchise symbols. Intended for downsampling and projection into a 2:1 isometric diamond.

Biome variants:

- `wilderness_source.png`: damp olive earth, slate, roots, moss, gravel, natural erosion.
- `town_source.png`: worn limestone and fieldstone in packed earth, soot, mortar, iron-rich stains.
- `desert_source.png`: ochre sand, cracked clay, sandstone fragments, gravel, wind erosion.
- `hell_source.png`: scorched basalt, ash, short organic ember fissures, cooled lava crust.
- `snow_source.png`: dirty compacted snow, fractured blue-gray slate, frost, grit, ice veins.

Do not edit the generated `assets/tile/*.png` or `public/assets/tile/*.png` directly. Replace a source texture and run `npm run assets:v4-tiles` so projection, grading, alpha, and mirrored output paths remain consistent.
