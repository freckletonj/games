# Repository guidance for coding agents

Read `README.md`, `docs/CHARACTER_CREATION.md`, and `docs/PIPELINE.md` before changing the asset workflow. This project uses AI image generation as the source of visual quality, deterministic reconstruction for 3D geometry and LLM assistance for orchestration and inspection.

- The canonical adventurer is the baseline. Preserve her source GIF byte-for-byte unless explicitly asked to redesign her. Do not introduce obsolete character artifacts.
- For new characters, create `characters/<id>/` with independent `character.json`, `source/`, `generated/` and documentation. Use the transparency-first prompt in `docs/ACQUISITION.md`.
- Put reusable Python code in `tools/asset_pipeline/`; keep camera annotations, rig proportions and character-specific corrections in each character's configuration. Avoid introducing an engine dependency into the compiler.
- Use `experiments/` for unapproved builds. When changing geometry or rigging code, rebuild the canonical character, compare visual previews and numerical metrics, and report regressions and limitations. Do not claim artistic or engine validation based only on an audit.
- Keep gameplay code separate from the compiler. Use the committed animated GLB, with idle/walk/attack as current clip names. Do not expand scope into additional mechanics without an explicit request.
- Keep the code and build commands simple. Do not silently change the source design, add dependencies, or invent unavailable generated views. Keep docs synchronized with actual commands and functionality.
