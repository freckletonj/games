"""Evaluate DA-V2 relative depth with silhouette-only scale calibration.

Primary calibration is a positive affine fit to the fitting visual hull with a
Huber loss. Ground truth is reserved for reported accuracy and oracle diagnosis.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi
from scipy.optimize import least_squares

from depth_trial import render_depth, zbuffer, refine, iou, save_build
from geometry.reconstruct import frames_from_source, segment, camera, project, carve, surface


def render_interval(volume, cam, shape):
    _,_,quads = surface(volume,volume.shape[0])
    u,v,d = project(quads.reshape(-1,3),cam)
    faces = (np.arange(len(quads))[:,None,None]*4+np.array([[0,1,2],[0,2,3]])).reshape(-1,3)
    front = zbuffer(np.column_stack([u,v,d]),faces,shape[1],shape[0])
    back = -zbuffer(np.column_stack([u,v,-d]),faces,shape[1],shape[0])
    return front,back


def fit_depth(raw, target, valid):
    lo,hi = np.percentile(raw[valid],[10,90])
    normalized = (raw-lo)/(hi-lo)
    x,y = normalized[valid][::5],target[valid][::5]
    def residual(coefficients):
        return coefficients[0]*x+coefficients[1]-y
    initial = [max(float(np.std(y)/np.std(x)),.001),float(np.median(y))]
    result = least_squares(residual,initial,bounds=([0,-np.inf],[np.inf,np.inf]),loss='huber',f_scale=.03)
    predicted = result.x[0]*normalized+result.x[1]
    return predicted,dict(scale=float(result.x[0]),shift=float(result.x[1]),raw_lo=float(lo),raw_hi=float(hi),
                          calibration_rmse=float(np.sqrt(np.mean(residual(result.x)**2))))


def calibrate(volume, cameras, raw_depths, masks, mode='hull'):
    calibrated,valids,metrics = [],[],[]
    if mode=='shared':
        targets = []
        for cam,mask in zip(cameras,masks):
            front,_ = render_interval(volume,cam,mask.shape)
            targets.append(front)
            valids.append(ndi.binary_erosion(mask,iterations=3) & np.isfinite(front))
        flat,fit = fit_depth(np.concatenate([r.ravel() for r in raw_depths]),
            np.concatenate([t.ravel() for t in targets]),np.concatenate([v.ravel() for v in valids]))
        offset = 0
        for raw in raw_depths:
            calibrated.append(flat[offset:offset+raw.size].reshape(raw.shape))
            metrics.append(fit)
            offset += raw.size
        return calibrated,valids,metrics
    for cam,raw,mask in zip(cameras,raw_depths,masks):
        front,back = render_interval(volume,cam,mask.shape)
        valid = ndi.binary_erosion(mask,iterations=3) & np.isfinite(front) & np.isfinite(back)
        if mode=='thin':
            width = front-back
            anchors = valid & (width<=np.quantile(width[valid],.3))
        else:
            anchors = valid
        if mode=='planar':
            center = float(np.median(front[valid]))
            depth,fit = np.full_like(raw,center),dict(constant_depth=center)
        else:
            depth,fit = fit_depth(raw,front,anchors)
        calibrated.append(depth)
        valids.append(valid)
        metrics.append(fit)
    return calibrated,valids,metrics


def describe(volume, cameras, masks, fit_views, heldout):
    scores = [iou(np.isfinite(render_depth(volume,c,m.shape)),m) for c,m in zip(cameras,masks)]
    labels,components = ndi.label(volume)
    sizes = np.bincount(labels.ravel())[1:]
    return dict(occupied_voxels=int(volume.sum()),components=components,
                largest_component_fraction=float(sizes.max()/sizes.sum()),
                fit_iou=float(np.mean(np.array(scores)[fit_views])),
                held_out_iou=float(np.mean(np.array(scores)[heldout])) if heldout else None,
                per_view_iou=scores)


def camera_rotation(cam):
    a,e = cam['angle'],cam['elevation']
    return np.array([[np.cos(a),0,-np.sin(a)],
        [np.sin(a)*np.sin(e),-np.cos(e),np.cos(a)*np.sin(e)],
        [-np.sin(a)*np.cos(e),-np.sin(e),-np.cos(a)*np.cos(e)]])


def refine_cameras(cameras, data, views):
    result = [dict(c) for c in cameras]
    first = views[0]
    anchor = data[f'pose{first}'][:3,:3].T @ camera_rotation(cameras[first])
    for i in views:
        rotation = data[f'pose{i}'][:3,:3] @ anchor
        yaw = np.arctan2(-rotation[2,0],-rotation[2,2])
        elevation = np.arcsin(np.clip(-rotation[2,1],-1,1))
        delta = np.arctan2(np.sin(yaw-cameras[i]['angle']),np.cos(yaw-cameras[i]['angle']))
        result[i]['angle'] += float(np.clip(delta,np.deg2rad(-15),np.deg2rad(15)))
        result[i]['elevation'] = float(np.clip(elevation,0,np.deg2rad(10)))
    return result


def evaluate_character(character, cache, out, parity=0, shared=False, pose_refine=False):
    manifest = json.loads((character/'character.json').read_text())
    settings = manifest['reconstruction']
    frames = frames_from_source(character/manifest['source'],settings['rows'],settings['cols'])
    masks = [segment(f) for f in frames]
    cameras = [camera(m,np.deg2rad(a),np.deg2rad(settings['elevation'])) for m,a in zip(masks,settings['angles'])]
    fit_views = list(range(parity,len(frames),2))
    heldout = [i for i in range(len(frames)) if i not in fit_views]
    data = np.load(cache)
    if pose_refine:
        cameras = refine_cameras(cameras,data,fit_views)
    fit_cams,fit_masks = [cameras[i] for i in fit_views],[masks[i] for i in fit_views]
    rig = json.loads((character/manifest['rig']).read_text())
    base,_ = carve(fit_masks,fit_cams,settings['height'],settings['agreement'],rig.get('arm_gap'))
    raw = [data[f'depth{i}'] for i in fit_views]
    report = dict(character=str(character),fit_views=fit_views,held_out_views=heldout,pose_refined=pose_refine,fitting_cameras=fit_cams,
                  primary=dict(calibration='hull',tolerance=.04,min_views=2),
                  variants={'silhouette':describe(base,cameras,masks,fit_views,heldout)},calibration={},sensitivity=[])
    out.mkdir(parents=True,exist_ok=True)
    save_build(out/'silhouette',base,base,[frames[i][:,:,:3] for i in fit_views],fit_masks,fit_cams)
    for mode in (['hull','thin','shared'] if shared else ['hull','thin']):
        depth,valid,metrics = calibrate(base,fit_cams,raw,fit_masks,mode)
        report['calibration'][mode] = metrics
        result = refine(base,fit_cams,depth,valid,tolerance=.04,min_views=2)
        report['variants'][mode] = describe(result,cameras,masks,fit_views,heldout)
        save_build(out/mode,result,base,[frames[i][:,:,:3] for i in fit_views],fit_masks,fit_cams)
        for tolerance in [.02,.04,.08]:
            for votes in [1,2,4]:
                volume = refine(base,fit_cams,depth,valid,tolerance,votes)
                result_metrics = describe(volume,cameras,masks,fit_views,heldout)
                report['sensitivity'].append(dict(calibration=mode,tolerance=tolerance,min_views=votes,**result_metrics))
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:report[k] for k in ['character','variants']},indent=2))


def evaluate_control(control, cache, out, shared=False):
    characters = json.loads((control/'characters.json').read_text())
    truth = np.load(control/'truth.npz')['depths']
    data = np.load(cache)
    report = dict(primary=dict(calibration='hull',tolerance=.04,min_views=2),characters={})
    out.mkdir(parents=True,exist_ok=True)
    for row,character in enumerate(characters):
        path = Path(character)
        volume = np.load(path/'generated/volume.npz')['occupancy']
        masks = [np.isfinite(d) for d in truth[row*4:row*4+4]]
        cameras = [dict(angle=a,elevation=.087,cx=192.,floor=350.,scale=300.) for a in [0,np.pi/2,np.pi,3*np.pi/2]]
        manifest = json.loads((path/'character.json').read_text())
        rig = json.loads((path/manifest['rig']).read_text())
        base,_ = carve(masks,cameras,volume.shape[0],1,rig.get('arm_gap'))
        raw = [data[f'depth{i}'] for i in range(row*4,row*4+4)]
        current = dict(silhouette_volume_iou=iou(base,volume),variants={},depth_quality=[])
        for mode in (['planar','hull','thin','shared'] if shared else ['planar','hull','thin']):
            depth,valid,metrics = calibrate(base,cameras,raw,masks,mode)
            result = refine(base,cameras,depth,valid,tolerance=.04,min_views=2)
            current['variants'][mode] = dict(volume_iou=iou(result,volume),occupied_voxels=int(result.sum()),calibration=metrics)
        for i in range(4):
            exact = truth[row*4+i]
            yy,xx = np.indices(exact.shape)
            interior = ndi.binary_erosion(masks[i],iterations=3)
            train = interior & ((xx//24+yy//24)%2==0)
            test = interior & ~train
            oracle,metrics = fit_depth(raw[i],exact,train)
            flat = np.median(exact[train])
            current['depth_quality'].append(dict(oracle_calibrated_rmse=float(np.sqrt(np.mean((oracle[test]-exact[test])**2))),
                constant_rmse=float(np.sqrt(np.mean((flat-exact[test])**2))),**metrics))
        report['characters'][character] = current
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('subject',type=Path)
    parser.add_argument('cache',type=Path)
    parser.add_argument('--control',action='store_true')
    parser.add_argument('--shared',action='store_true',help='Also evaluate one scale/offset shared by all views')
    parser.add_argument('--pose-refine',action='store_true',help='Refine fitting yaw/elevation from cached DA3 poses within annotation priors')
    parser.add_argument('--parity',type=int,choices=[0,1],default=0)
    parser.add_argument('--out',type=Path,required=True)
    args = parser.parse_args()
    if args.control:
        evaluate_control(args.subject,args.cache,args.out,args.shared)
    else:
        evaluate_character(args.subject,args.cache,args.out,args.parity,args.shared,args.pose_refine)
