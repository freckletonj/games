#!/usr/bin/env python3
"""Generate asset PLYs sequentially with one locally loaded TripoSplat pipeline."""
import argparse
import hashlib
import json
from pathlib import Path


WEIGHT_FILES = {
    "ckpt_path": "diffusion_models/triposplat_fp16.safetensors",
    "decoder_path": "vae/triposplat_vae_decoder_fp16.safetensors",
    "dinov3_path": "clip_vision/dino_v3_vit_h.safetensors",
    "flux2_vae_encoder_path": "vae/flux2-vae.safetensors",
    "rmbg_path": "background_removal/birefnet.safetensors",
}


def pending_jobs(assets_dir, asset_ids, overwrite):
    manifests = (
        [assets_dir / asset_id / "asset.json" for asset_id in asset_ids]
        if asset_ids else sorted(assets_dir.glob("*/asset.json"))
    )
    jobs = []
    for manifest in manifests:
        config = json.loads(manifest.read_text())
        if not asset_ids and config["status"] != "awaiting-splat":
            continue
        image = manifest.parent / config["reference"]
        output = manifest.parent / config["splat"]
        if output.exists() and not overwrite:
            print(f"Skip {config['id']}: {output} exists", flush=True)
            continue
        # Check the complete queue before loading weights or generating anything.
        if not image.is_file():
            raise FileNotFoundError(f"Missing reference image: {image}")
        jobs.append((config, image, output))
    return jobs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", nargs="*", help="Asset IDs; default: all awaiting-splat manifests")
    parser.add_argument("--weights", required=True, type=Path, help="Local TripoSplat ckpts directory")
    parser.add_argument("--assets-dir", type=Path, default=Path(__file__).resolve().parents[1] / "assets")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--steps", type=int, default=20)
    parser.add_argument("--num-gaussians", type=int, choices=[32768, 65536, 131072, 262144], default=65536)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--overwrite", action="store_true", help="Regenerate existing PLYs")
    parser.add_argument("--dry-run", action="store_true", help="Print the queue without importing TripoSplat or loading weights")
    args = parser.parse_args()
    if args.steps < 1:
        parser.error("--steps must be positive")
    jobs = pending_jobs(args.assets_dir, args.assets, args.overwrite)
    if not jobs:
        print("Nothing to generate.")
        return
    for config, image, output in jobs:
        print(f"{config['id']}: {image} -> {output}", flush=True)
    if args.dry_run:
        return
    weights = {name: str(args.weights / relative) for name, relative in WEIGHT_FILES.items()}
    for path in weights.values():
        if not Path(path).is_file():
            raise FileNotFoundError(f"Missing local weight file: {path}")

    # Import only after preflight; --help, --dry-run and completed queues need no ML environment.
    import triposplat

    print("Loading TripoSplat weights once…", flush=True)
    pipeline = triposplat.TripoSplatPipeline(**weights, device=args.device)
    source_hash = hashlib.sha256(Path(triposplat.__file__).read_bytes()).hexdigest()
    settings = dict(seed=args.seed, steps=args.steps, num_gaussians=args.num_gaussians,
                    guidance_scale=3.0, shift=3.0, erode_radius=1)
    for index, (config, image, output) in enumerate(jobs, 1):
        print(f"[{index}/{len(jobs)}] Generating {config['id']}", flush=True)
        gaussian, prepared = pipeline.run(str(image), **settings, show_progress=True)
        output.parent.mkdir(parents=True, exist_ok=True)
        partial = output.with_suffix(".partial.ply")
        gaussian.save_ply(str(partial))
        metadata = {
            "asset": config["id"], "reference": config["reference"], "splat": config["splat"],
            "reference_sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
            "triposplat_source_sha256": source_hash, "weights": WEIGHT_FILES,
            "device": args.device, "settings": settings,
            "export": "Gaussian.save_ply with upstream default transform",
        }
        (output.parent / "generation.json").write_text(json.dumps(metadata, indent=2) + "\n")
        partial.replace(output)
        del gaussian, prepared
        print(f"Saved {output}", flush=True)


if __name__ == "__main__":
    main()
