# Generate the town splats locally

Use your existing TripoSplat environment and downloaded weights. This standalone
CLI loads one `TripoSplatPipeline`, processes each reference sequentially, and
writes its PLY to the path in that asset's `asset.json`. It does not download
weights, start a server, or convert/promote meshes in the game.

From the repository root, with that environment activated:

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts
```

The weights directory uses the layout from the
[official TripoSplat example](https://github.com/VAST-AI-Research/TripoSplat/blob/main/run_example.py):

```text
ckpts/
  diffusion_models/triposplat_fp16.safetensors
  vae/triposplat_vae_decoder_fp16.safetensors
  clip_vision/dino_v3_vit_h.safetensors
  vae/flux2-vae.safetensors
  background_removal/birefnet.safetensors
```

`triposplat` must be importable by that Python interpreter. If your installation
is an upstream checkout rather than an installed module, add that checkout to
`PYTHONPATH` when running the same script. No TripoSplat dependency is added to
the game's runtime or the separate NumPy voxel converter environment.

## Choose a batch

With no asset IDs, the script selects manifests whose status is `awaiting-splat`
(currently the eight town objects). It ignores the deferred character experiment
and skips PLYs that already exist. Extract the reference PNG ZIP into the checkout
first. All pending reference paths and weight files are checked before model
construction, so a missing input does not waste part of a generation batch.

For just the boulder and cottage:

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts river-boulder willow-cottage
```

An explicit ID selects that asset regardless of status. Existing PLYs are still
skipped unless you deliberately pass `--overwrite`.

Append `--dry-run` to print the pending image → PLY mappings without importing
TripoSplat or loading weights. `--help` lists all options. Asset lookup defaults
to this game's `assets/` relative to the script, so the command can run from any
working directory. `--assets-dir /path/to/assets` selects another manifest tree.

Defaults are CUDA, 20 steps, 65,536 Gaussians, and seed 42 for **each** image.
The same image keeps its seed when the queue order changes. `--device`, `--steps`,
`--num-gaussians` and `--seed` override those settings. Gaussian counts are the
four sizes used by the upstream example: 32,768, 65,536, 131,072 or 262,144.
Guidance 3, timestep shift 3 and alpha erosion radius 1 are passed explicitly.

```sh
python "Adventure Town/tools/generate_splats.py" --weights /path/to/ckpts --num-gaussians 131072 --steps 20 --seed 42 river-boulder
```

## Outputs and resuming

Each asset gets its declared `splat` path, normally `incoming/model.ply`, plus
`incoming/generation.json` recording the settings, reference hash, installed
TripoSplat Python source hash and relative weight filenames. Full local weights
paths are not saved in that metadata. The source PNG is unchanged; the prepared
image and duplicate `.splat` format are not written. PLY export uses upstream's
normal `Gaussian.save_ply` transform; fit orientation during the later voxel
conversion rather than applying a guessed game transform during generation.

Run the same command after an interruption to skip completed PLYs and continue
with the remaining queue. Inference errors stop the batch; they are not silently
retried or replaced with another API. Each PLY is saved to an ignored partial file
and moved into place after a successful write. A failed save cannot replace an
existing original. Use `--overwrite` only when intentionally regenerating it.

Commit each generated PLY and its `generation.json` along with the reference PNG.
Then follow [the town asset guide](TOWN_ASSETS.md) for conversion and visual
review. This command never changes asset status or promotes a generated mesh.

## Verification

```sh
python "Adventure Town/tests/triposplat_batch.py"
```

The test needs only Python's standard library. It uses an API stub to check one
pipeline construction per batch, routing, deferred assets, resume/overwrite,
preflight, settings provenance and preservation of existing PLYs after a failed
save. It does not test GPU inference or the quality of generated assets.
