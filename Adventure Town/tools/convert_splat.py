"""Build a voxel-surface GLB from an explicitly configured, standard 3DGS PLY.

This is a first humanoid conversion recipe, not automatic anatomy recovery.
Only NumPy is required. The original PLY and source image are never modified.
"""
import argparse
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

SH_C0 = 0.28209479177387814
PLY_TYPES = {"float": "<f4", "float32": "<f4", "double": "<f8", "float64": "<f8",
             "uchar": "u1", "uint8": "u1", "char": "i1", "int8": "i1",
             "ushort": "<u2", "uint16": "<u2", "short": "<i2", "int16": "<i2",
             "uint": "<u4", "uint32": "<u4", "int": "<i4", "int32": "<i4"}


def read_ply(path):
    """Read scalar vertex properties; require the standard uncompressed 3DGS schema."""
    with Path(path).open("rb") as stream:
        if stream.readline().strip() != b"ply":
            raise ValueError("Expected PLY header, not a Git LFS pointer or compressed splat")
        properties, count, element, format_name = [], None, None, None
        while True:
            line = stream.readline()
            if not line:
                raise ValueError("Missing end_header")
            words = line.decode("ascii").split()
            if not words or words[0] in ("comment", "obj_info"):
                continue
            if words[0] == "end_header":
                break
            if words[0] == "format":
                format_name = words[1]
            elif words[0] == "element":
                element = words[1]
                if element == "vertex":
                    if count is not None:
                        raise ValueError("Expected one vertex element")
                    count = int(words[2])
                elif int(words[2]) != 0:
                    raise ValueError("Expected a vertex-only Gaussian PLY")
            elif words[0] == "property" and element == "vertex":
                if words[1] == "list" or words[1] not in PLY_TYPES:
                    raise ValueError("Expected scalar PLY vertex properties")
                properties.append((words[2], PLY_TYPES[words[1]]))
        if not count or not properties:
            raise ValueError("PLY has no vertices")
        dtype = np.dtype(properties)
        if format_name == "binary_little_endian":
            data = np.frombuffer(stream.read(count * dtype.itemsize), dtype=dtype).copy()
        elif format_name == "ascii":
            rows = np.loadtxt(stream, max_rows=count, ndmin=2)
            if rows.shape != (count, len(properties)):
                raise ValueError("PLY vertex row count or property count does not match header")
            data = np.empty(count, dtype=dtype)
            for index, (name, _) in enumerate(properties):
                data[name] = rows[:, index]
        else:
            raise ValueError("Use ascii or binary_little_endian PLY")
    if len(data) != count:
        raise ValueError("Truncated PLY vertices")
    required = ["x", "y", "z", "opacity"] + [f"{prefix}_{i}" for prefix, n in (("f_dc", 3), ("scale", 3), ("rot", 4)) for i in range(n)]
    if not set(required).issubset(data.dtype.names):
        raise ValueError("Expected standard 3DGS properties: " + ", ".join(required))
    # A 3DGS opacity is a logit: +/-infinity represents alpha 1/0, not bad geometry.
    if np.isnan(data["opacity"]).any() or not all(np.isfinite(data[name]).all() for name in required if name != "opacity"):
        raise ValueError("Non-finite Gaussian properties")
    return data


def rotation_matrix(q):
    """Quaternion order for the source PLY is w,x,y,z."""
    q = np.asarray(q, dtype=float)
    lengths = np.linalg.norm(q, axis=-1, keepdims=True)
    if np.any(lengths == 0):
        raise ValueError("Zero-length Gaussian quaternion")
    w, x, y, z = (q / lengths).T
    return np.stack([1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w),
                     2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w),
                     2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)], axis=-1).reshape(-1, 3, 3)


def voxelize(data, config):
    stack = lambda prefix, n: np.column_stack([data[f"{prefix}_{i}"] for i in range(n)])
    centers = np.column_stack([data[name] for name in ("x", "y", "z")]).astype(float)
    alpha = 1 / (1 + np.exp(-np.clip(data["opacity"].astype(float), -60, 60)))
    keep = alpha >= config["opacity_min"]
    if config["crop"] is not None:
        bounds = np.array(config["crop"], dtype=float)
        keep &= ((centers >= bounds[0]) & (centers <= bounds[1])).all(axis=1)
    if keep.sum() < 2:
        raise ValueError("Not enough splats after opacity/crop filtering")
    axes = np.array(config["source_to_game"], dtype=float)
    if axes.shape != (3, 3) or not np.allclose(axes @ axes.T, np.eye(3), atol=1e-6):
        raise ValueError("source_to_game must be a 3x3 orthonormal rotation/reflection")
    centers = centers[keep] @ axes.T
    scales = np.exp(stack("scale", 3)[keep].astype(float))
    rotations = axes @ rotation_matrix(stack("rot", 4)[keep])
    covariance = (rotations * scales[:, None, :]**2) @ rotations.transpose(0, 2, 1)
    rgb = np.clip(.5 + SH_C0 * stack("f_dc", 3)[keep], 0, 1)
    alpha = alpha[keep]
    low, high = centers.min(axis=0), centers.max(axis=0)
    if high[1] == low[1]:
        raise ValueError("Splat has no vertical extent; inspect source_to_game")
    factor = config["height_voxels"] / (high[1] - low[1])
    centers = (centers - low) * factor
    covariance *= factor**2
    # Low-pass the Gaussian field before sampling a coarser voxel grid.
    covariance += np.eye(3)[None,:,:] * config.get('voxel_filter_sigma', 0.0)**2
    extent = config["sigma_extent"] * np.sqrt(np.diagonal(covariance, axis1=1, axis2=2))
    origin = np.floor((centers-extent).min(axis=0)).astype(int)
    shape = np.ceil((centers+extent).max(axis=0) - origin).astype(int) + 1
    if np.prod(shape.astype(float)) > config["max_grid_cells"]:
        raise ValueError(f"Grid {shape.tolist()} exceeds max_grid_cells; inspect crop/scales or reduce resolution")
    density = np.zeros(tuple(shape), dtype=np.float32)
    colors = np.zeros((*shape, 3), dtype=np.float32)
    color_weight = np.zeros(tuple(shape), dtype=np.float32)
    for center, cov, radius, opacity, color in zip(centers-origin, covariance, extent, alpha, rgb):
        lo = np.maximum(0, np.floor(center-radius).astype(int))
        hi = np.minimum(shape, np.ceil(center+radius).astype(int)+1)
        grid = np.stack(np.meshgrid(*(np.arange(a,b)+.5 for a,b in zip(lo,hi)), indexing="ij"), axis=-1)
        delta = grid-center
        distance = np.einsum("...i,ij,...j->...", delta, np.linalg.inv(cov), delta)
        values = opacity*np.exp(-.5*distance)
        values[distance > config["sigma_extent"]**2] = 0
        region = tuple(slice(a,b) for a,b in zip(lo,hi))
        np.maximum(density[region], values, out=density[region])
        colors[region] += values[...,None] * color
        color_weight[region] += values
    occupied = density >= config["density_threshold"]
    if not occupied.any():
        raise ValueError("No occupied voxels; inspect source and thresholds")
    supported = color_weight > 0
    colors[supported] /= color_weight[supported,None]
    # Explicit color quantization; no learned model or view-dependent shading at runtime.
    levels = config["color_levels"]
    colors = np.round(colors*(levels-1))/(levels-1)
    colors = np.where(colors <= .04045, colors / 12.92, ((colors + .055) / 1.055)**2.4)
    return occupied, colors, {"input_splats": len(data), "retained_splats": int(keep.sum()), "grid": shape.tolist(), "occupied_voxels": int(occupied.sum())}


FACES = [([1,0,0], [[1,0,0],[1,1,0],[1,1,1],[1,0,1]]),
         ([-1,0,0], [[0,0,1],[0,1,1],[0,1,0],[0,0,0]]),
         ([0,1,0], [[0,1,1],[1,1,1],[1,1,0],[0,1,0]]),
         ([0,-1,0], [[0,0,0],[1,0,0],[1,0,1],[0,0,1]]),
         ([0,0,1], [[1,0,1],[1,1,1],[0,1,1],[0,0,1]]),
         ([0,0,-1], [[0,0,0],[0,1,0],[1,1,0],[1,0,0]])]


def surface_mesh(occupied, color_grid):
    positions, normals, colors, indices = [], [], [], []
    for normal, corners in FACES:
        neighbor = np.zeros_like(occupied)
        src, dst = [], []
        for d in normal:
            src.append(slice(1,None) if d == 1 else slice(None,-1) if d == -1 else slice(None))
            dst.append(slice(None,-1) if d == 1 else slice(1,None) if d == -1 else slice(None))
        neighbor[tuple(dst)] = occupied[tuple(src)]
        cells = np.argwhere(occupied & ~neighbor)
        positions.append((cells[:,None,:] + np.array(corners)).reshape(-1,3))
        normals.append(np.tile(normal,(len(cells)*4,1)))
        colors.append(np.repeat(color_grid[tuple(cells.T)],4,axis=0))
    # Faces from each direction have independent flat normals and colors.
    p = np.concatenate(positions).astype(float)
    n = np.concatenate(normals).astype(float)
    c = np.concatenate(colors).astype(float)
    lo, hi = p.min(axis=0), p.max(axis=0)
    offset = np.array([(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2])
    p = (p-offset)/(hi[1]-lo[1])
    indices = (np.arange(len(p)//4)[:,None]*4 + [0,1,2,0,2,3]).reshape(-1)
    return p, n, c, indices


def skin_weights(positions, rig):
    """Manually fitted joint segments plus explicit anatomical regions."""
    joints = rig["joints"]
    points = np.array([j["position"] for j in joints])
    parents = np.array([j["parent"] for j in joints])
    ends = points.copy()
    # Segment directions belong to the joint being rotated.
    for i, joint in enumerate(joints):
        children = np.flatnonzero(parents == i)
        if len(children):
            ends[i] = points[children[0]]
        else:
            ends[i] = points[i] + .4*(points[i]-points[parents[i]])
    delta = ends-points
    t = np.clip(np.einsum('vji,ji->vj',positions[:,None,:]-points,delta)/np.maximum((delta**2).sum(axis=1),1e-10),0,1)
    distance = np.linalg.norm(positions[:,None,:]-(points+t[...,None]*delta),axis=2)
    allowed = np.zeros_like(distance,dtype=bool)
    gates=rig["regions"]
    for mask, names in [
        (positions[:,1]>=gates["head_y"], ["Spine","Head"]),
        (positions[:,1]<gates["leg_y"], ["Pelvis","Thigh.L","Shin.L","Foot.L","Thigh.R","Shin.R","Foot.R"]),
        ((positions[:,1]>=gates["leg_y"]) & (positions[:,1]<gates["head_y"]), ["Pelvis","Spine"]),
    ]:
        for name in names:
            allowed[mask,next(i for i,j in enumerate(joints) if j["name"]==name)] = True
    arms=(np.abs(positions[:,0])>=gates["arm_x"]) & (positions[:,1]>=gates["arm_bottom"]) & (positions[:,1]<=gates["head_y"])
    for side, sign in [("L",-1),("R",1)]:
        mask=arms & (positions[:,0]*sign>0)
        allowed[mask]=False
        for name in [f"UpperArm.{side}",f"Forearm.{side}",f"Hand.{side}"]:
            allowed[mask,next(i for i,j in enumerate(joints) if j["name"]==name)]=True
        # Restrict leg weights to the same side so the stride doesn't pull both boots.
        for name in [f"Thigh.{side}",f"Shin.{side}",f"Foot.{side}"]:
            allowed[positions[:,0]*sign<0,next(i for i,j in enumerate(joints) if j["name"]==name)]=False
    distance[~allowed]=np.inf
    nearest=np.argsort(distance,axis=1)[:,:4]
    selected=np.take_along_axis(distance,nearest,axis=1)
    raw=np.exp(-selected**2/(2*rig["weight_radius"]**2))
    # Normalize in floating point before exact byte quantization (sum is 255).
    if np.any(raw.sum(axis=1)==0):
        raise ValueError("Unweighted vertices; refit rig or increase weight_radius")
    raw=raw/raw.sum(axis=1,keepdims=True)*255
    weights=np.floor(raw).astype(np.uint8)
    for row, missing in enumerate(255-weights.sum(axis=1)):
        order=np.argsort(-(raw[row]-weights[row]))
        weights[row,order[:int(missing)]]+=1
    return nearest.astype(np.uint8), weights


def clips_for_rig(rig):
    """In-place procedural test motion. The game owns all world translation."""
    result=[]
    names={j["name"]:i for i,j in enumerate(rig["joints"])}
    for name,duration,amplitude in [("Idle",2,0),("Walk",1,.55),("Run",.65,.9),("Jump",.8,0)]:
        times=np.linspace(0,duration,25)
        tracks=[]
        for joint in rig["joints"]:
            label=joint["name"]
            angle=np.zeros(len(times))
            phase=times/duration*2*np.pi
            side=1 if label.endswith('.L') else -1
            if name in ("Walk","Run"):
                if label.startswith('Thigh'): angle=side*amplitude*np.sin(phase)
                if label.startswith('Shin'): angle=np.maximum(0,-side*np.sin(phase))*amplitude
                if label.startswith('UpperArm'): angle=-side*amplitude*.65*np.sin(phase)
                if label.startswith('Forearm'): angle=np.full(len(times),-.18)
            elif name=='Jump':
                tuck=np.sin(np.pi*times/duration)**2
                if label.startswith('Thigh'): angle=-.6*tuck
                if label.startswith('Shin'): angle=1.0*tuck
                if label.startswith('UpperArm'): angle=-.9*tuck
            elif label=='Spine': angle=.015*np.sin(phase)
            quat=np.column_stack([np.sin(angle/2),np.zeros((len(times),2)),np.cos(angle/2)])
            tracks.append((names[label],times,quat))
        result.append((name,tracks))
    return result


def write_glb(path, positions, normals, colors, indices, rig=None):
    """Export the narrow glTF 2.0 subset used by the browser game."""
    binary=bytearray(); views=[]; accessors=[]
    def add(values, component, kind, normalized=False, bounds=False):
        dtype={5126:'<f4',5121:'u1',5125:'<u4'}[component]
        array=np.asarray(values,dtype=dtype)
        binary.extend(b'\0'*(-len(binary)%4))
        view={"buffer":0,"byteOffset":len(binary),"byteLength":array.nbytes}
        views.append(view);binary.extend(array.tobytes())
        accessor={"bufferView":len(views)-1,"componentType":component,"count":len(array),"type":kind}
        if normalized: accessor["normalized"]=True
        if bounds:
            accessor["min"]=array.min(axis=0).tolist();accessor["max"]=array.max(axis=0).tolist()
        accessors.append(accessor);return len(accessors)-1
    attrs={"POSITION":add(positions,5126,"VEC3",bounds=True),"NORMAL":add(normals,5126,"VEC3"),
           "COLOR_0":add(np.column_stack([np.rint(colors*255),np.full(len(colors),255)]),5121,"VEC4",normalized=True)}
    nodes=[];skin=[];animations=[]
    if rig:
        js,ws=skin_weights(positions,rig)
        attrs["JOINTS_0"]=add(js,5121,"VEC4");attrs["WEIGHTS_0"]=add(ws,5121,"VEC4",normalized=True)
        points=np.array([j["position"] for j in rig["joints"]])
        inverse=np.tile(np.eye(4),(len(points),1,1));inverse[:,:3,3]=-points
        bind=add(inverse.transpose(0,2,1).reshape(-1,16),5126,"MAT4")
        for i,joint in enumerate(rig["joints"]):
            parent=joint["parent"]
            if parent>=i: raise ValueError("Rig parents must precede children")
            node={"name":joint["name"],"translation":(points[i]-(points[parent] if parent>=0 else 0)).tolist()}
            children=[k for k,j in enumerate(rig["joints"]) if j["parent"]==i]
            if children: node["children"]=children
            nodes.append(node)
        skin=[{"joints":list(range(len(nodes))),"skeleton":0,"inverseBindMatrices":bind}]
        for name,tracks in clips_for_rig(rig):
            samplers=[];channels=[]
            times_accessor=add(tracks[0][1],5126,"SCALAR",bounds=True)
            # glTF SCALAR min/max must be arrays.
            accessors[times_accessor]["min"]=[0.0];accessors[times_accessor]["max"]=[float(tracks[0][1][-1])]
            for joint,times,quaternions in tracks:
                samplers.append({"input":times_accessor,"output":add(quaternions,5126,"VEC4"),"interpolation":"LINEAR"})
                channels.append({"sampler":len(samplers)-1,"target":{"node":joint,"path":"rotation"}})
            animations.append({"name":name,"samplers":samplers,"channels":channels})
    mesh_node={"name":"Voxel asset","mesh":0}
    if rig: mesh_node["skin"]=0
    nodes.append(mesh_node)
    prim={"attributes":attrs,"indices":add(indices,5125,"SCALAR"),"material":0}
    doc={"asset":{"version":"2.0","generator":"Adventure Town splat-to-voxel v1"},"scene":0,
         "scenes":[{"nodes":[0,len(nodes)-1] if rig else [0]}],"nodes":nodes,
         "meshes":[{"primitives":[prim]}],"materials":[{"pbrMetallicRoughness":{"metallicFactor":0,"roughnessFactor":1}}],
         "buffers":[{"byteLength":len(binary)}],"bufferViews":views,"accessors":accessors}
    if rig: doc["skins"]=skin;doc["animations"]=animations
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
    binary.extend(b'\0'*(-len(binary)%4))
    payload=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))
    payload+=struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    Path(path).write_bytes(payload)


def build(asset, output):
    asset=Path(asset);output=Path(output)
    config=json.loads((asset/'asset.json').read_text())
    source=asset/config['splat']
    data=read_ply(source)
    occupied,colors,report=voxelize(data,config['conversion'])
    positions,normals,colors,indices=surface_mesh(occupied,colors)
    if config['kind']=='static':
        positions *= config['world_height']
    output.mkdir(parents=True,exist_ok=False)
    rig=json.loads((asset/config['rig']).read_text()) if config['kind']=='humanoid' else None
    write_glb(output/'asset.glb',positions,normals,colors,indices,rig)
    np.savez_compressed(output/'voxels.npz',occupied=occupied)
    report.update({"asset":config['id'],"source_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),
                   "config_sha256":hashlib.sha256((asset/'asset.json').read_bytes()).hexdigest(),
                   "rig_sha256":hashlib.sha256((asset/config['rig']).read_bytes()).hexdigest() if rig else None,
                   "vertices":len(positions),"triangles":len(indices)//3,"clips":[c[0] for c in clips_for_rig(rig)] if rig else [],
                   "status":"candidate-needs-visual-review","method":"max-gaussian-density; exposed voxel faces; fitted segment weights; procedural motion"})
    report['kind']=config['kind']
    report['bounds']={'min':positions.min(axis=0).tolist(),'max':positions.max(axis=0).tolist()}
    if rig is None:
        report['method']='max-gaussian-density; exposed voxel faces; density-weighted DC colors; world-space scale'
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('asset',type=Path)
    parser.add_argument('--out',required=True,type=Path,help='New candidate directory (must not exist)')
    args=parser.parse_args()
    build(args.asset,args.out)
