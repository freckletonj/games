"""Humanoid skin weights, procedural test clips and animated glTF export."""
import json, struct
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation


def smoothstep(a,b,x):
    t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)


def skin_weights(p, names, joints, height, gates=None, arm_gap=None):
    # Anatomical region gates prevent sleeves from sticking to the torso and
    # opposite legs from sharing weights. Within a region use segment distances.
    I={n:i for i,n in enumerate(names)}; x,y,z=p.T; y=y/height; ax=np.abs(x)/height
    w=np.zeros((len(p),len(names)))
    gates=gates or {}
    head=smoothstep(*gates.get('head',[.72,.80]),y); upper=smoothstep(*gates.get('upper',[.49,.66]),y)
    arm=smoothstep(*gates.get('arm_x',[.095,.165]),ax)*smoothstep(*gates.get('arm_bottom',[.39,.46]),y)*(1-smoothstep(*gates.get('arm_top',[.68,.74]),y))
    if arm_gap:
        boundary=np.interp(y,arm_gap['levels'],arm_gap['offsets'])
        arm=smoothstep(boundary-.008,boundary+.012,ax)*smoothstep(*gates['arm_bottom'],y)*(1-smoothstep(*gates['arm_top'],y))
    # Backpack and ponytail must follow the trunk/head, not the arm.
    arm*=smoothstep(-.15,-.08,z/height)*(1-head)
    leg=(1-smoothstep(*gates.get('leg',[.28,.38]),y)); body=1-arm
    w[:,I['head']]=head*body
    w[:,I['chest']]=(1-head)*upper*body*(1-leg)
    w[:,I['pelvis']]=(1-head)*(1-upper)*body*(1-leg)
    def distribute(mask, segments):
        dist=[]
        for name,end in segments:
            a=joints[I[name]];b=joints[I[end]] if isinstance(end,str) else a+np.array(end)*height
            v=b-a; t=np.clip(((p-a)@v)/(v@v),0,1); d=np.linalg.norm(p-a-t[:,None]*v,axis=1)
            dist.append(d)
        d=np.stack(dist,axis=1); scores=np.exp(-(d-d.min(1,keepdims=True))/(height*.024));scores/=scores.sum(1,keepdims=True)
        for i,(name,_) in enumerate(segments):w[:,I[name]]+=mask*scores[:,i]
    for suffix,side in [('L',1),('R',-1)]:
        m=(x*side>=0).astype(float) if side==1 else (x*side>0).astype(float)
        distribute(arm*m,[(f'upperArm{suffix}',f'forearm{suffix}'),(f'forearm{suffix}',f'hand{suffix}'),(f'hand{suffix}',[side*.018,-.05,0])])
        distribute(leg*m*body,[(f'thigh{suffix}',f'shin{suffix}'),(f'shin{suffix}',f'foot{suffix}'),(f'foot{suffix}',[0,-.025,.075])])
    ids=np.argsort(-w,axis=1)[:,:4]; weights=np.take_along_axis(w,ids,1);weights/=weights.sum(1,keepdims=True)
    return ids.astype(np.uint16),weights.astype(np.float32)


def pose_angles(names, clip, t):
    a=np.zeros((len(names),3)); I={n:i for i,n in enumerate(names)}
    def setrot(n, x=0,y=0,z=0):a[I[n]]=[x,y,z]
    s=np.sin(2*np.pi*t); c=np.cos(2*np.pi*t)
    if clip=='idle':
        setrot('chest',x=.025*s,y=.035*s);setrot('head',y=-.045*s,z=.018*c)
        for suffix,side in [('L',1),('R',-1)]:setrot('upperArm'+suffix,z=side*.035*s)
    elif clip=='walk':
        setrot('pelvis',y=.07*s,z=.025*c);setrot('chest',y=-.13*s,z=-.025*c)
        for suffix,side in [('L',1),('R',-1)]:
            phase=side*s; knee=.12+.53*max(0,phase)
            setrot('thigh'+suffix,x=.44*phase);setrot('shin'+suffix,x=knee);setrot('foot'+suffix,x=-.35*knee-.08*phase)
            setrot('upperArm'+suffix,x=-.43*phase,z=side*-.08);setrot('forearm'+suffix,x=-.16-.14*max(0,-phase))
        setrot('head',y=.04*s)
    elif clip=='attack':
        # Anticipation, forward strike, recovery; smooth interpolation in time.
        keys=np.array([0,.20,.37,.55,.78,1]);
        def curve(vals):
            i=min(len(keys)-2,max(0,np.searchsorted(keys,t,side='right')-1));u=smoothstep(keys[i],keys[i+1],t);return vals[i]*(1-u)+vals[i+1]*u
        wind=curve([0,-1,1,.75,0,0]); lift=curve([0,.45,1,.65,0,0])
        setrot('pelvis',y=.23*wind);setrot('chest',y=.52*wind,x=.12*lift);setrot('head',y=-.20*wind)
        setrot('upperArmR',x=-1.45*lift,y=-.6*wind,z=.34*lift);setrot('forearmR',x=-.8*(1-abs(wind))*lift,z=.3*lift)
        setrot('upperArmL',x=.35*lift,z=-.18*lift);setrot('forearmL',x=-.45*lift)
        setrot('thighL',x=-.26*lift);setrot('shinL',x=.28*lift);setrot('thighR',x=.21*lift);setrot('shinR',x=.21*lift)
    return a


def matrices(joints,parents,quats,root_offset=0):
    local=np.broadcast_to(np.eye(4),(len(joints),4,4)).copy();local[:,:3,:3]=Rotation.from_quat(quats).as_matrix()
    for i,parent in enumerate(parents):local[i,:3,3]=joints[i] if parent<0 else joints[i]-joints[parent]
    local[0,1,3]+=root_offset
    world=local.copy()
    for i,parent in enumerate(parents):
        if parent>=0:world[i]=world[parent]@local[i]
    inv=np.broadcast_to(np.eye(4),(len(joints),4,4)).copy();inv[:,:3,3]=-joints
    return world@inv,world


def deform(p,n,ids,w,m):
    mp=m[ids]; pos=(np.einsum('nkij,nj->nki',mp[:,:,:3,:3],p)+mp[:,:,:3,3]);pos=(pos*w[:,:,None]).sum(1)
    norm=(np.einsum('nkij,nj->nki',mp[:,:,:3,:3],n)*w[:,:,None]).sum(1);norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-9)
    return pos,norm


def create_clips(names,parents,joints,data,ids,w,pose=pose_angles,durations=None):
    clips={}
    for name,duration in (durations if durations is not None else [('idle',2.4),('walk',.9),('attack',1.1)]):
        ts=np.linspace(0,duration,round(duration*30)+1,dtype=np.float32); qs=[];offsets=[];palettes=[];worlds=[]
        for t in ts:
            q=Rotation.from_euler('xyz',pose(names,name,float(t/duration))).as_quat();m,world=matrices(joints,parents,q)
            p,_=deform(data['positions'],data['normals'],ids,w,m); dy=-float(p[:,1].min());m,world=matrices(joints,parents,q,dy)
            qs.append(q);offsets.append(dy);palettes.append(m);worlds.append(world[:,:3,3])
        clips[name]=dict(times=ts,quats=np.array(qs,np.float32),offsets=np.array(offsets,np.float32),palettes=np.array(palettes,np.float32),worlds=np.array(worlds,np.float32))
    return clips


def export_glb(path,data,names,parents,joints,ids,weights,clips):
    buf=bytearray(); views=[];access=[]
    def append(raw,target=None):
        while len(buf)%4:buf.append(0)
        off=len(buf);buf.extend(raw);v=dict(buffer=0,byteOffset=off,byteLength=len(raw));
        if target:v['target']=target
        views.append(v);return len(views)-1
    def acc(arr,typ,component,target=None,bounds=False):
        v=append(arr.tobytes(),target);a=dict(bufferView=v,componentType=component,count=len(arr),type=typ)
        if bounds:a.update(min=np.min(arr,axis=0).reshape(-1).tolist(),max=np.max(arr,axis=0).reshape(-1).tolist())
        access.append(a);return len(access)-1
    pos=data['positions'].astype('<f4');norm=data['normals'].astype('<f4')
    attrs={'POSITION':acc(pos,'VEC3',5126,34962,True),'NORMAL':acc(norm,'VEC3',5126,34962),'COLOR_0':acc(data['linear_colors'].astype('<f4'),'VEC3',5126,34962),'JOINTS_0':acc(ids.astype('<u2'),'VEC4',5123,34962),'WEIGHTS_0':acc(weights.astype('<f4'),'VEC4',5126,34962)}
    index16=len(pos)<=65536
    ix=acc(data['faces'].reshape(-1).astype('<u2' if index16 else '<u4'),'SCALAR',5123 if index16 else 5125,34963)
    inv=np.broadcast_to(np.eye(4),(len(joints),4,4)).copy();inv[:,:3,3]=-joints
    ib=acc(inv.transpose(0,2,1).astype('<f4'),'MAT4',5126)
    nodes=[dict(name='Character',mesh=0,skin=0)]
    for i,n in enumerate(names):
        node=dict(name=n,translation=(joints[i] if parents[i]<0 else joints[i]-joints[parents[i]]).tolist()); children=[int(j+1) for j in np.where(parents==i)[0]]
        if children:node['children']=children
        nodes.append(node)
    anim=[]
    for name,clip in clips.items():
        ts=acc(clip['times'],'SCALAR',5126,bounds=True);sam=[];chan=[]
        for i in range(len(joints)):
            q=clip['quats'][:,i].copy()
            for k in range(1,len(q)):
                if q[k]@q[k-1]<0:q[k]*=-1
            out=acc(q,'VEC4',5126);sam.append(dict(input=ts,output=out,interpolation='LINEAR'));chan.append(dict(sampler=len(sam)-1,target=dict(node=i+1,path='rotation')))
        trans=np.tile(joints[0],(len(clip['times']),1));trans[:,1]+=clip['offsets'];trans[:,2]+=clip.get('forward',0);out=acc(trans.astype('<f4'),'VEC3',5126);sam.append(dict(input=ts,output=out,interpolation='LINEAR'));chan.append(dict(sampler=len(sam)-1,target=dict(node=1,path='translation')))
        anim.append(dict(name=name,samplers=sam,channels=chan))
    doc=dict(asset=dict(version='2.0',generator='Pixel pipeline v12'),scene=0,scenes=[dict(nodes=[0,1])],nodes=nodes,meshes=[dict(primitives=[dict(attributes=attrs,indices=ix,material=0)])],skins=[dict(joints=list(range(1,len(joints)+1)),skeleton=1,inverseBindMatrices=ib)],animations=anim,extensionsUsed=['KHR_materials_unlit'],materials=[dict(pbrMetallicRoughness=dict(baseColorFactor=[1,1,1,1],metallicFactor=0,roughnessFactor=1),extensions={'KHR_materials_unlit':{}})],bufferViews=views,accessors=access,buffers=[dict(byteLength=len(buf))])
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);buf.extend(b'\0'*((-len(buf))%4));path.write_bytes(struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(buf))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(buf),b'BIN\0')+buf)


