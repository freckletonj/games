import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import trimesh

def frames_from_source(path, rows, cols):
    im = Image.open(path)
    if getattr(im, "n_frames", 1) > 1:
        return [np.asarray(im.seek(i) or im.convert('RGBA')) for i in range(im.n_frames)]
    w,h = im.size
    return [np.asarray(im.crop((round(c*w/cols),round(r*h/rows),round((c+1)*w/cols),round((r+1)*h/rows))).convert('RGBA')) for r in range(rows) for c in range(cols)]

def segment(rgba):
    mask = rgba[:,:,3] >= 128
    if mask.all(): raise ValueError('Source must have a transparent background')
    labels, _ = ndi.label(mask)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    return labels == sizes.argmax()

def camera(mask,angle,elevation):
    y,x = np.where(mask)
    # Use the boot midpoint as a translation anchor, rather than centering the asymmetric ponytail.
    foot = y > y.max() - .12*(y.max()-y.min())
    cx = (x[foot].min()+x[foot].max())/2
    scale = (y.max()-y.min()+1)/np.cos(elevation)
    return dict(angle=float(angle), elevation=float(elevation), cx=float(cx), floor=float(y.max()+.5), scale=float(scale))

def project(p,cam):
    a,e=cam['angle'],cam['elevation']; x,y,z=p.T
    u=x*np.cos(a)-z*np.sin(a)
    depth=x*np.sin(a)+z*np.cos(a)
    v=y*np.cos(e)-depth*np.sin(e)
    return u*cam['scale']+cam['cx'], cam['floor']-v*cam['scale'], depth*np.cos(e)+y*np.sin(e)

def carve(masks,cams,h,agreement,arm_gap=None):
    coords=np.indices((h,h+4,h)).reshape(3,-1).T
    p=(coords+[-h/2+.5,.5,-h/2+.5])/h
    votes=np.zeros(len(p),np.int16)
    for mask,cam in zip(masks,cams):
        u,v,_=project(p,cam)
        # Signed distance with a one-pixel uncertainty margin.
        sdf=ndi.distance_transform_edt(mask)-ndi.distance_transform_edt(~mask)
        votes+=ndi.map_coordinates(sdf,[v,u],order=1,mode='constant',cval=-100)>-1.2
    occ=(votes>=int(np.ceil(agreement*len(cams)))).reshape(h,h+4,h)
    labels,n=ndi.label(occ); sizes=np.bincount(labels.ravel());sizes[0]=0
    occ=ndi.binary_fill_holes(labels==sizes.argmax())
    # The visual hull cannot recover hidden arm/waist gaps reliably. A small
    # configurable slit below each shoulder creates articulation clearance.
    if arm_gap:
        for y in range(occ.shape[1]):
            level=(y+.5)/h
            if arm_gap['y_range'][0] <= level < arm_gap['y_range'][1]:
                x=np.interp(level,arm_gap['levels'],arm_gap['offsets'])
                k=round(x*h)
                occ[h//2+k,y,:]=False
                occ[h//2-1-k,y,:]=False
    # Resolve edge-only voxel contacts: two diagonally occupied cells in a
    # 2x2 cross-section create a non-manifold mesh edge. Fill the better-supported
    # empty cell, iterating because a change can affect another cross-section.
    support=votes.reshape(occ.shape)
    while True:
        changed=0
        for axis in range(3):
            a=np.moveaxis(occ,axis,0); v=np.moveaxis(support,axis,0)
            for pattern in (0,1):
                p,q,r,t=a[:,:-1,:-1],a[:,1:,:-1],a[:,:-1,1:],a[:,1:,1:]
                bad=(p&t&~q&~r) if pattern==0 else (q&r&~p&~t)
                for i,j,k in np.argwhere(bad):
                    opts=[(i,j+1,k),(i,j,k+1)] if pattern==0 else [(i,j,k),(i,j+1,k+1)]
                    a[max(opts,key=lambda x:v[x])]=True;changed+=1
        if not changed:break
    return occ, support

def surface(occ,h):
    cells=[]; normals=[]; vertices=[]
    for axis in range(3):
        for sign in [-1,1]:
            delta=np.eye(3,dtype=int)[axis]*sign
            padded=np.pad(occ,1); slices=[slice(1,-1)]*3; slices[axis]=slice(2,None) if sign==1 else slice(None,-2)
            c=np.argwhere(occ&~padded[tuple(slices)])
            a=np.eye(3)[(axis+1)%3]; b=np.eye(3)[(axis+2)%3]*sign
            center=(c+[-h/2+.5,.5,-h/2+.5]+delta*.5)/h
            quad=center[:,None,:]+np.array([-a-b,a-b,a+b,-a+b])[None,:,:]/(2*h)
            cells.append(center);normals.append(np.tile(delta,(len(c),1)));vertices.append(quad)
    return np.concatenate(cells),np.concatenate(normals),np.concatenate(vertices)

def colors_for_surface(centers,normals,frames,masks,cams,h):
    samples=[]; weights=[]
    # Rasterize surface centers at voxel-scale screen resolution for occlusion filtering.
    for rgb,mask,cam in zip(frames,masks,cams):
        u,v,d=project(centers,cam); a,e=cam['angle'],cam['elevation']
        view=np.array([np.sin(a)*np.cos(e),np.sin(e),np.cos(a)*np.cos(e)])
        facing=np.maximum(normals@view,0)
        factor=h/cam['scale']*1.5
        ix=np.clip(np.rint(u*factor).astype(int),0,round(rgb.shape[1]*factor));iy=np.clip(np.rint(v*factor).astype(int),0,round(rgb.shape[0]*factor))
        buf=np.full((round(rgb.shape[0]*factor)+1,round(rgb.shape[1]*factor)+1),-np.inf)
        np.maximum.at(buf,(iy,ix),d)
        visible=d>=buf[iy,ix]-1.25/h
        safe=ndi.map_coordinates(ndi.distance_transform_edt(mask),[v,u],order=1,mode='constant',cval=0)
        col=np.stack([ndi.map_coordinates(rgb[:,:,k].astype(float),[v,u],order=1,mode='nearest') for k in range(3)],axis=1)
        weight=facing**8*visible*np.clip(safe/3,0,1)
        samples.append(col);weights.append(weight)
    samples=np.array(samples);weights=np.array(weights)
    # Blend only the strongest near-normal views to avoid washing out details.
    best=weights.max(0);weights*=weights>=best[None,:]*.45
    color=(samples*weights[:,:,None]).sum(0)/np.maximum(weights.sum(0)[:,None],1e-9)
    valid=best>0
    from scipy.spatial import cKDTree
    color[~valid]=color[valid][cKDTree(centers[valid]).query(centers[~valid])[1]]
    return np.rint(color).clip(0,255).astype(np.uint8),valid

def preview(quads,normals,colors,angle,elev=.13,size=384):
    a,e=angle,elev
    cam=dict(angle=a,elevation=e,cx=size/2,floor=size*.91,scale=size*.79)
    u,v,d=project(quads.reshape(-1,3),cam); uv=np.stack([u,v],1).reshape(-1,4,2); depth=d.reshape(-1,4).mean(1)
    direction=np.array([np.sin(a)*np.cos(e),np.sin(e),np.cos(a)*np.cos(e)])
    visible=normals@direction>0
    im=Image.new('RGB',(size,size),(78,82,90));draw=ImageDraw.Draw(im)
    for i in np.argsort(depth):
        if visible[i]: draw.polygon([tuple(x) for x in uv[i]],fill=tuple(colors[i]))
    return im

def main():
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--rows',type=int,default=4);p.add_argument('--cols',type=int,default=4);p.add_argument('--height',type=int,default=64);p.add_argument('--agreement',type=float,default=.90);p.add_argument('--elevation',type=float,default=5);p.add_argument('--angles',type=float,nargs='+');p.add_argument('--view-indices',type=int,nargs='+');p.add_argument('--rig-config',type=Path);args=p.parse_args();out=args.out;out.mkdir(parents=True,exist_ok=True)
    frames=frames_from_source(args.source,args.rows,args.cols);angles=args.angles or np.linspace(0,360,len(frames),endpoint=False); assert len(angles)==len(frames)
    masks=[segment(rgba) for rgba in frames];frames=[rgba[:,:,:3].copy() for rgba in frames];cams=[camera(m,np.deg2rad(a),np.deg2rad(args.elevation)) for m,a in zip(masks,angles)]
    # Last frame is nearly a duplicate front view; exclude from reconstruction.
    use=list(range(len(frames)-1 if abs(angles[-1]-angles[0]-360)<1 else len(frames)))
    use=args.view_indices or use
    fs=[frames[i] for i in use];ms=[masks[i] for i in use];cs=[cams[i] for i in use]
    arm_gap=json.loads(args.rig_config.read_text()).get('arm_gap') if args.rig_config else None
    occ,votes=carve(ms,cs,args.height,args.agreement,arm_gap);centers,normals,quads=surface(occ,args.height);# Fuse colors at occupied surface cells, not independently on each axis-aligned face.
    cell_indices=np.rint((centers-normals*.5/args.height)*args.height-[-args.height/2+.5,.5,-args.height/2+.5]).astype(int)
    unique,inverse=np.unique(cell_indices,axis=0,return_inverse=True)
    sdf=ndi.distance_transform_edt(occ)-ndi.distance_transform_edt(~occ)
    grad=-np.stack(np.gradient(ndi.gaussian_filter(sdf,1.25)),axis=-1)[tuple(unique.T)]
    grad/=np.maximum(np.linalg.norm(grad,axis=1,keepdims=True),1e-9)
    surface_points=(unique+[-args.height/2+.5,.5,-args.height/2+.5]+.45*grad)/args.height
    cell_colors,cell_valid=colors_for_surface(surface_points,grad,fs,ms,cs,args.height)
    colors=cell_colors[inverse];valid=cell_valid[inverse]
    faces=(np.arange(len(quads))[:,None,None]*4+np.array([[0,1,2],[0,2,3]])).reshape(-1,3)
    mesh=trimesh.Trimesh(vertices=quads.reshape(-1,3)*2,faces=faces,vertex_colors=np.repeat(colors,4,axis=0),process=False)
    # Vertex colors are linear in glTF. Use an unlit material because source imagery already contains lighting.
    srgb=colors.astype(float)/255
    linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
    mesh.visual.vertex_colors=np.repeat(np.rint(linear*255).astype(np.uint8),4,axis=0)
    def unlit(tree):
        tree.setdefault('extensionsUsed',[]).append('KHR_materials_unlit')
        materials=tree.setdefault('materials',[])
        if not materials: materials.append({'pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1]}})
        for material in materials: material.setdefault('extensions',{})['KHR_materials_unlit']={}
        for model in tree['meshes']:
            for primitive in model['primitives']: primitive['material']=0
    (out/'character.glb').write_bytes(trimesh.exchange.gltf.export_glb(mesh,tree_postprocessor=unlit));np.savez_compressed(out/'volume.npz',occupancy=occ,votes=votes,centers=centers,normals=normals,colors=colors)
    contact=Image.new('RGB',(4*frames[0].shape[1],int(np.ceil(len(frames)/4))*frames[0].shape[0]));
    for i,(rgb,m) in enumerate(zip(frames,masks)):
        vis=rgb.copy();vis[~m]=[34,38,43];contact.paste(Image.fromarray(vis),((i%4)*rgb.shape[1],(i//4)*rgb.shape[0]))
    contact.save(out/'segmentation.png')
    renders=[preview(quads,normals,colors,a) for a in np.linspace(0,2*np.pi,36,endpoint=False)]
    renders[0].save(out/'reconstruction.gif',save_all=True,append_images=renders[1:],duration=85,loop=0)
    sheet=Image.new('RGB',(4*384,384));
    for i,j in enumerate([0,5,9,18]):sheet.paste(renders[j],(i*384,0))
    sheet.save(out/'preview.png')
    
    # Fit score: orthographic silhouette rasterized from projected exposed faces.
    ious=[]
    for mask,cam in zip(masks,cams):
        u,v,_=project(quads.reshape(-1,3),cam); uv=np.stack([u,v],1).reshape(-1,4,2); image=Image.new('1',(mask.shape[1],mask.shape[0]));draw=ImageDraw.Draw(image)
        for q in uv:draw.polygon([tuple(x) for x in q],fill=1)
        pred=np.asarray(image);ious.append(float((pred&mask).sum()/(pred|mask).sum()))
    report=dict(arm_gap=arm_gap,height=args.height,source_frames=len(frames),used_frames=len(use),agreement=args.agreement,occupied_voxels=int(occ.sum()),surface_quads=len(quads),triangles=len(faces),direct_color_fraction=float(valid.mean()),silhouette_iou=ious,mean_iou=float(np.mean(ious)),fit_view_indices=use,fit_mean_iou=float(np.mean(np.array(ious)[use])),cameras=cams)
    (out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k not in ['cameras','silhouette_iou']},indent=2))
if __name__=='__main__':main()
