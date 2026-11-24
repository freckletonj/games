"""Measure sampled deformation and stance drift beyond the GLB validity audit."""
import argparse
import json
from pathlib import Path

import numpy as np
from rig import deform


def assess(build, scale, speed):
    rig = np.load(build/'rig.npz')
    p,n,ids,w = (rig[key] for key in ['positions','normals','ids','weights'])
    names = list(rig['names'])
    faces = rig['faces']
    edges = np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]])
    rest = np.linalg.norm(p[edges[:,0]]-p[edges[:,1]],axis=1)
    stretches = []
    for palette in rig['walk_palettes']:
        moved,_ = deform(p,n,ids,w,palette)
        stretches.append(np.linalg.norm(moved[edges[:,0]]-moved[edges[:,1]],axis=1)/rest)
    ratio = np.concatenate(stretches)
    result = dict(walk_edge_length_ratio_p99=float(np.quantile(ratio,.99)),
                  walk_edge_length_ratio_max=float(ratio.max()),scale=scale,travel_speed=speed,paws={})
    times = rig['walk_times']
    phase = np.sin(2*np.pi*times/times[-1])
    for pair,sign in [('front',1),('rear',-1)]:
        for side,direction in [('L',1),('R',-1)]:
            name = pair+'Paw'+side
            mask = (w*(ids==names.index(name))).sum(1)>.5
            stance = sign*direction*phase>=0
            indices = np.flatnonzero(stance)
            # Evaluate contiguous stance segments; avoid crossing the loop seam.
            segments = np.split(indices,np.flatnonzero(np.diff(indices)>1)+1)
            drift = []
            gaps = []
            for segment in segments:
                centers = []
                for i in segment:
                    moved,_ = deform(p[mask],n[mask],ids[mask],w[mask],rig['walk_palettes'][i])
                    centers.append(moved.mean(0)*scale+[0,0,float(times[i])*speed])
                    gaps.append(float(moved[:,1].min()*scale))
                drift.append(float(np.ptp(np.array(centers)[:,2])))
            result['paws'][name] = dict(stance_forward_drift=max(drift),stance_floor_gap_max=max(gaps),
                                       rest_paw_length=float(np.ptp(p[mask,2])*scale))
    return result


if __name__=='__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build',type=Path)
    parser.add_argument('--scale',type=float,required=True)
    parser.add_argument('--speed',type=float,required=True)
    parser.add_argument('--out',type=Path,required=True)
    args = parser.parse_args()
    result = assess(args.build,args.scale,args.speed)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
