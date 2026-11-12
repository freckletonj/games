# Asset provenance and cohesion

The Phaser rebuild intentionally preserves the **painted storybook** visual identity.

**Original Wonderwood assets:** all nine character atlases and their manifests,
three scenic backdrops, and the flora/props/landmarks/effects sheets are imported
from `src/assets/` on this repository's main branch. These are the same
original paintings used by the existing Canvas build, not an incompatible new
character pack.

**Open-source CC0 pack:** six PNGs from Kenney's *Background Elements
Remastered* (cloud1, cloud3, treeLong, treePine, bush1, moonFull).
Source: https://kenney.nl/assets/background-elements-redux (publisher's pack)
Mirror: https://github.com/shorepine/kenney/tree/main/2d/Background%20Elements%20Remastered
License: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
Use: restrained distant silhouettes, small bushes and sky details. None
replaces an interactive creature, collider, or native painted foreground prop.

**Engine:** Phaser 4.2.1, MIT license:
https://github.com/phaserjs/phaser/blob/v4.2.1/LICENSE.md

Keep scene art and collisions independent. Character sprites use original
per-atlas foot pivots and animation frame definitions. Do not stretch source
artifacts to different x/y scales; use proportional scaling throughout.
