"""Check CLI routing and one pipeline load with an API stub, not neural inference."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
script = root / "tools/generate_splats.py"

with tempfile.TemporaryDirectory() as directory:
    directory = Path(directory)
    assets = directory / "assets"
    weights = directory / "weights"
    api = directory / "api"
    api.mkdir()
    log = directory / "calls.jsonl"
    (api / "triposplat.py").write_text('''import json
import os
from pathlib import Path
from types import SimpleNamespace

def record(event):
    with Path(os.environ["TRIPOSPLAT_TEST_LOG"]).open("a") as stream:
        stream.write(json.dumps(event)+"\\n")

record({"event":"import"})

def TripoSplatPipeline(**weights):
    record({"event":"load", "weights":weights})
    def run(image, **settings):
        record({"event":"run", "image":image, "settings":settings})
        data=Path(image).read_bytes()
        def save(path):
            Path(path).write_bytes(b"stub-output:"+data)
            if data==b"FAIL":
                raise RuntimeError("synthetic save failure")
        return SimpleNamespace(save_ply=save), None
    return SimpleNamespace(run=run)
''')
    for path in ["diffusion_models/triposplat_fp16.safetensors",
                 "vae/triposplat_vae_decoder_fp16.safetensors",
                 "clip_vision/dino_v3_vit_h.safetensors", "vae/flux2-vae.safetensors",
                 "background_removal/birefnet.safetensors"]:
        target = weights / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"stub-weights")
    for asset_id, status, output in [("a", "awaiting-splat", "incoming/model.ply"),
                                     ("b", "awaiting-splat", "custom/result.ply"),
                                     ("deferred", "deferred", "incoming/model.ply")]:
        folder = assets / asset_id
        (folder / "source").mkdir(parents=True)
        (folder / "asset.json").write_text(json.dumps({
            "id": asset_id, "status": status, "reference": "source/reference.png", "splat": output,
        }))
        if status == "awaiting-splat":
            (folder / "source/reference.png").write_bytes(asset_id.encode())
    env = {**os.environ, "PYTHONPATH": str(api), "TRIPOSPLAT_TEST_LOG": str(log)}

    def command(*arguments, succeeds=True):
        result = subprocess.run([sys.executable, str(script), "--weights", str(weights),
                                 "--assets-dir", str(assets), *arguments],
                                cwd=directory, env=env, capture_output=True, text=True)
        assert (result.returncode == 0) == succeeds, result.stdout + result.stderr
        return result

    def calls():
        return [json.loads(line) for line in log.read_text().splitlines()]

    result = command("--dry-run")
    assert "a:" in result.stdout and "b:" in result.stdout and "deferred:" not in result.stdout
    assert not log.exists() and not (assets / "a/incoming").exists()
    command()
    events = calls()
    assert [event["event"] for event in events] == ["import", "load", "run", "run"]
    assert events[1]["weights"] == {
        "ckpt_path": str(weights / "diffusion_models/triposplat_fp16.safetensors"),
        "decoder_path": str(weights / "vae/triposplat_vae_decoder_fp16.safetensors"),
        "dinov3_path": str(weights / "clip_vision/dino_v3_vit_h.safetensors"),
        "flux2_vae_encoder_path": str(weights / "vae/flux2-vae.safetensors"),
        "rmbg_path": str(weights / "background_removal/birefnet.safetensors"), "device": "cuda",
    }
    assert [Path(event["image"]).parent.parent.name for event in events[2:]] == ["a", "b"]
    for asset_id, output in [("a", "incoming/model.ply"), ("b", "custom/result.ply")]:
        result_path = assets / asset_id / output
        assert result_path.read_bytes() == b"stub-output:" + asset_id.encode()
        metadata = json.loads((result_path.parent / "generation.json").read_text())
        assert metadata["asset"] == asset_id and metadata["splat"] == output
        assert metadata["reference_sha256"] == hashlib.sha256(asset_id.encode()).hexdigest()
        assert metadata["triposplat_source_sha256"] == hashlib.sha256((api / "triposplat.py").read_bytes()).hexdigest()
        assert metadata["settings"]["num_gaussians"] == 65536
    command()  # Completed batch does not even import TripoSplat again.
    assert calls() == events
    command("b", "--overwrite", "--seed", "7", "--steps", "10", "--num-gaussians", "32768", "--device", "cuda:1")
    assert [event["event"] for event in calls()[4:]] == ["import", "load", "run"]
    assert calls()[-1]["settings"]["seed"] == 7 and calls()[-1]["settings"]["steps"] == 10
    assert calls()[-1]["settings"]["num_gaussians"] == 32768
    assert calls()[-2]["weights"]["device"] == "cuda:1"
    previous = calls()
    (assets / "b/source/reference.png").unlink()
    result = command("--overwrite", succeeds=False)
    assert "Missing reference image" in result.stderr and calls() == previous
    # Failed saves cannot replace an existing original PLY.
    (assets / "a/source/reference.png").write_bytes(b"FAIL")
    original = (assets / "a/incoming/model.ply").read_bytes()
    result = command("a", "--overwrite", succeeds=False)
    assert "synthetic save failure" in result.stderr
    assert (assets / "a/incoming/model.ply").read_bytes() == original
    previous = calls()
    (weights / "vae/flux2-vae.safetensors").unlink()
    result = command("a", "--overwrite", succeeds=False)
    assert "Missing local weight file" in result.stderr and calls() == previous

print("TripoSplat CLI checks passed: one load per batch, manifest routing, queue filtering, dry-run, resume, explicit regeneration, preflight, atomic PLY writes and generation metadata. Neural inference was stubbed.")
