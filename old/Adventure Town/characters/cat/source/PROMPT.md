# Acquisition record

Generated with the built-in image generation tool on 2026-11-24 with
`transparent_background: true`. The tool did not expose a model version or seed.
The original RGBA PNG is preserved without modification as `turntable.png`.
This is a static 4×4 sheet, not an animated GIF. Angles in `character.json` are
visual estimates of the generated views, not calibrated camera measurements.

## Submitted prompt

Use case: stylized-concept
Asset type: transparent multiview source spritesheet for deterministic 3D voxel reconstruction of a cat companion for Adventure Town.
Primary request: Generate a precise 4 by 4 grid containing 16 orthographic turntable views of ONE identical charming stylized 3D voxel cat. Real transparent RGBA background, including between legs. No drawn grid or labels.
Subject: a small warm ginger tabby cat with cream muzzle, cream chest and cream paws, green eyes, pink inner ears and nose, subtly darker orange block stripes. Large expressive head with triangular ears, compact sturdy quadruped body, four short distinct legs, thick connected tail rising behind in a gentle upright hook. No clothing, collar or props. Actual crisp cubic voxel sculpture matching a polished voxel adventure game, not flat pixel art or smooth sculpture.
Rest pose: standing naturally on all FOUR paws, all paws planted, front and back pairs spaced enough to articulate, tail attached and fixed. No sitting, biped stance, walking, expressions or pose changes between views.
Composition: exactly 16 equal square cells in a 4x4 transparent sheet. Whole cat centered in each cell, same scale, same floor, ample equal margins. Orthographic camera at 5 degrees elevation, near eye level. Total tail/ear height should be similar to the cat's total nose-to-tail length for a compact nearly cubical bounding box.
View order row-major: row 1 front 0 degrees, front-left 22.5, front-left 45, front-left 67.5; row 2 true left profile 90 (nose points screen-left), left-rear 112.5, left-rear 135, left-rear 157.5; row 3 true rear 180, rear-right 202.5, rear-right 225, rear-right 247.5; row 4 true right profile 270 (nose points screen-right), right-front 292.5, right-front 315, right-front 337.5. Rotate rigidly and consistently. Do NOT alternate left and right views or duplicate front views.
Lighting: soft uniform ambient lighting with stable saturated material colors, readable eyes and face, no strong highlights or directional shadows.
Constraints: genuine alpha zero outside the character, no ground plane or cast/contact shadow, no baked checkerboard, no background color, no text, watermarks, gutters, outlines, borders, other characters. Keep identical anatomy, voxel size, markings, head size, paws, tail height and ear positions in all 16 views. This is SOURCE ART for a 3D reconstruction, so camera correctness and invariant rest pose matter.
