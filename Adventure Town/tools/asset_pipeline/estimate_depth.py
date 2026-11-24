"""Estimate registered relative nearness on transparent source views using DA-V2.

This optional research tool needs torch/transformers, not the basic compiler.
Raw float predictions are saved without per-frame display normalization.
"""
import argparse
import hashlib
import json
from pathlib import Path
import resource
import time

import numpy as np
from PIL import Image
import torch
import transformers
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

from geometry.reconstruct import frames_from_source, segment


def estimate(source, rows, cols, model_path, out, background=128, threads=4):
    torch.set_num_threads(threads)
    processor = AutoImageProcessor.from_pretrained(model_path, backend='pil', local_files_only=True)
    model = AutoModelForDepthEstimation.from_pretrained(model_path, local_files_only=True).eval()
    frames = frames_from_source(source,rows,cols)
    out.mkdir(parents=True,exist_ok=True)
    arrays = {}
    times = []
    sheet = Image.new('RGB',(256*4,256*((len(frames)+3)//4)), '#30383a')
    with torch.inference_mode():
        for i,rgba in enumerate(frames):
            image = Image.fromarray(rgba)
            canvas = Image.new('RGBA',image.size,(background,background,background,255))
            canvas.alpha_composite(image)
            inputs = processor(images=canvas.convert('RGB'),return_tensors='pt')
            start = time.perf_counter()
            prediction = model(**inputs).predicted_depth[:,None]
            depth = torch.nn.functional.interpolate(prediction,size=rgba.shape[:2],mode='bicubic',align_corners=False)[0,0].numpy()
            times.append(time.perf_counter()-start)
            mask = segment(rgba)
            assert np.isfinite(depth).all()
            arrays[f'depth{i}'] = depth
            arrays[f'mask{i}'] = mask
            low,high = np.percentile(depth[mask],[2,98])
            gray = np.clip((depth-low)/(high-low)*255,0,255).astype(np.uint8)
            rgb = np.repeat(gray[:,:,None],3,axis=2)
            rgb[~mask] = [48,56,58]
            cell = Image.fromarray(rgb)
            cell.thumbnail((256,256))
            sheet.paste(cell,((i%4)*256,(i//4)*256))
            print(f'view {i}: {times[-1]:.3f}s',flush=True)
    np.savez_compressed(out/'predictions.npz',**arrays)
    sheet.save(out/'relative-depth-preview.png')
    report = dict(model='Depth-Anything-V2-Small-hf',checkpoint_sha256=hashlib.sha256((model_path/'model.safetensors').read_bytes()).hexdigest(),
        source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),source=str(source),rows=rows,cols=cols,
        semantics='relative nearness, larger nearer; not metric or shared across views',background=background,
        device='cpu',threads=threads,torch=torch.__version__,transformers=transformers.__version__,
        inference_seconds=times,peak_memory_MiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024)
    (out/'inference.json').write_text(json.dumps(report,indent=2))


if __name__=='__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--rows',type=int,required=True)
    parser.add_argument('--cols',type=int,required=True)
    parser.add_argument('--model',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--background',type=int,default=128)
    parser.add_argument('--threads',type=int,default=4)
    args = parser.parse_args()
    estimate(args.source,args.rows,args.cols,args.model,args.out,args.background,args.threads)
