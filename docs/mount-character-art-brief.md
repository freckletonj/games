# Mount character-art production brief

**Implemented:** Unicorn and Pegasus now use the generated original painted artwork as two compact, transparent 4×2 eight-frame AVIF character atlases in `src/assets/characters/{unicorn,pegasus}/sheet.avif`. Their manifests provide idle, gallop, jump/flight, eat, happy, and recovery mappings; the game embeds them into the single offline HTML and no longer renders interim Canvas mount bodies. Their fixed foot anchors and separate player saddle positioning are checked in Chromium. This brief now serves as the remaining visual-polish acceptance specification; manual art sign-off and a more fully articulated wingbeat cycle remain open under the separate visual QA issue.

## Locked silhouette

Both species are profile quadrupeds facing right in source art; the engine mirrors left. Do not bake a rider into any pose: the real active player sprite is drawn separately at the saddle.

**Unicorn:** Ivory/lilac coat, distinctive elegant forehead horn, jewel-pink and pearl-gold mane, four distinct legs, clear gallop and high-leap silhouettes. No wings.

**Pegasus:** Ivory/blue coat, gold mane, paired feathered wings with a recognizable folding/extending cycle. No horn. Flying silhouette should be legible at game scale.

Both should use the same richly painted storybook light and texture family as the existing character atlases. No cutout sky or scenery, ground shadows, UI, text, fake platforms, or decorations baked into transparent sprite pixels. The silhouette should read at 45–70 world units across and have a stable foot anchor.

## Eight RGBA poses

For each species, deliver eight individual transparent PNG poses, with the **same identity and anatomy in every pose**:

- idle-0.png, idle-1.png — subtle breathing/blinking
- run-0.png through run-3.png — coherent four-phase gallop
- jump.png — unicorn leap or Pegasus extended-wing ascent
- hurt.png — friendly startled/recovery pose

Place files in src/assets/characters/unicorn/poses/ and src/assets/characters/pegasus/poses/ and pack with:

    python scripts/pack-character.py src/assets/characters/unicorn --cell 444 --height 340 --world-scale 0.15
    python scripts/pack-character.py src/assets/characters/pegasus --cell 444 --height 340 --world-scale 0.15

The existing packer outputs a fixed-pivot 4×2 sheet.png and manifest.json. Tune worldScale from **real in-game screenshots** so feet contact terrain and the rider sits on the saddle. Do not change collision just to compensate for mismatched art. WW.art.drawMount already delegates to the sprite atlas when it is ready, then falls back to the temporary illustration.

The integrated sheets now have eight distinct usable pose frames, but Pegasus currently holds the painted wings-extended jump frame during flight with subtle secondary motion. Additional authored wing-fold/flap frames would improve sustained flight without changing input/physics. The master generated output and cleaned atlas should be reviewed for identity, alpha edges, palette, and anatomical continuity at native game scale.

## Acceptance

Review every frame for species identity, head and horn/wing geometry, palette, tack, foot pivot, alpha fringes, scale and left/right mirroring. Compare idle/eat/run/jump/mounted poses over actual Meadow and Summit/Cloud scenery at **480×270 in-game resolution**.

Render both mounts with the real protagonist and with Player 2, confirm that riding poses preserve the actual player identity, and check that mounts never look ungrounded when standing. Dedicated flight and gallop poses should be clearly better than the interim Canvas drawing. Confirm final atlases are embedded in the offline HTML with zero network requests.

Art sign-off remains a human visual QA task; existing pixel-difference tests cannot establish artistic continuity.
