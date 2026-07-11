# V4 Character Pose Sources

`amazon_attack_source.png` was created with the built-in OpenAI image generation tool from the existing Ironband Amazon as the identity and costume reference. The production prompt locked the same face, dark ponytail, bronze armor, teal cloth, bow, quiver, palette, and rendering style, then changed only the pose to a full-body three-quarter bow draw aimed screen-right on a flat magenta key background.

`barbarian_attack_source.png` and `sorceress_attack_source.png` use the same identity-preserving workflow. The Barbarian changes only to an overhead two-handed axe wind-up on a flat green key; the Sorceress changes only to a forward lightning/frost cast with her original staff and costume on a flat magenta key.

Runtime alpha assets are produced with the shared chroma-key removal helper, edge contraction, despill, and a 512x768 delivery resize. Keep the feet at a bottom-center anchor and each complete weapon silhouette inside frame so left/right runtime mirroring remains readable.
