"""Compare SIFT and SuperPoint/LightGlue on rigid controls and source turntables."""
import argparse
import json
from pathlib import Path
import time

import cv2
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi

from geometry.reconstruct import frames_from_source,segment,camera,project,surface
from depth_trial import render_depth
from preview import raster


def projection_matrix(cam):
    a,e,s = cam['angle'],cam['elevation'],cam['scale']
    return s*np.array([[np.cos(a),0,-np.sin(a)],
        [np.sin(a)*np.sin(e),-np.cos(e),np.cos(a)*np.sin(e)]]),np.array([cam['cx'],cam['floor']])


def triangulate(observations,cameras):
    matrices,values = [],[]
    for view,pixel in observations:
        a,b = projection_matrix(cameras[view])
        matrices.append(a)
        values.append(pixel-b)
    a,b = np.concatenate(matrices),np.concatenate(values)
    point = np.linalg.lstsq(a,b,rcond=None)[0]
    residual = (a@point-b).reshape(-1,2)
    return point,float(np.sqrt(np.mean(np.sum(residual**2,axis=1))))


def unproject(pixels,depth,cam):
    u = (pixels[:,0]-cam['cx'])/cam['scale']
    v = (cam['floor']-pixels[:,1])/cam['scale']
    d = ndi.map_coordinates(depth,[pixels[:,1],pixels[:,0]],order=0,mode='constant',cval=np.nan)
    a,e = cam['angle'],cam['elevation']
    y = v*np.cos(e)+d*np.sin(e)
    k = d*np.cos(e)-v*np.sin(e)
    return np.column_stack([u*np.cos(a)+k*np.sin(a),y,-u*np.sin(a)+k*np.cos(a)])


def prepare(character,out):
    data = np.load(character/'generated/volume.npz')
    volume = data['occupancy']
    _,normals,quads = surface(volume,volume.shape[0])
    positions = quads.reshape(-1,3)
    faces = (np.arange(len(quads))[:,None,None]*4+np.array([[0,1,2],[0,2,3]])).reshape(-1,3)
    sheet = Image.new('RGBA',(1024,1024))
    cameras,depths = [],{}
    for i,a in enumerate(np.linspace(0,2*np.pi,16,endpoint=False)):
        cam = dict(angle=float(a),elevation=.087,cx=128.,floor=236.,scale=210.)
        d = render_depth(volume,cam,(256,256))
        u,v,z = project(positions,cam)
        rgb = raster(np.column_stack([u,v,z]),np.repeat(normals,4,0),np.zeros((len(positions),2)),faces,
            np.zeros((1,1,3),np.uint8),256,256,False,np.repeat(data['colors'],4,0).astype(float))
        sheet.paste(Image.fromarray(np.dstack([rgb,np.isfinite(d)*255]).astype(np.uint8)),(i%4*256,i//4*256))
        cameras.append(cam)
        depths[f'depth{i}'] = d
    out.mkdir(parents=True,exist_ok=True)
    sheet.save(out/'turntable.png')
    np.savez_compressed(out/'truth.npz',**depths)
    (out/'cameras.json').write_text(json.dumps(cameras))


def run(character,out,method,control=None,verify=False):
    manifest = json.loads((character/'character.json').read_text())
    settings = manifest['reconstruction']
    source = control/'turntable.png' if control else character/manifest['source']
    rgba = frames_from_source(source,4,4)
    masks = [segment(f) for f in rgba]
    cameras = json.loads((control/'cameras.json').read_text()) if control else [camera(m,np.deg2rad(a),np.deg2rad(settings['elevation'])) for m,a in zip(masks,settings['angles'])]
    truth = np.load(control/'truth.npz') if control else None
    images = []
    for frame in rgba:
        image = Image.fromarray(frame)
        canvas = Image.new('RGBA',image.size,(128,128,128,255))
        canvas.alpha_composite(image)
        images.append(np.asarray(canvas.convert('RGB')))
    features,points = [],[]
    if method=='lightglue':
        import torch
        from lightglue import SuperPoint,LightGlue
        torch.set_num_threads(4)
        extractor = SuperPoint(max_num_keypoints=512).eval()
        matcher = LightGlue(features='superpoint',flash=False,depth_confidence=-1,width_confidence=-1).eval()
        with torch.inference_mode():
            for image,mask in zip(images,masks):
                feature = extractor.extract(torch.from_numpy(image.copy()).permute(2,0,1).float()/255,resize=None)
                p = feature['keypoints'][0].numpy()
                keep = ndi.map_coordinates(ndi.distance_transform_edt(mask),[p[:,1],p[:,0]],order=0,mode='constant')>2
                feature = {k:v[:,keep] if k in ['keypoints','keypoint_scores','descriptors'] else v for k,v in feature.items()}
                features.append(feature)
                points.append(feature['keypoints'][0].numpy())
    else:
        extractor = cv2.SIFT_create(nfeatures=512)
        for image,mask in zip(images,masks):
            kp,descriptor = extractor.detectAndCompute(cv2.cvtColor(image,cv2.COLOR_RGB2GRAY),ndi.binary_erosion(mask,iterations=2).astype(np.uint8)*255)
            points.append(np.array([k.pt for k in kp],dtype=float))
            features.append(descriptor)
        matcher = cv2.BFMatcher(cv2.NORM_L2)
    pairs,matches = [],{}
    out.mkdir(parents=True,exist_ok=True)
    for gap in [1,2]:
        for i in range(len(images)):
            j = (i+gap)%len(images)
            began = time.perf_counter()
            if method=='lightglue':
                with torch.inference_mode():
                    result = matcher({'image0':features[i],'image1':features[j]})
                ids = result['matches'][0].numpy()
            else:
                forward = matcher.knnMatch(features[i],features[j],k=2)
                backward = matcher.knnMatch(features[j],features[i],k=2)
                reverse = {a.queryIdx:a.trainIdx for a,b in backward if a.distance<.75*b.distance}
                ids = np.array([[a.queryIdx,a.trainIdx] for a,b in forward if a.distance<.75*b.distance and reverse.get(a.trainIdx)==a.queryIdx],dtype=int).reshape(-1,2)
            raw_count = len(ids)
            if verify and len(ids)>=8:
                _,inliers = cv2.findFundamentalMat(points[i][ids[:,0]],points[j][ids[:,1]],cv2.USAC_MAGSAC,1.5,.999)
                ids = ids[inliers.ravel().astype(bool)] if inliers is not None else np.empty((0,2),int)
            elif verify:
                ids = np.empty((0,2),int)
            matches[i,j] = ids
            entry = dict(first=i,second=j,raw_matches=raw_count,matches=len(ids),seconds=time.perf_counter()-began)
            if truth is not None and len(ids):
                p0,p1 = points[i][ids[:,0]],points[j][ids[:,1]]
                world = unproject(p0,truth[f'depth{i}'],cameras[i])
                u,v,d = project(world,cameras[j])
                error = np.linalg.norm(np.column_stack([u,v])-p1,axis=1)
                target_depth = ndi.map_coordinates(truth[f'depth{j}'],[v,u],order=0,mode='constant',cval=np.nan)
                valid = np.isfinite(error) & np.isfinite(target_depth)
                inlier = valid & (error<=3) & (abs(d-target_depth)<.04)
                entry.update(geometric_inliers=int(inlier.sum()),inlier_fraction=float(inlier.mean()),median_error=float(np.median(error[np.isfinite(error)])))
            pairs.append(entry)
            if gap==1 and i in [0,4]:
                canvas = Image.new('RGB',(images[i].shape[1]+images[j].shape[1],max(images[i].shape[0],images[j].shape[0])))
                canvas.paste(Image.fromarray(images[i]),(0,0));canvas.paste(Image.fromarray(images[j]),(images[i].shape[1],0));draw=ImageDraw.Draw(canvas)
                for a,b in ids[:100]:
                    p,q = points[i][a],points[j][b];draw.line((float(p[0]),float(p[1]),float(q[0]+images[i].shape[1]),float(q[1])),fill='#6be7b9',width=1)
                canvas.save(out/f'matches-{i}.png')
    # Three-view cycles test identity consistency, independently of pair scores.
    consistent,available = 0,0
    for i in range(len(images)):
        j,k = (i+1)%len(images),(i+2)%len(images)
        ij,jk,ik = [dict(matches[a,b]) for a,b in [(i,j),(j,k),(i,k)]]
        for a,b in ij.items():
            if b in jk and a in ik:
                available += 1
                consistent += int(jk[b]==ik[a])
    # Build tracks without adding a graph-library dependency.
    offsets = np.r_[0,np.cumsum([len(p) for p in points])]
    parent = np.arange(offsets[-1])
    def root(i):
        while parent[i]!=i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for (i,j),ids in matches.items():
        for a,b in ids:
            parent[root(offsets[i]+a)] = root(offsets[j]+b)
    tracks = {}
    for i,p in enumerate(points):
        for a,pixel in enumerate(p):
            tracks.setdefault(root(offsets[i]+a),[]).append((i,pixel))
    retained,errors,observations,candidates = [],[],[],[]
    for track in tracks.values():
        if len(track)<3 or len({i for i,_ in track})!=len(track):
            continue
        candidates.append([(i,p.tolist()) for i,p in track])
        point,error = triangulate(track,cameras)
        errors.append(error)
        if error<=3 and 0<=point[1]<=1.1 and max(abs(point[0]),abs(point[2]))<=.6:
            retained.append(point)
            observations.append([(i,p.tolist()) for i,p in track])
    adjacent = [p for p in pairs if p['second']==(p['first']+1)%len(images)]
    report = dict(character=str(character),rigid_control=control is not None,method=method,geometric_verification=verify,
        features_per_view=[len(p) for p in points],adjacent_matches=int(sum(p['matches'] for p in adjacent)),
        cycle_consistent=consistent,cycle_testable=available,cycle_fraction=consistent/available if available else None,
        triangulated_tracks=len(retained),track_reprojection_median=float(np.median(errors)) if errors else None,pairs=pairs)
    if control:
        report['adjacent_ground_truth_inlier_fraction'] = sum(p.get('geometric_inliers',0) for p in adjacent)/max(1,sum(p['matches'] for p in adjacent))
    np.save(out/'points.npy',np.array(retained).reshape(-1,3))
    (out/'tracks.json').write_text(json.dumps(observations))
    (out/'candidate_tracks.json').write_text(json.dumps(candidates))
    (out/'cameras.json').write_text(json.dumps(cameras))
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k!='pairs'},indent=2))


if __name__=='__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('character',type=Path)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--method',choices=['sift','lightglue'])
    parser.add_argument('--control',type=Path)
    parser.add_argument('--prepare',action='store_true')
    parser.add_argument('--verify',action='store_true',help='Verify tentative matches with OpenCV MAGSAC')
    args = parser.parse_args()
    if args.prepare:
        prepare(args.character,args.out)
    else:
        run(args.character,args.out,args.method,args.control,args.verify)
