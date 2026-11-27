"""Synthetic 3DGS fixture exercises both encodings and the real conversion/export.
No synthetic output is promoted as game art or evidence of TripoSplat quality.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from convert_splat import read_ply, voxelize, surface_mesh, write_glb, skin_weights
from validate_asset import validate

root=Path(__file__).resolve().parents[1]
config=json.loads((root/'assets/next-adventurer/asset.json').read_text())['conversion']
config['height_voxels']=16
rig=json.loads((root/'assets/next-adventurer/rig.json').read_text())
fields=['x','y','z','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3']
rows=np.array([[0,y,0,.4,.1,-.3,4,-2.7,-2.7,-2.7,1,0,0,0] for y in np.linspace(0,1,12)],dtype='<f4')
with tempfile.TemporaryDirectory() as temp:
    temp=Path(temp)
    for encoding in ['ascii','binary_little_endian']:
        header='ply\nformat '+encoding+' 1.0\nelement vertex 12\n'+''.join('property float '+field+'\n' for field in fields)+'end_header\n'
        path=temp/(encoding+'.ply')
        if encoding=='ascii':path.write_text(header+'\n'.join(' '.join(str(float(v)) for v in row) for row in rows)+'\n')
        else:path.write_bytes(header.encode()+rows.tobytes())
        data=read_ply(path)
        assert len(data)==12 and np.allclose(data['y'],rows[:,1])
        occupied,colors,report=voxelize(data,config)
        p,n,c,idx=surface_mesh(occupied,colors)
        assert occupied.any() and np.isclose(p[:,1].min(),0) and np.isclose(p[:,1].max(),1)
        js,ws=skin_weights(p,rig)
        assert (ws.sum(axis=1)==255).all()
        output=temp/(encoding+'.glb')
        write_glb(output,p,n,c,idx,rig)
        validate(output)
        # Same inputs produce the exact same GLB bytes.
        again=temp/'again.glb';write_glb(again,p,n,c,idx,rig)
        assert again.read_bytes()==output.read_bytes()
    # Verify that a newly exported Uint32-index GLB plays through the same runtime.
    subprocess.run(['node',str(root/'tests/runtime.mjs'),str(output)],check=True)
    # A single occupied cube has six exposed faces, outward winding, and no internals.
    p,n,c,idx=surface_mesh(np.ones((1,1,1),bool),np.ones((1,1,1,3)))
    assert len(p)==24 and len(idx)==36
    # Two adjacent cells omit their shared face.
    p,n,c,idx=surface_mesh(np.ones((2,1,1),bool),np.ones((2,1,1,3)))
    assert len(idx)==60
validate(root/'assets/emberbrook-adventurer/runtime/asset.glb')
print('Pipeline checks passed: PLY encodings, deterministic export, skin weights, bind pose, clips, surface winding, hidden faces, imported GLB.')
