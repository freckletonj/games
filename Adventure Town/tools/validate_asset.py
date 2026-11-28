"""Audit our narrow runtime GLB contract. This does not approve artistic quality."""
import argparse
import json
import struct
from pathlib import Path
import numpy as np


def read_glb(path):
    raw=Path(path).read_bytes()
    magic,version,length=struct.unpack_from('<III',raw)
    assert (magic,version,length)==(0x46546c67,2,len(raw)), 'GLB header'
    json_size,json_type=struct.unpack_from('<II',raw,12)
    assert json_type==0x4e4f534a
    doc=json.loads(raw[20:20+json_size])
    binary_size,binary_type=struct.unpack_from('<II',raw,20+json_size)
    assert binary_type==0x004e4942 and 28+json_size+binary_size==len(raw)
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        assert not v.get('byteStride') and not a.get('sparse'), 'packed accessors only'
        dims={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        dtype={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
        start=28+json_size+v.get('byteOffset',0)+a.get('byteOffset',0)
        array=np.frombuffer(raw,dtype=dtype,count=a['count']*dims,offset=start).reshape(a['count'],dims)
        assert np.isfinite(array).all(), 'non-finite accessor'
        return array
    return doc,accessor


def validate(path):
    doc,a=read_glb(path)
    assert len(doc['meshes'])==1 and len(doc['meshes'][0]['primitives'])==1
    prim=doc['meshes'][0]['primitives'][0];attr=prim['attributes']
    p=a(attr['POSITION']);n=a(attr['NORMAL']);c=a(attr['COLOR_0']);idx=a(prim['indices']).ravel()
    assert p.shape==n.shape and c.shape==(len(p),4)
    assert idx.max()<len(p) and len(idx)%3==0
    assert np.allclose(np.linalg.norm(n,axis=1),1,atol=1e-5)
    triangles=p[idx.reshape(-1,3)]
    face=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
    assert (np.einsum('ij,ij->i',face,n[idx[::3]])>0).all(), 'winding or degenerate triangles'
    assert doc['accessors'][attr['COLOR_0']]['componentType']==5121 and doc['accessors'][attr['COLOR_0']]['normalized']
    if 'skins' not in doc:
        assert len(doc['nodes'])==1 and doc['nodes'][0]['mesh']==0
        assert not any(key in doc['nodes'][0] for key in ['matrix','translation','rotation','scale']), 'static geometry must be baked into vertex positions'
        assert 'animations' not in doc, 'static assets have no invented animation'
    clips=[]
    if 'skins' in doc:
        joints=a(attr['JOINTS_0']);weights=a(attr['WEIGHTS_0'])
        assert doc['accessors'][attr['COLOR_0']]['componentType']==5121 and doc['accessors'][attr['COLOR_0']]['normalized']
        assert doc['accessors'][attr['WEIGHTS_0']]['componentType']==5121 and doc['accessors'][attr['WEIGHTS_0']]['normalized']
        skin=doc['skins'][0];count=len(skin['joints'])
        assert skin['joints']==list(range(count)) and skin['skeleton']==0
        assert joints.shape==weights.shape==(len(p),4) and joints.max()<count
        assert (weights.sum(axis=1)==255).all(), 'weights must sum exactly to 255'
        bind=a(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
        parents=np.full(count,-1)
        for i,node in enumerate(doc['nodes'][:count]):
            for child in node.get('children',[]):
                assert i<child<count
                parents[child]=i
        global_matrices=[]
        for i,node in enumerate(doc['nodes'][:count]):
            local=np.eye(4);local[:3,3]=node['translation']
            transform=local if parents[i]<0 else global_matrices[parents[i]]@local
            global_matrices.append(transform)
            assert np.allclose(transform@bind[i],np.eye(4),atol=1e-5), 'rest-pose bind mismatch'
        for clip in doc['animations']:
            clips.append(clip['name'])
            for channel in clip['channels']:
                assert channel['target']['node']<count
                sampler=clip['samplers'][channel['sampler']]
                times=a(sampler['input']).ravel();values=a(sampler['output'])
                assert sampler['interpolation']=='LINEAR' and len(times)==len(values)>1
                assert times[0]==0 and (np.diff(times)>0).all()
                assert np.allclose(np.diff(times),np.diff(times)[0],atol=1e-5), 'runtime requires uniform keys'
                if channel['target']['path']=='rotation':
                    assert np.allclose(np.linalg.norm(values,axis=1),1,atol=1e-5)
                else: assert channel['target']['path']=='translation'
        assert {'Idle','Walk','Run','Jump'} <= set(clips), 'core movement clip contract'
        assert len(clips)==len(set(clips)), 'unique clip names'
    report={'vertices':len(p),'triangles':len(idx)//3,'clips':clips,'status':'structural-checks-passed'}
    print(json.dumps(report))
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('glb',type=Path)
    validate(parser.parse_args().glb)
