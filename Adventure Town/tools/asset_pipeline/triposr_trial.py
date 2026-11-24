"""Run official TripoSR on an existing transparent source view, on CPU.

Uses an isolated environment with upstream dependencies. Mesh coordinates are
left in TripoSR's native Z-up system; no rig is inferred by this model.
"""
import argparse
import json
from pathlib import Path
import resource
import time

import numpy as np
from PIL import Image
import torch
from tsr.system import TSR
from tsr.utils import resize_foreground

from geometry.reconstruct import frames_from_source


def run(character, model_path, view, resolution, out):
    out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((character/'character.json').read_text())
    frames = frames_from_source(character/cfg['source'], cfg['reconstruction']['rows'], cfg['reconstruction']['cols'])
    rgba = resize_foreground(Image.fromarray(frames[view]), .85)
    rgba.save(out/'input-rgba.png')
    image = np.array(rgba).astype(np.float32)/255
    image = Image.fromarray(((image[:, :, :3]*image[:, :, 3:4]+(1-image[:, :, 3:4])*.5)*255).astype(np.uint8))
    image.save(out/'input.png')
    torch.set_num_threads(4)
    began = time.perf_counter()
    model = TSR.from_pretrained(str(model_path), config_name='config.yaml', weight_name='model.ckpt').eval().to('cpu')
    model.renderer.set_chunk_size(8192)
    loaded = time.perf_counter()
    print('model loaded', loaded-began, flush=True)
    with torch.inference_mode():
        code = model([image], device='cpu')
    inferred = time.perf_counter()
    print('scene inferred', inferred-loaded, flush=True)
    # Save the expensive inference so mesh resolution can be evaluated separately.
    torch.save(code, out/'scene-code.pt')
    mesh = model.extract_mesh(code, has_vertex_color=True, resolution=resolution, threshold=25.)[0]
    mesh.export(out/'native-mesh.glb')
    angles = cfg['reconstruction'].get('angles', np.linspace(0, 360, len(frames), endpoint=False).tolist())
    report = dict(character=str(character), input_view=view, input_angle=angles[view],
        torch=torch.__version__, device='cpu', resolution=resolution, density_threshold=25,
        model_load_seconds=loaded-began, inference_seconds=inferred-loaded,
        extraction_seconds=time.perf_counter()-inferred, peak_rss_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,
        vertices=len(mesh.vertices), triangles=len(mesh.faces), watertight=bool(mesh.is_watertight),
        winding_consistent=bool(mesh.is_winding_consistent), components=len(mesh.split(only_watertight=False)),
        native_bounds=mesh.bounds.tolist())
    (out/'report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('character', type=Path)
    p.add_argument('--model', type=Path, required=True)
    p.add_argument('--view', type=int, default=2)
    p.add_argument('--resolution', type=int, default=128)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    run(a.character, a.model, a.view, a.resolution, a.out)
