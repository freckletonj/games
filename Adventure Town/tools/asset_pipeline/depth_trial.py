"""Trial generated depth as free-space evidence; never replaces canonical assets.

Coordinates use reconstruct.py's height-normalized orthographic convention.
The depth encoding is signed distance toward the camera, in character heights.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from numba import njit
from PIL import Image
from scipy import ndimage as ndi
from scipy.spatial import cKDTree

from geometry.reconstruct import frames_from_source, segment, camera, project, carve, surface, preview, colors_for_surface


@njit(cache=True)
def zbuffer(screen, faces, width, height):
    depth = np.full((height, width), -np.inf)
    for face in faces:
        a, b, c = screen[face[0]], screen[face[1]], screen[face[2]]
        den = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
        if abs(den) < 1e-10:
            continue
        for y in range(max(0, int(np.floor(min(a[1],b[1],c[1])))), min(height, int(np.ceil(max(a[1],b[1],c[1])))+1)):
            for x in range(max(0, int(np.floor(min(a[0],b[0],c[0])))), min(width, int(np.ceil(max(a[0],b[0],c[0])))+1)):
                u = ((b[1]-c[1])*(x+.5-c[0]) + (c[0]-b[0])*(y+.5-c[1])) / den
                v = ((c[1]-a[1])*(x+.5-c[0]) + (a[0]-c[0])*(y+.5-c[1])) / den
                w = 1-u-v
                if min(u,v,w) >= -1e-8:
                    depth[y,x] = max(depth[y,x], u*a[2]+v*b[2]+w*c[2])
    return depth


def render_depth(occupancy, cam, shape):
    _, _, quads = surface(occupancy, occupancy.shape[0])
    u, v, d = project(quads.reshape(-1,3), cam)
    faces = (np.arange(len(quads))[:,None,None]*4 + np.array([[0,1,2],[0,2,3]])).reshape(-1,3)
    return zbuffer(np.column_stack([u,v,d]), faces, shape[1], shape[0])


def decode(rgba, encoding):
    rgb = rgba[:,:,:3].astype(float)/255
    if encoding == 'gray':
        return (rgb.mean(axis=2)-.5)*1.2
    # Invert the specified HSV hue ramp: blue far -> green -> red near.
    high, low = rgb.max(axis=2), rgb.min(axis=2)
    delta = high-low
    hue = np.zeros_like(high)
    for channel in range(3):
        chosen = (rgb.argmax(axis=2)==channel) & (delta>1e-6)
        numerator = rgb[:,:,(channel+1)%3]-rgb[:,:,(channel+2)%3]
        hue[chosen] = (numerator[chosen]/delta[chosen]+2*channel) % 6
    return (.5-hue/4)*1.2


def register_depth(frame, source_mask, encoding):
    """One bounding-box affine transform per view; no per-part/nonrigid warps."""
    mask = segment(frame)
    sy, sx = np.where(source_mask)
    dy, dx = np.where(mask)
    yy, xx = np.indices(source_mask.shape, dtype=float)
    xx = (xx-sx.min())*(dx.max()-dx.min())/(sx.max()-sx.min())+dx.min()
    yy = (yy-sy.min())*(dy.max()-dy.min())/(sy.max()-sy.min())+dy.min()
    aligned_mask = ndi.map_coordinates(mask.astype(float), [yy,xx], order=0, mode='constant') > .5
    valid = ndi.binary_erosion(aligned_mask & source_mask, iterations=2)
    if encoding == 'hue':
        rgb = frame[:,:,:3].astype(float)/255
        saturated = (rgb.max(2)-rgb.min(2)) > .3
        valid &= ndi.map_coordinates(saturated.astype(float), [yy,xx], order=0, mode='constant') > .5
    depth = ndi.map_coordinates(decode(frame, encoding), [yy,xx], order=1, mode='nearest')
    iou = (aligned_mask & source_mask).sum()/(aligned_mask | source_mask).sum()
    return depth, valid, float(iou)


def refine(occupancy, cameras, depths, valid, tolerance=.08, min_views=2):
    h = occupancy.shape[0]
    cells = np.argwhere(occupancy)
    points = (cells+[-h/2+.5,.5,-h/2+.5])/h
    free = np.zeros(len(points), dtype=int)
    for cam, depth, mask in zip(cameras, depths, valid):
        u, v, d = project(points, cam)
        observed = ndi.map_coordinates(depth, [v,u], order=1, mode='nearest')
        known = ndi.map_coordinates(mask.astype(float), [v,u], order=0, mode='constant') > .5
        free += known & (d > observed+tolerance)
    result = occupancy.copy()
    result[tuple(cells[free>=min_views].T)] = False
    return result


def iou(mask, other):
    return float((mask & other).sum()/(mask | other).sum())


def phantom():
    """Synthetic benchmark with a front recess invisible to silhouettes."""
    h = 32
    x,y,z = np.indices((h,h+4,h))
    block = (abs(x-15.5)<10) & (y>=2) & (y<29) & (abs(z-15.5)<10)
    recess = (abs(x-15.5)<5) & (y>=11) & (y<21) & (z>=16)
    return block & ~recess


def positive_control():
    truth = phantom()
    cams = [dict(angle=float(a), elevation=.087, cx=80., floor=150., scale=130.) for a in np.linspace(0,2*np.pi,16,endpoint=False)]
    depths = [render_depth(truth,c,(160,160)) for c in cams]
    masks = [np.isfinite(d) for d in depths]
    base, _ = carve(masks,cams,32,1)
    exact = [np.where(m,d,0) for d,m in zip(depths,masks)]
    result = refine(base,cams,exact,masks,tolerance=1/32,min_views=2)
    return dict(baseline_volume_iou=iou(base,truth), exact_depth_volume_iou=iou(result,truth),
                truth_voxels=int(truth.sum()), baseline_voxels=int(base.sum()), refined_voxels=int(result.sum()))


def fit_angle(occupancy, cam, mask):
    # Use fitting views only; retain scale and translation so the test isolates yaw.
    trials = []
    for delta in [-10,-5,0,5,10]:
        candidate = dict(cam, angle=cam['angle']+np.deg2rad(delta))
        score = iou(np.isfinite(render_depth(occupancy,candidate,mask.shape)),mask)
        trials.append((score,delta,candidate))
    return max(trials,key=lambda item:item[0])


def save_build(out, occupancy, baseline, source_frames, source_masks, cams):
    out.mkdir(parents=True, exist_ok=True)
    centers,normals,quads = surface(occupancy,occupancy.shape[0])
    old_centers,old_normals,_ = surface(baseline,baseline.shape[0])
    old_colors,_ = colors_for_surface(old_centers,old_normals,source_frames,source_masks,cams,baseline.shape[0])
    # Same fitting RGB observations for both candidates, nearest old surface colors.
    colors = old_colors[cKDTree(old_centers).query(centers)[1]]
    np.savez_compressed(out/'volume.npz',occupancy=occupancy,colors=colors)
    sheet = Image.new('RGB',(4*384,384))
    for i,a in enumerate([0,np.pi/4,np.pi/2,np.pi]):
        sheet.paste(preview(quads,normals,colors,a),(i*384,0))
    sheet.save(out/'preview.png')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('character',type=Path)
    parser.add_argument('depth',type=Path)
    parser.add_argument('--encoding',choices=['gray','hue'],required=True)
    parser.add_argument('--rows',type=int,required=True)
    parser.add_argument('--cols',type=int,required=True)
    parser.add_argument('--views',type=int,nargs='+',required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--sweep',action='store_true',help='Report a fixed tolerance/vote sweep on held-out views')
    args = parser.parse_args()
    manifest = json.loads((args.character/'character.json').read_text())
    settings = manifest['reconstruction']
    frames = frames_from_source(args.character/manifest['source'],settings['rows'],settings['cols'])
    masks = [segment(f) for f in frames]
    cams = [camera(m,np.deg2rad(a),np.deg2rad(settings['elevation'])) for m,a in zip(masks,settings['angles'])]
    generated = frames_from_source(args.depth,args.rows,args.cols)
    assert len(generated)==len(args.views)
    fit_masks = [masks[i] for i in args.views]
    fit_cams = [cams[i] for i in args.views]
    base,_ = carve(fit_masks,fit_cams,settings['height'],settings['agreement'])
    fitted = [fit_angle(base,c,m) for c,m in zip(fit_cams,fit_masks)]
    adjusted_cams = [r[2] for r in fitted]
    adjusted,_ = carve(fit_masks,adjusted_cams,settings['height'],settings['agreement'])
    registered = [register_depth(d,m,args.encoding) for d,m in zip(generated,fit_masks)]
    depths,valid,registration = map(list,zip(*registered))
    candidate = refine(adjusted,adjusted_cams,depths,valid)
    holdout = [i for i in range(len(frames)) if i not in args.views]
    report = dict(fit_views=args.views, held_out_views=holdout, encoding=args.encoding,
                  depth_tolerance_heights=.08, required_free_space_views=2,
                  registration_iou=registration, yaw_adjustments_degrees=[r[1] for r in fitted],
                  positive_control=positive_control(), variants={})
    args.out.mkdir(parents=True,exist_ok=True)
    for name,volume in [('silhouette',base),('yaw_only',adjusted),('generated_depth',candidate)]:
        scores = [iou(np.isfinite(render_depth(volume,c,m.shape)),m) for c,m in zip(cams,masks)]
        labels,components = ndi.label(volume)
        sizes = np.bincount(labels.ravel())[1:]
        report['variants'][name] = dict(occupied_voxels=int(volume.sum()),components=components,
            largest_component_fraction=float(sizes.max()/sizes.sum()),
            fit_iou=float(np.mean(np.array(scores)[args.views])),
            held_out_iou=float(np.mean(np.array(scores)[holdout])) if holdout else None,
            per_view_iou=scores)
        save_build(args.out/name,volume,adjusted,[frames[i][:,:,:3] for i in args.views],fit_masks,adjusted_cams)
    if args.sweep:
        assert holdout, 'A sweep requires held-out views'
        report['sensitivity'] = []
        for tolerance in [.04,.08,.16]:
            for votes in [1,2,4]:
                volume = refine(adjusted,adjusted_cams,depths,valid,tolerance,votes)
                score = np.mean([iou(np.isfinite(render_depth(volume,cams[i],masks[i].shape)),masks[i]) for i in holdout])
                report['sensitivity'].append(dict(tolerance_heights=tolerance,min_views=votes,
                    held_out_iou=float(score),retained_fraction=float(volume.sum()/adjusted.sum())))
    np.savez_compressed(args.out/'registered_depth.npz',
        **{f'depth{i}':d for i,d in enumerate(depths)},
        **{f'valid{i}':v for i,v in enumerate(valid)})
    (args.out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
