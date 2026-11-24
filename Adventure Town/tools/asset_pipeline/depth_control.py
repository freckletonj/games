"""Prepare/evaluate generated depth against renders of actual character volumes."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from depth_trial import render_depth, register_depth, refine, iou
from geometry.reconstruct import frames_from_source, surface, project, carve
from preview import raster


def prepare(characters, out):
    out.mkdir(parents=True,exist_ok=True)
    sheet = Image.new('RGBA',(384*4,384*len(characters)))
    depths = []
    for row,character in enumerate(characters):
        data = np.load(character/'generated/volume.npz')
        occ = data['occupancy']
        _,normals,quads = surface(occ,occ.shape[0])
        positions = quads.reshape(-1,3)
        faces = (np.arange(len(quads))[:,None,None]*4+np.array([[0,1,2],[0,2,3]])).reshape(-1,3)
        for col,angle in enumerate([0,np.pi/2,np.pi,3*np.pi/2]):
            cam = dict(angle=angle,elevation=.087,cx=192.,floor=350.,scale=300.)
            d = render_depth(occ,cam,(384,384))
            u,v,z = project(positions,cam)
            rgb = raster(np.column_stack([u,v,z]),np.repeat(normals,4,0),np.zeros((len(positions),2)),faces,
                np.zeros((1,1,3),np.uint8),384,384,False,np.repeat(data['colors'],4,0).astype(float))
            rgba = np.dstack([rgb,np.isfinite(d)*255]).astype(np.uint8)
            sheet.paste(Image.fromarray(rgba),(col*384,row*384))
            depths.append(d)
    sheet.save(out/'control-render.png')
    np.savez_compressed(out/'truth.npz',depths=depths)
    (out/'characters.json').write_text(json.dumps([str(c) for c in characters]))


def evaluate(control, generated, out):
    truth = np.load(control/'truth.npz')['depths']
    characters = json.loads((control/'characters.json').read_text())
    frames = frames_from_source(generated,len(characters),4)
    yy,xx = np.indices(truth[0].shape)
    train = (xx//24+yy//24)%2==0
    report = dict(encoding='hue',units='character heights',depth_tolerance_heights=.08,
                  required_free_space_views=2,views=[],reconstructions={})
    panel = Image.new('RGB',(384*4,384*len(frames)), '#263238')
    for i,(frame,exact) in enumerate(zip(frames,truth)):
        mask = np.isfinite(exact)
        estimated,valid,registration = register_depth(frame,mask,'hue')
        calibration = valid & train
        heldout = valid & ~train
        design = np.column_stack([estimated[calibration],np.ones(calibration.sum())])
        scale,shift = np.linalg.lstsq(design,exact[calibration],rcond=None)[0]
        calibrated = estimated*scale+shift
        flat = np.median(exact[calibration])
        report['views'].append(dict(character=characters[i//4],angle_degrees=(i%4)*90,
            registration_iou=registration,valid_fraction=float(valid.sum()/mask.sum()),
            raw_rmse=float(np.sqrt(np.mean((estimated[heldout]-exact[heldout])**2))),
            affine_rmse=float(np.sqrt(np.mean((calibrated[heldout]-exact[heldout])**2))),
            constant_rmse=float(np.sqrt(np.mean((flat-exact[heldout])**2))),
            affine_scale=float(scale),affine_shift=float(shift)))
        for col,(values,m) in enumerate([(exact,mask),(estimated,valid),(calibrated,valid),(abs(calibrated-exact),valid)]):
            rgb = np.zeros((*values.shape,3),np.uint8)+38
            if col==3:
                rgb[m,0] = np.clip(values[m]*255/.3,0,255).astype(np.uint8)
            else:
                gray = np.clip((values[m]/1.2+.5)*255,0,255).astype(np.uint8)
                rgb[m] = gray[:,None]
            panel.paste(Image.fromarray(rgb),(col*384,i*384))
    for row,character in enumerate(characters):
        original = np.load(Path(character)/'generated/volume.npz')['occupancy']
        h = original.shape[0]
        ds = list(truth[row*4:row*4+4])
        masks = [np.isfinite(d) for d in ds]
        cams = [dict(angle=a,elevation=.087,cx=192.,floor=350.,scale=300.) for a in [0,np.pi/2,np.pi,3*np.pi/2]]
        base,_ = carve(masks,cams,h,1)
        registered = [register_depth(f,m,'hue') for f,m in zip(frames[row*4:row*4+4],masks)]
        predicted = [r[0] for r in registered]
        valid = [r[1] for r in registered]
        actual = [np.where(m,d,0) for d,m in zip(ds,masks)]
        report['reconstructions'][character] = dict(silhouette_iou=iou(base,original),
            generated_depth_iou=iou(refine(base,cams,predicted,valid),original),
            exact_depth_iou=iou(refine(base,cams,actual,masks),original))
    out.mkdir(parents=True,exist_ok=True)
    panel.save(out/'depth-errors.png')
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command',required=True)
    prep = sub.add_parser('prepare')
    prep.add_argument('characters',type=Path,nargs='+')
    prep.add_argument('--out',type=Path,required=True)
    assess = sub.add_parser('evaluate')
    assess.add_argument('control',type=Path)
    assess.add_argument('generated',type=Path)
    assess.add_argument('--out',type=Path,required=True)
    args = parser.parse_args()
    if args.command=='prepare':
        prepare(args.characters,args.out)
    else:
        evaluate(args.control,args.generated,args.out)
