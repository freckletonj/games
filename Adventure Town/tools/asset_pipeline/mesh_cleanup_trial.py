"""Explicit native-to-engine alignment and small-hole cleanup of TripoSR output."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import trimesh

from depth_trial import zbuffer, iou
from geometry.reconstruct import frames_from_source, segment, camera, project
from preview import raster


def run(native, character, view, out):
    out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads((character/'character.json').read_text())
    frames = frames_from_source(character/cfg['source'], cfg['reconstruction']['rows'], cfg['reconstruction']['cols'])
    angles = cfg['reconstruction'].get('angles', np.linspace(0, 360, len(frames), endpoint=False).tolist())
    mesh = trimesh.load(native, force='mesh')
    positions = np.array(mesh.vertices)[:, [1, 2, 0]]
    positions[:, 1] -= positions[:, 1].min()
    positions /= positions[:, 1].max()
    a = np.deg2rad(angles[view])
    positions = positions@np.array([[np.cos(a), 0, -np.sin(a)], [0, 1, 0], [np.sin(a), 0, np.cos(a)]])
    feet = positions[positions[:, 1]<.12]
    positions[:, [0, 2]] -= (feet[:, [0, 2]].min(0)+feet[:, [0, 2]].max(0))/2
    mesh.vertices = positions
    mesh.export(out/'aligned-mesh.glb')
    components = mesh.split(only_watertight=False, repair=False)
    cleaned = max(components, key=lambda m:len(m.faces))
    before = len(cleaned.faces)
    discarded = sum(len(m.faces) for m in components)-before
    closed = trimesh.repair.fill_holes(cleaned)
    cleaned.export(out/'cleaned-mesh.glb')
    scores = []
    sheet = Image.new('RGB', (4*320, 340), '#15202b'); draw = ImageDraw.Draw(sheet)
    for i, angle in enumerate([0, np.pi/4, np.pi/2, np.pi]):
        cam = dict(angle=angle, elevation=.1, cx=160., floor=300., scale=260.)
        u, v, d = project(cleaned.vertices, cam)
        rgb = raster(np.column_stack([u, v, d]), cleaned.vertex_normals, np.zeros((len(cleaned.vertices), 2)), cleaned.faces,
            np.zeros((1, 1, 3), np.uint8), 320, 320, False, cleaned.visual.vertex_colors[:, :3].astype(float))
        sheet.paste(Image.fromarray(rgb), (320*i, 20))
        draw.text((320*i+6, 4), f'{np.rad2deg(angle):.0f} degrees', fill='white')
    sheet.save(out/'preview.png')
    for frame, angle in zip(frames, angles):
        mask = segment(frame)
        cam = camera(mask, np.deg2rad(angle), np.deg2rad(cfg['reconstruction']['elevation']))
        u, v, d = project(cleaned.vertices, cam)
        depth = zbuffer(np.column_stack([u, v, d]), cleaned.faces, mask.shape[1], mask.shape[0])
        scores.append(iou(np.isfinite(depth), mask))
    report = dict(input_view=view, assumed_input_yaw_degrees=angles[view], native_axis_permutation=[1, 2, 0],
        translation_anchor='bounding midpoint of vertices in lowest 12 percent of height', raw_components=len(components),
        discarded_component_triangles=discarded,
        triangles_added_by_small_hole_fill=len(cleaned.faces)-before, watertight=bool(closed),
        winding_consistent=bool(cleaned.is_winding_consistent), vertices=len(cleaned.vertices), triangles=len(cleaned.faces),
        input_silhouette_iou=scores[view], other_view_silhouette_iou=float(np.mean([s for i,s in enumerate(scores) if i!=view])),
        per_view_iou=scores)
    (out/'cleanup.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('native', type=Path)
    p.add_argument('--character', type=Path, required=True)
    p.add_argument('--view', type=int, required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    run(a.native, a.character, a.view, a.out)
