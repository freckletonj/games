"""Exercise the existing configured quadruped rig on an experimental triangle mesh.

This transfers the configured skeleton/weight rules, not an inferred skeleton.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.spatial.transform import Rotation
import trimesh

from assess_quadruped import assess
from geometry.reconstruct import project
from preview import raster
from quadruped import skin_weights, pose_angles
from rig import create_clips, deform, matrices, export_glb
from validate_rig import check


def run(mesh_path, config, out, scale, speed):
    out.mkdir(parents=True, exist_ok=True)
    mesh = trimesh.load(mesh_path, force='mesh')
    positions = (mesh.vertices*2).astype(np.float32)
    normals = mesh.vertex_normals.astype(np.float32)
    colors = mesh.visual.vertex_colors[:, :3]
    srgb = colors.astype(np.float32)/255
    data = dict(positions=positions, normals=normals, faces=mesh.faces.astype(np.int32),
        linear_colors=np.where(srgb<=.04045, srgb/12.92, ((srgb+.055)/1.055)**2.4))
    cfg = json.loads(config.read_text()); specs = cfg['joints']; names = list(specs)
    parents = np.array([names.index(specs[n]['parent']) if specs[n]['parent'] else -1 for n in names])
    height = float(positions[:, 1].max())
    joints = np.array([specs[n]['position'] for n in names])*height
    ids, weights = skin_weights(positions, names, joints, height, cfg['gates'])
    clips = create_clips(names, parents, joints, data, ids, weights, pose=pose_angles, durations=[('idle', 2.4), ('walk', .7)])
    export_glb(out/'character_animated.glb', data, names, parents, joints, ids, weights, clips)
    np.savez_compressed(out/'rig.npz', **data, colors=colors, ids=ids, weights=weights, joints=joints,
        parents=parents, names=np.array(names), **{f'{name}_{k}':v for name, c in clips.items() for k,v in c.items()})
    rest, _ = matrices(joints, parents, Rotation.identity(len(joints)).as_quat())
    p, _ = deform(positions, normals, ids, weights, rest)
    metrics = dict(vertices=len(positions), triangles=len(mesh.faces), joints=len(names),
        rest_max_error=float(abs(p-positions).max()), weight_sum_max_error=float(abs(weights.sum(1)-1).max()),
        watertight=bool(mesh.is_watertight), **check(out))
    (out/'rig_metrics.json').write_text(json.dumps(metrics, indent=2))
    motion = assess(out, scale, speed)
    (out/'motion_metrics.json').write_text(json.dumps(motion, indent=2))
    for name, clip in clips.items():
        images = []
        for palette in clip['palettes'][::2]:
            p, n = deform(positions, normals, ids, weights, palette)
            cam = dict(angle=.55, elevation=.1, cx=192., floor=350., scale=150.)
            u, v, d = project(p, cam)
            rgb = raster(np.column_stack([u, v, d]), n, np.zeros((len(p), 2)), mesh.faces,
                np.zeros((1, 1, 3), np.uint8), 384, 384, False, colors.astype(float))
            images.append(Image.fromarray(rgb))
        images[0].save(out/f'{name}.gif', save_all=True, append_images=images[1:], duration=67, loop=0)
    print(json.dumps(dict(rig=metrics, motion=motion), indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('mesh', type=Path)
    p.add_argument('--config', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--scale', type=float, required=True)
    p.add_argument('--speed', type=float, required=True)
    a = p.parse_args()
    run(a.mesh, a.config, a.out, a.scale, a.speed)
