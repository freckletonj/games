"""Run the official DA3-Small network on CPU, optionally conditioning cameras.

Requires the upstream DA3 source on PYTHONPATH; no model source is vendored.
The underlying network avoids importing unused web/export applications.
"""
import argparse
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from PIL import Image
import torch
from omegaconf import OmegaConf
from safetensors.torch import load_model
from depth_anything_3.cfg import create_object

from geometry.reconstruct import frames_from_source,segment


def camera_tensors(cameras, shapes, resolution):
    extrinsics,intrinsics = [],[]
    for cam,shape in zip(cameras,shapes):
        a,e = cam['angle'],cam['elevation']
        ext = np.eye(4)
        ext[:3,:3] = [[np.cos(a),0,-np.sin(a)],
            [np.sin(a)*np.sin(e),-np.cos(e),np.cos(a)*np.sin(e)],
            [-np.sin(a)*np.cos(e),-np.sin(e),-np.cos(a)*np.cos(e)]]
        # DA3 camera tokens encode centered principal points. Express the
        # source crop offset as camera translation in the long-lens model.
        ext[:3,3] = [(cam['cx']-shape[1]/2)/cam['scale'],
                       (cam['floor']-shape[0]/2)/cam['scale'],6.]
        k = np.eye(3)
        k[0,0],k[1,1] = 6*cam['scale']*resolution/shape[1],6*cam['scale']*resolution/shape[0]
        k[0,2],k[1,2] = resolution/2,resolution/2
        extrinsics.append(ext)
        intrinsics.append(k)
    ex = torch.tensor(np.array(extrinsics),dtype=torch.float32)[None]
    # Same gauge normalization as upstream's inference API.
    ex = ex @ torch.linalg.inv(ex[:,0:1])
    positions = torch.linalg.inv(ex)[...,:3,3]
    scale = torch.norm(positions,dim=-1).median(dim=1).values.clamp_min(.1)
    ex[...,:3,3] /= scale[:,None,None]
    return ex,torch.tensor(np.array(intrinsics),dtype=torch.float32)[None]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--rows',type=int,required=True)
    parser.add_argument('--cols',type=int,required=True)
    parser.add_argument('--views',type=int,nargs='+',required=True)
    parser.add_argument('--group-size',type=int,required=True)
    parser.add_argument('--model',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--cameras',type=Path)
    parser.add_argument('--resolution',type=int,default=378)
    args = parser.parse_args()
    torch.set_num_threads(4)
    config = json.loads((args.model/'config.json').read_text())
    net = create_object(OmegaConf.create(config['config'])).eval()
    container = torch.nn.Module()
    container.add_module('model',net)
    # load_model resolves shared LayerNorm aliases omitted by safetensors.
    load_model(container,str(args.model/'model.safetensors'),strict=True)
    frames = frames_from_source(args.source,args.rows,args.cols)
    cameras = json.loads(args.cameras.read_text()) if args.cameras else None
    arrays,groups = {},[]
    for start in range(0,len(args.views),args.group_size):
        selected = args.views[start:start+args.group_size]
        tensors = []
        for i in selected:
            image = Image.fromarray(frames[i])
            canvas = Image.new('RGBA',image.size,(128,128,128,255))
            canvas.alpha_composite(image)
            rgb = np.asarray(canvas.convert('RGB').resize((args.resolution,args.resolution),Image.Resampling.BICUBIC)).astype(np.float32)/255
            tensors.append(torch.from_numpy(((rgb-[.485,.456,.406])/[.229,.224,.225]).astype(np.float32)).permute(2,0,1))
        inputs = torch.stack(tensors)[None]
        ex,intr = camera_tensors([cameras[i] for i in selected],[frames[i].shape for i in selected],args.resolution) if cameras else (None,None)
        with torch.inference_mode():
            began = time.perf_counter()
            output = net(inputs,extrinsics=ex,intrinsics=intr,ref_view_strategy='first')
            elapsed = time.perf_counter()-began
        for j,i in enumerate(selected):
            depth = torch.nn.functional.interpolate(output['depth'][0,j][None,None],size=frames[i].shape[:2],mode='bilinear',align_corners=False)[0,0].numpy()
            assert np.isfinite(depth).all() and depth.min()>0
            arrays[f'depth{i}'] = -depth
            arrays[f'mask{i}'] = segment(frames[i])
            arrays[f'pose{i}'] = output['extrinsics'][0,j].numpy()
        groups.append(dict(views=selected,seconds=elapsed))
        print(groups[-1],flush=True)
    args.out.mkdir(parents=True,exist_ok=True)
    np.savez_compressed(args.out/'predictions.npz',**arrays)
    (args.out/'inference.json').write_text(json.dumps(dict(model='DA3-SMALL',device='cpu-float32',resolution=args.resolution,
        semantics='negative camera distance; larger nearer',camera_conditioned=cameras is not None,
        source_sha256=hashlib.sha256(args.source.read_bytes()).hexdigest(),checkpoint_sha256=hashlib.sha256((args.model/'model.safetensors').read_bytes()).hexdigest(),groups=groups),indent=2))


if __name__=='__main__':
    main()
