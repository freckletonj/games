"""Check exported glTF data against offline reconstruction and animation."""
import argparse,json,struct
from pathlib import Path
import numpy as np
from rig import matrices,deform


def check(path):
    d=dict(np.load(path/'rig.npz'));raw=(path/'character_animated.glb').read_bytes();magic,version,total=struct.unpack_from('<4sII',raw);assert (magic,version,total)==(b'glTF',2,len(raw));size,kind=struct.unpack_from('<I4s',raw,12);assert kind==b'JSON';doc=json.loads(raw[20:20+size]);bs,bk=struct.unpack_from('<I4s',raw,20+size);assert bk==b'BIN\0';buf=raw[28+size:];assert len(buf)==bs
    def get(i):
        a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];dt={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']];return np.frombuffer(buf,dtype=dt,count=a['count']*components,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,components)
    mesh=doc['meshes'][0]['primitives'][0];a=mesh['attributes'];p=get(a['POSITION']);n=get(a['NORMAL']);ids=get(a['JOINTS_0']);w=get(a['WEIGHTS_0']);assert np.allclose(get(a['COLOR_0']),d['linear_colors']);assert np.allclose(p,d['positions']);assert np.array_equal(get(mesh['indices']).reshape(-1,3),d['faces']);assert np.array_equal(ids,d['ids']);assert np.allclose(w,d['weights']);assert np.allclose(w.sum(1),1);assert ids.max()<len(d['joints']);assert np.isfinite(p).all()
    bind=get(doc['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);assert np.allclose(bind[:,:3,3],-d['joints']);assert doc['skins'][0]['joints']==list(range(1,len(bind)+1))
    maxdiff=0;floor=[]
    for clip in doc['animations']:
        name=clip['name'];rot=[];translations=None
        for channel in clip['channels']:
            sampler=clip['samplers'][channel['sampler']];times=get(sampler['input']).ravel();assert np.all(np.diff(times)>0);assert np.allclose(times,d[f'{name}_times']);values=get(sampler['output']);assert np.isfinite(values).all()
            if channel['target']['path']=='rotation':rot.append(values)
            else:translations=values
        for i in range(len(times)):
            m,_=matrices(d['joints'],d['parents'],np.array(rot)[:,i],translations[i,1]-d['joints'][0,1]);m[:,:3,3]+=np.array([0,0,translations[i,2]-d['joints'][0,2]]);maxdiff=max(maxdiff,float(np.max(abs(m-d[f'{name}_palettes'][i]))));pos,_=deform(p,n,ids,w,m);floor.append(float(pos[:,1].min()))
    assert maxdiff<1e-5
    return dict(palette_max_error=maxdiff,minimum_floor_y=min(floor),maximum_floor_y=max(floor),animated_clips=len(doc['animations']),all_indices_in_range=bool(get(mesh['indices']).max()<len(p)))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('build',type=Path);args=parser.parse_args();print(json.dumps(check(args.build),indent=2))
