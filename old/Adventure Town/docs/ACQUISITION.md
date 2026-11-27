# Default AI character acquisition prompt

Use this specification for every new character. Fill in the appearance block and, where possible, attach a high-quality reference of that exact character. Preserve the original generated source and record the actual submitted prompt, model/settings and any angle annotations in the character's `source/` folder when available.

## Reusable prompt

> Generate a high-quality orthographic 360-degree turntable of a single polished stylized 3D voxel game character.
>
> **Character appearance:** [Describe silhouette, age/style, head and hair, facial features, outfit, palette, accessories, footwear, asymmetric details, and relative proportions. Use the supplied identity reference if one is provided.]
>
> **Geometry and visual style:** Show an actual three-dimensional voxel sculpture, constructed from crisp axis-aligned cubic steps and coherent volumes. Give the character clear readable facial features, purposeful clothing and accessory geometry, and consistent voxel size. Do not render a flat pixel-art sprite, smooth sculpt, painterly illustration or outline-heavy drawing. Preserve every feature of the same character from every angle, including the back and sides. No changes in proportions, hairstyle, clothing, accessories, voxel scale, colors or identity between frames.
>
> **Rest pose:** Neutral symmetrical wide A-pose, upright, shoulders relaxed, arms angled out far enough that both hands and forearms are visibly separated from the waist, legs separated, feet flat on the same level, fingers or mitten-like hands fixed. No walking, breathing, head rotation, gesturing, changing expressions or pose changes. All accessories remain fixed to their attachment points. Keep the whole character in frame, including hair, footwear and fingertips.
>
> **Camera:** Orthographic projection, fixed scale, fixed camera elevation near eye level, fixed target, no zoom or perspective changes. Rotate the entire character rigidly about its vertical axis or orbit the camera around that axis, not both. Begin with the front view and rotate consistently toward the character's left (the front turns toward screen-left). Sample one revolution at equal angular increments: 0, 360/N, 2×360/N, …, (N−1)×360/N degrees. Do not duplicate the starting frame at the end. Keep the character centered with ample identical margins and an unchanged foot height, root position and framing.
>
> **Lighting and color:** Soft uniform ambient lighting and stable material colors. No animated lights, moving highlights, strong directional shadows, dramatic contrast or changing exposure. Keep color and texture correspondences coherent as the character rotates. Do not add a ground plane, contact shadow, glow or vignette.
>
> **Mandatory background:** Real transparent alpha in every frame, including the openings between arms, torso and legs. No solid backdrop, checkerboard baked into RGB, ground, colored halo, edge fringe or gradient. Outside the character alpha must be zero. No captions, labels, numbers, watermarks, panel borders, gutters, scene props or other characters.
>
> **Output:** Prefer 36–72 distinct angular observations if the generator supports them. Use lossless RGBA PNG frames or an evenly divided transparent spritesheet where available; an animated transparent GIF is acceptable. For sheets, each cell has identical dimensions and the views appear in row-major angular order. Never crop or overlap a character across cells. Do not use interpolated or duplicated frames as extra geometry observations. Keep a seamless rotational loop.

The default first-pass source may be a 4×4 sheet (16 frames); ask for more genuinely different angles only when supported. A second orbit at about 30° elevation of the same fixed pose and identity is a future acquisition experiment, not yet a supported joint input to the compiler.

## Review before accepting the result

- Inspect the decoded RGBA frames. Ensure transparency is genuine and the character is the largest connected component. The compiler thresholds alpha at 128 and retains that component; detached accessories may disappear.
- Check angular order and actual apparent angles. Generated viewpoints are not calibrated just because the prompt specifies exact degrees. Record estimated angles in `character.json` rather than forcing a visibly uneven sequence into equal spacing.
- Check the side and rear views, the gaps at the hands and legs, and consistent height and root position. Reject obvious morphing, missing accessories and clipping.
- Prefer many coherent views over many inconsistent ones. GIF has binary transparency and a limited palette; use RGBA PNG when practical. Playback rate itself is not geometric information.

For an identity-preserving regeneration, attach the approved character reference and change only the intended acquisition conditions. Do not silently replace the canonical source while tuning reconstruction.
