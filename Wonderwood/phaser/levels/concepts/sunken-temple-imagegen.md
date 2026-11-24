# Sunken Temple · image-model art handoff (PR #19)

The source of truth is [sunken-temple.json](../../levels/sunken-temple.json) and the production 60 Hz Temple rules. **Do not use a generated picture to infer collision, water height, route state, or object pivots.** This handoff is for the first experimental chapter only.

## Reproduce conditioning images

From the `Wonderwood/` directory:

```sh
node phaser/scripts/export-future-chapter-guides.mjs sunken-temple
python phaser/scripts/render-temple-art-studies.py
```

The exporter writes to `dist/future-chapter-guides/sunken-temple/`. The first command produces exact-size **3584 × 1024** semantic PNGs, four simulation-derived PNG material/state frames, and the new vector art-direction studies. The second renders the vector studies as PNG using Chromium, including true-alpha *illustrative* movable-object studies. CI uploads everything as the `experimental-geometry-review` artifact.

The critical inputs for image generation are `world-physical-rock.png`, `world-static-solid.png`, the four `low-tide.png` / `high-tide.png` / `valve-fill.png` / `wheel-finale.png` images, and `imagegen-handoff.json`. The **static-water mask is empty by design**: the four basins change height at runtime; do not bake any tide, waterline, or raft into the static scene. `composition-study.png` and the `context-*.png` images are **deterministically illustrated layout/context references**, not outputs of an AI image model, not painted approvals, and not used by the game. They illustrate the desired mood while keeping contact silhouettes from the compiler.

## Global image-model prompt

Supply the *entire* world-physical-rock image as image conditioning, one approved Wonderwood scene painting as a style reference (for example the existing Stonewake Hollow painting), the composition study as optional lighting reference, and the four exact-state PNGs for semantic context.

> Paint a single, compositionally coherent, hand-painted 2D side-view Wonderwood environment: **The Sunken Temple**. Weathered coral-sandstone temple, luminous jade and deep-teal atmosphere, warm angled sunbeams, hanging gardens, carved weathered faces, tiled sluice architecture and a magnificent dry waterwheel housing. Storybook illustration quality, nuanced surface detail, restrained golden highlights, graceful architectural rhythm. Camera is a completely fixed orthographic side view, no perspective shift or parallax on the collidable plane. Match the provided *complete 3584×1024 world-coordinate geometry guide exactly*: every rock silhouette, bank slope, dock lip, one-way shelf and the stone weir at tile x87–89, y51–57. Do not add, erase, move or imply any traversable ledge, step, obstacle, gate, bridge or tunnel. Keep all four water basins visually empty in this **static** panorama: no painted water surface or underwater line. Do not paint moving rafts, crate, valve handles, opening gates, wheel spokes, creatures, pickups, players, exit marker or UI. Reserved mechanism placements must remain compositionally readable without painting the moving pieces into the background. Distant arches and roots can decorate unwalkable air, but must not appear to be usable platforms. Use the exact guide for masking; make the art expressive *within* the geometry, never by changing geometry.

Render the composition before extracting solid/background planes. The source must not be upscaled and called native detail. If a model cannot emit **3584×1024** at native resolution, keep the full scene as composition reference and refine with the **three world-locked 1536×1024 crops** starting at x=0, 1024 and 2048, with 512 px overlaps. Stitch by verified landmarks **before** applying compiled static-alpha masks.

## Semantic poses and layered painting

The authored regions are: courtyard x32–55, sluice x74–103, head reservoir x130–160, tail reservoir x185–209 (coordinates are **16px tiles**, not pixel addresses). Static terrain is the full level x0–224, y0–64. The weir occupies x87–89, y51–57. The pressure socket is at (93,57); the upper sluice gate at (106,34); wheel center at (165,45), radius 58 px; final gate at (213,34). Final bridge A centers at (185,40), bridge B at (208,38), and bridge B becomes solid only once the downstream water is sufficiently high.

The **low**, **high**, **sluice fill**, and **wheel finale** material PNGs are sampled from the Temple state machine, not independently illustrated. `imagegen-handoff.json` records their exact ticks and water surfaces. Use each frame only to plan what is changing and where to paint independent sprites, not to paint those shapes into the static layer. High tide follows the initial low-tide delay; the exporter deliberately samples it at `startDelayTicks + halfPeriodTicks`.

Generate independent **true-alpha**, side-on art for each entry in `imagegen-handoff.json.alphaCutouts`. These include four moving rafts, the pushable timber crate, three valve handles, the cascade release, two retracting gates, the turning waterwheel, and two wheel-powered bridges. Each illustration must fill its specified *pixel dimensions* and preserve the listed Phaser **origin**: rafts/crate/bridges use top-edge origin `[0.5,0]`, controls and wheel center origin `[0.5,0.5]`, gates top-edge origin `[0.5,0]`. The object-study SVG/PNG files are reusable *poses, footprints, and pivot guides*; their simple vector marks are not the finished painted sprites. Preserve the crate's standable top and the raft's horizontal landing top. Never include the full scene as an object backdrop, and never add opaque background pixels to a moving cutout.

Use explicit variants for valve drain/hold/fill and a released handle pose, a gate-open *absent* state, rotating waterwheel and wheel-bridge inactive/solid states. The game state controls pose, visibility, water height and time; the artwork cannot add its own physics or timer. Keep the animated jade water, wave/foam highlights, and shoreline at the terrain-clipped simulation boundaries. For the finale, keep bridge A and B separate and the high tail raft between them.

## Integration and review boundary

The authored **vector** context studies are still only image-model inputs.
A first actual image-model panorama and moving-object sheet were generated
and registered as a **painted prototype** in `phaser/assets/generated/approved-scene-art.json`,
with exact compiled alpha in `solid.webp`. See
[the actual generated-asset README](../../assets/generated/sunken-temple/README.md).
The registry now allows playtesting the painting in the offline game, **not**
human approval of the art. The panorama has been resampled from a
2172×724 model output and requires native-detail crop refinement. Its
source-sheet cutouts should receive final edge cleanup. Verify V-overlay
contacts at gameplay zoom in low tide, high tide, socket-open and
wheel-finale states, and complete the offline Chromium/Firefox routes before
calling the painting final. The geometry guides and AI-painted assets never
determine collision or water timing.
