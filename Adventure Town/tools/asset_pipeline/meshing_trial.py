"""Compare marching cubes and screened Poisson with exact and estimated depths.

Research only: all coordinates are normalized to a nominal character height of 1.
The exact-depth control tests meshing; it does not validate monocular depth.
"""
import argparse
import json
from pathlib import Path
import time

import numpy as np
import open3d as o3d
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes
import trimesh

from correspondence_trial import unproject
from depth_trial import render_depth, zbuffer, iou
from geometry.reconstruct import frames_from_source, segment, camera, project, surface
from monocular_trial import calibrate
from preview import raster


def depth_cloud(depths, cameras, masks):
    points, normals = [], []
    for depth, cam, mask in zip(depths, cameras, masks):
        yy, xx = np.indices(depth.shape)
        finite_depth = np.where(np.isfinite(depth), depth, 0)
        p = unproject(np.column_stack([xx.ravel(), yy.ravel()]), finite_depth, cam).reshape(*depth.shape, 3)
        dx = p[1:-1, 2:] - p[1:-1, :-2]
        dy = p[2:, 1:-1] - p[:-2, 1:-1]
        n = np.cross(dx, dy)
        length = np.linalg.norm(n, axis=2)
        valid = ndi.binary_erosion(mask & np.isfinite(depth), iterations=2)[1:-1, 1:-1]
        valid &= np.isfinite(length) & (length > 1e-10)
        q, n = p[1:-1, 1:-1][valid], n[valid]/length[valid, None]
        a, e = cam['angle'], cam['elevation']
        view = np.array([np.sin(a)*np.cos(e), np.sin(e), np.cos(a)*np.cos(e)])
        n *= np.where(n@view >= 0, 1, -1)[:, None]
        points.append(q[::3]); normals.append(n[::3])
    cloud = o3d.geometry.PointCloud()
    cloud.points = o3d.utility.Vector3dVector(np.concatenate(points))
    cloud.normals = o3d.utility.Vector3dVector(np.concatenate(normals))
    return cloud.voxel_down_sample(.008)


def mesh_metrics(mesh, reference, cameras, masks):
    scores = []
    for cam, mask in zip(cameras, masks):
        u, v, d = project(mesh.vertices, cam)
        depth = zbuffer(np.column_stack([u, v, d]), mesh.faces, mask.shape[1], mask.shape[0])
        scores.append(iou(np.isfinite(depth), mask))
    h = reference.shape[0]
    coordinates = np.indices(reference.shape).reshape(3, -1).T
    points = (coordinates+[-h/2+.5, .5, -h/2+.5])/h
    scene = o3d.t.geometry.RaycastingScene()
    triangle_mesh = o3d.geometry.TriangleMesh(o3d.utility.Vector3dVector(mesh.vertices), o3d.utility.Vector3iVector(mesh.faces))
    scene.add_triangles(o3d.t.geometry.TriangleMesh.from_legacy(triangle_mesh))
    occupied = scene.compute_occupancy(o3d.core.Tensor(points.astype(np.float32)), nthreads=4).numpy().reshape(reference.shape) > .5
    # This is agreement with the existing model, not accuracy against an unknown real cat.
    return dict(vertices=len(mesh.vertices), triangles=len(mesh.faces), watertight=bool(mesh.is_watertight),
        winding_consistent=bool(mesh.is_winding_consistent), components=len(mesh.split(only_watertight=False)),
        reference_volume_iou=iou(occupied, reference), mean_source_silhouette_iou=float(np.mean(scores)), per_view_iou=scores)


def run(character, control, predictions, out):
    out.mkdir(parents=True, exist_ok=True)
    saved = np.load(character/'generated/volume.npz')
    volume = saved['occupancy']; h = volume.shape[0]
    centers, _, _ = surface(volume, h)
    color_tree = cKDTree(centers)
    cfg = json.loads((character/'character.json').read_text())
    frames = frames_from_source(character/cfg['source'], 4, 4)
    masks = [segment(f) for f in frames]
    cameras = [camera(m, np.deg2rad(a), np.deg2rad(cfg['reconstruction']['elevation'])) for m, a in zip(masks, cfg['reconstruction']['angles'])]
    control_cameras = json.loads((control/'cameras.json').read_text())
    truth = np.load(control/'truth.npz')
    exact = [truth[f'depth{i}'] for i in range(16)]
    raw = np.load(predictions)
    estimated, valids, fits = calibrate(volume, cameras, [raw[f'depth{i}'] for i in range(16)], masks)
    results, meshes = {}, {}
    for name, depths, cams, valid in [('poisson-exact', exact, control_cameras, [np.isfinite(d) for d in exact]),
                                      ('poisson-estimated', estimated, cameras, valids)]:
        start = time.perf_counter()
        cloud = depth_cloud(depths, cams, valid)
        reconstructed, _ = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(cloud, depth=7, n_threads=4)
        mesh = trimesh.Trimesh(np.asarray(reconstructed.vertices), np.asarray(reconstructed.triangles), process=False)
        meshes[name] = mesh
        results[name] = dict(points=len(cloud.points), seconds=time.perf_counter()-start,
            **mesh_metrics(mesh, volume, cameras, masks))
    for sigma in [0, .65]:
        start = time.perf_counter()
        # Pad to close any occupied boundary, including the existing clipped tail.
        field = ndi.distance_transform_edt(volume)-ndi.distance_transform_edt(~volume)
        field = ndi.gaussian_filter(field, sigma) if sigma else field
        v, f, _, _ = marching_cubes(np.pad(field, 1, constant_values=-2), level=0)
        v = (v-1+[-h/2+.5, .5, -h/2+.5])/h
        mesh = trimesh.Trimesh(v, f, process=False)
        name = f'marching-cubes-{sigma}'
        meshes[name] = mesh
        results[name] = dict(seconds=time.perf_counter()-start, **mesh_metrics(mesh, volume, cameras, masks))
    sheet = Image.new('RGB', (3*320, len(meshes)*340), '#15202b')
    draw = ImageDraw.Draw(sheet)
    for row, (name, mesh) in enumerate(meshes.items()):
        colors = saved['colors'][color_tree.query(mesh.vertices)[1]]
        mesh.visual.vertex_colors = colors
        mesh.export(out/f'{name}.glb')
        for col, angle in enumerate([0, np.pi/4, np.pi/2]):
            cam = dict(angle=angle, elevation=.1, cx=160., floor=300., scale=260.)
            u, v, d = project(mesh.vertices, cam)
            image = raster(np.column_stack([u, v, d]), mesh.vertex_normals, np.zeros((len(mesh.vertices), 2)), mesh.faces,
                np.zeros((1, 1, 3), np.uint8), 320, 320, False, colors.astype(float))
            sheet.paste(Image.fromarray(image), (col*320, row*340+20))
        draw.text((8, row*340+4), name, fill='white')
    sheet.save(out/'comparison.png')
    (out/'report.json').write_text(json.dumps(dict(character=str(character), open3d=o3d.__version__,
        poisson_depth=7, poisson_trimmed=False, estimated_depth_calibration=fits, results=results), indent=2))
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('character', type=Path)
    p.add_argument('--control', type=Path, required=True)
    p.add_argument('--predictions', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    run(a.character, a.control, a.predictions, a.out)
