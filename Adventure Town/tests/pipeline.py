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
from convert_splat import read_ply, voxelize, surface_mesh, write_glb, skin_weights, clips_for_rig
from validate_asset import validate

root=Path(__file__).resolve().parents[1]
config=json.loads((root/'assets/next-adventurer/asset.json').read_text())['conversion']
config['height_voxels']=16
rig=json.loads((root/'assets/next-adventurer/rig.json').read_text())
relaxed={**rig, 'arm_rest_angle': .4}
for _,tracks in clips_for_rig(relaxed):
    for i,times,quaternions in tracks:
        name=relaxed['joints'][i]['name']
        assert np.allclose(np.linalg.norm(quaternions,axis=1),1)
        if name.startswith('UpperArm'):
            assert np.sign(quaternions[:,2]).tolist()==[1 if name.endswith('.L') else -1]*len(times)
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
    # Real TripoSplat alpha endpoints are infinite logits, valid in both encodings.
    for encoding in ['ascii','binary_little_endian']:
        endpoints=rows.copy();endpoints[0,6]=np.inf;endpoints[1,6]=-np.inf
        header='ply\nformat '+encoding+' 1.0\nelement vertex 12\n'+''.join('property float '+field+'\n' for field in fields)+'end_header\n'
        endpoint_path=temp/'endpoints.ply'
        if encoding=='ascii':endpoint_path.write_text(header+'\n'.join(' '.join(str(float(v)) for v in row) for row in endpoints)+'\n')
        else:endpoint_path.write_bytes(header.encode()+endpoints.tobytes())
        actual=read_ply(endpoint_path)
        assert np.isposinf(actual['opacity'][0]) and np.isneginf(actual['opacity'][1])
        filtered_config={**config,'voxel_filter_sigma':.5}
        occ,cols,r=voxelize(actual,filtered_config)
        assert occ.any() and np.isfinite(cols).all() and r['retained_splats']==11
    # Equal overlapping red/blue Gaussians blend, rather than select a winner.
    from convert_splat import SH_C0
    blend_rows=rows[:3].copy();blend_rows[:,1]=[0,0,1]
    blend_rows[:,3:6]=(np.array([[1,0,0],[0,0,1],[0,1,0]])-.5)/SH_C0
    blend_path=temp/'blend.ply';blend_path.write_bytes(header.replace('12','3').encode()+blend_rows.tobytes())
    occ,cols,_=voxelize(read_ply(blend_path),{**config,'color_levels':3,'voxel_filter_sigma':.5})
    bottom=cols[occ & (np.indices(occ.shape)[1] < occ.shape[1]//3)]
    assert len(bottom)>0 and (bottom[:,0]>0).all()
    assert np.allclose(bottom[:,0],bottom[:,2]) and np.allclose(bottom[:,1],0)
    # Several overlapping splats can support a wall even when each is subthreshold.
    union_config={**config,'density_mode':'alpha_union','density_threshold':.99,'color_weight_power':4}
    wall=data.copy();wall['opacity']=0
    for i in range(3):wall['scale_'+str(i)]=-.8
    union,union_colors,_=voxelize(wall,union_config)
    assert union.any() and np.isfinite(union_colors).all()
    import unittest
    for field,value in [('opacity',np.nan),('x',np.inf),('scale_0',np.inf)]:
        invalid=rows.copy();invalid[0,fields.index(field)]=value
        invalid_path=temp/'invalid.ply'
        invalid_path.write_bytes(header.replace('ascii','binary_little_endian').encode()+invalid.tobytes())
        with unittest.TestCase().assertRaisesRegex(ValueError,'Non-finite Gaussian properties'):
            read_ply(invalid_path)
    # Verify that a newly exported Uint32-index GLB plays through the same runtime.
    subprocess.run(['node',str(root/'tests/runtime.mjs'),str(output)],check=True)
    # Static town assets retain configured game scale and have no invented rig.
    from convert_splat import build
    asset=temp/'static-asset';asset.mkdir()
    import shutil
    shutil.copy(path,asset/'input.ply')
    (asset/'asset.json').write_text(json.dumps({'id':'static-fixture','kind':'static','splat':'input.ply','world_height':1.4,'conversion':config}))
    built=temp/'static-build';build(asset,built);validate(built/'asset.glb')
    from validate_asset import read_glb
    document,accessor=read_glb(built/'asset.glb')
    assert 'skins' not in document and 'animations' not in document
    xyz=accessor(document['meshes'][0]['primitives'][0]['attributes']['POSITION'])
    assert np.isclose(xyz[:,1].min(),0) and np.isclose(xyz[:,1].max(),1.4)
    (root/'dist/static-fixture.glb').write_bytes((built/'asset.glb').read_bytes())
    # A promoted static GLB is embedded by the real offline build and rendered
    # through its actual runtime. Temporary project copy leaves the catalog alone.
    isolated=temp/'offline-project';isolated.mkdir()
    shutil.copytree(root/'game',isolated/'game')
    (isolated/'tools').mkdir();shutil.copy(root/'tools/build.mjs',isolated/'tools/build.mjs')
    (isolated/'tests').mkdir();shutil.copy(root/'tests/runtime.mjs',isolated/'tests/runtime.mjs')
    for filename in ['index.html','package.json']:shutil.copy(root/filename,isolated/filename)
    character=isolated/'assets/emberbrook-adventurer/runtime';character.mkdir(parents=True)
    shutil.copy(root/'assets/emberbrook-adventurer/runtime/asset.glb',character/'asset.glb')
    (isolated/'runtime').mkdir();shutil.copy(built/'asset.glb',isolated/'runtime/fixture.glb')
    catalog=isolated/'game/town-assets.js'
    catalog.write_text('export const townAssets = [{id: "produce-shelf", runtime: "runtime/fixture.glb"}];\n')
    (isolated/'game/town-characters.js').write_text('export const townCharacters = [];\n')
    subprocess.run(['node',str(isolated/'tools/build.mjs')],check=True)
    subprocess.run(['node',str(isolated/'tests/runtime.mjs')],check=True)
    # A single occupied cube has six exposed faces, outward winding, and no internals.
    p,n,c,idx=surface_mesh(np.ones((1,1,1),bool),np.ones((1,1,1,3)))
    assert len(p)==24 and len(idx)==36
    # Two adjacent cells omit their shared face.
    p,n,c,idx=surface_mesh(np.ones((2,1,1),bool),np.ones((2,1,1,3)))
    assert len(idx)==60
validate(root/'assets/emberbrook-adventurer/runtime/asset.glb')
print('Pipeline checks passed: PLY encodings, deterministic export, skin weights, bind pose, clips, surface winding, hidden faces, imported GLB.')
