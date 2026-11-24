"""Skin a reconstructed voxel surface, export glTF and render animation tests."""
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy.spatial.transform import Rotation
import trimesh
from geometry.reconstruct import surface, project
from rig import skin_weights, create_clips, matrices, deform, export_glb
from validate_rig import check
from preview import raster


def main(build, config):
    volume = np.load(build/'volume.npz')
    occ=volume['occupancy']; h=occ.shape[0]
    _,normals,quads=surface(occ,h)
    positions=(quads.reshape(-1,3)*2).astype(np.float32)
    normals=np.repeat(normals,4,axis=0).astype(np.float32)
    faces=(np.arange(len(quads))[:,None,None]*4+np.array([[0,1,2],[0,2,3]])).reshape(-1,3).astype(np.int32)
    colors=np.repeat(volume['colors'],4,axis=0)
    srgb=colors.astype(np.float32)/255
    linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
    data=dict(positions=positions,normals=normals,faces=faces,linear_colors=linear)
    cfg=json.loads(config.read_text()); specs=cfg['joints']; names=list(specs)
    parents=np.array([names.index(specs[n]['parent']) if specs[n]['parent'] else -1 for n in names])
    height=float(positions[:,1].max()); joints=np.array([specs[n]['position'] for n in names])*height
    # Identical weights on coincident vertices, including material seams.
    ids,w=skin_weights(positions,names,joints,height,cfg['gates'],cfg.get('arm_gap'))
    clips=create_clips(names,parents,joints,data,ids,w)
    rest,_=matrices(joints,parents,Rotation.identity(len(joints)).as_quat()); p,_=deform(positions,normals,ids,w,rest)
    _,unique,inverse=np.unique(positions,axis=0,return_index=True,return_inverse=True)
    assert np.array_equal(ids,ids[unique][inverse]); assert np.allclose(w,w[unique][inverse])
    export_glb(build/'character_animated.glb',data,names,parents,joints,ids,w,clips)
    np.savez_compressed(build/'rig.npz',**data,colors=colors,ids=ids,weights=w,joints=joints,parents=parents,names=np.array(names),**{f'{name}_{k}':v for name,c in clips.items() for k,v in c.items()})
    mesh=trimesh.Trimesh(positions,faces,process=True)
    metrics=dict(joints=len(names),vertices=len(positions),triangles=len(faces),rest_max_error=float(np.max(abs(p-positions))),weight_sum_max_error=float(np.max(abs(w.sum(1)-1))),welded_watertight=bool(mesh.is_watertight),winding_consistent=bool(mesh.is_winding_consistent),glb_bytes=(build/'character_animated.glb').stat().st_size,**check(build))
    (build/'rig_metrics.json').write_text(json.dumps(metrics,indent=2)); print(json.dumps(metrics,indent=2))
    def render(p,n,angle,world=None):
        cam=dict(angle=angle,elevation=.10,cx=192.,floor=350.,scale=150.)
        u,v,d=project(p,cam); screen=np.column_stack([u,v,d]); img=Image.fromarray(raster(screen,n,np.zeros((len(p),2)),faces,np.zeros((1,1,3),np.uint8),384,384,False,colors.astype(float)))
        if world is not None:
            u,v,_=project(world,cam); draw=ImageDraw.Draw(img)
            for i,k in enumerate(parents):
                if k>=0: draw.line((u[i],v[i],u[k],v[k]),fill='#76f5ec',width=2)
            for x,y in zip(u,v): draw.ellipse((x-3,y-3,x+3,y+3),fill='#fff4b1')
        return img
    sheet=Image.new('RGB',(384*3,384*2))
    for i,a in enumerate([0,np.pi/4,np.pi/2]):
        sheet.paste(render(positions,normals,a),(i*384,0));sheet.paste(render(positions,normals,a,joints),(i*384,384))
    sheet.save(build/'rig_preview.png')
    for name,c in clips.items():
        images=[]
        for m in c['palettes'][::2]:
            p,n=deform(positions,normals,ids,w,m);images.append(render(p,n,.55))
        images[0].save(build/f'{name}.gif',save_all=True,append_images=images[1:],duration=67,loop=0)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--build',type=Path,default=Path('build'));p.add_argument('--config',type=Path,default=Path('source/rig.json'));a=p.parse_args();main(a.build,a.config)
