"""Fitted segment weights and declared motion for quadrupeds and birds.

Joint endpoints and soft influence bounds are authored against each actual mesh.
This does not infer anatomy or fit a universal animal skeleton.
"""
import numpy as np


def packed_weights(positions, raw, rig):
    if np.any(raw.sum(axis=1) == 0):
        raise ValueError('Unweighted vertices; refit the influence bounds')
    raw = raw / raw.sum(axis=1, keepdims=True)
    # Diffuse fitted influences over neighboring voxel corners, joining weights
    # across connected sleeves, hips and wing roots before keeping four joints.
    iterations = rig.get('weight_smoothing', 0)
    if iterations:
        step = np.median(np.diff(np.unique(positions[:, 1])))
        cells = np.rint((positions-positions.min(axis=0))/step).astype(int)
        cells, inverse = np.unique(cells, axis=0, return_inverse=True)
        values = np.zeros((len(cells), raw.shape[1]))
        np.add.at(values, inverse, raw)
        values /= np.bincount(inverse)[:, None]
        lookup = np.full(tuple(cells.max(axis=0)+3), -1, dtype=int)
        cells += 1
        lookup[tuple(cells.T)] = np.arange(len(cells))
        neighbors = np.stack([lookup[tuple((cells+direction).T)] for direction in
                              [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]], axis=1)
        present = neighbors >= 0
        for iteration in range(iterations):
            values = (values + (values[np.maximum(neighbors, 0)] * present[..., None]).sum(axis=1)) / (1+present.sum(axis=1))[:, None]
        raw = values[inverse]
        if 'family' not in rig:
            for index, joint in enumerate(rig['joints']):
                if joint['name'].startswith(('Thigh','Shin','Foot')):
                    sign = -1 if joint['name'].endswith('.L') else 1
                    raw[(positions[:,1]<rig['regions']['leg_y']) & (positions[:,0]*sign<0), index] = 0
    nearest = np.argsort(-raw, axis=1)[:, :4]
    raw = np.take_along_axis(raw, nearest, axis=1)
    raw = raw / raw.sum(axis=1, keepdims=True) * 255
    weights = np.floor(raw).astype(np.uint8)
    for row, missing in enumerate(255 - weights.sum(axis=1)):
        order = np.argsort(-(raw[row] - weights[row]))
        weights[row, order[:int(missing)]] += 1
    return nearest.astype(np.uint8), weights


def creature_weights(positions, rig):
    points = np.array([joint['position'] for joint in rig['joints']])
    tips = np.array([joint['tip'] for joint in rig['joints']])
    delta = tips - points
    t = np.clip(np.einsum('vji,ji->vj', positions[:, None, :] - points, delta) /
                np.maximum((delta ** 2).sum(axis=1), 1e-10), 0, 1)
    distance = np.linalg.norm(positions[:, None, :] - (points + t[..., None] * delta), axis=2)
    gates = []
    for joint in rig['joints']:
        low, high = np.array(joint['bounds'])
        blend = joint['blend']
        gates.append(np.minimum(np.clip((positions-low)/blend, 0, 1),
                                np.clip((high-positions)/blend, 0, 1)).prod(axis=1))
    raw = np.exp(-distance ** 2 / (2 * rig['weight_radius'] ** 2)) * np.array(gates).T
    return packed_weights(positions, raw, rig)


def creature_clips(rig):
    names = {joint['name']: i for i, joint in enumerate(rig['joints'])}
    result = []
    for name, clip in rig['clips'].items():
        times = np.linspace(0, clip['duration'], 25)
        tracks = []
        for joint in rig['joints']:
            motion = clip['joints'].get(joint['name'])
            quat = np.tile([0., 0., 0., 1.], (len(times), 1))
            if motion:
                phase = times / clip['duration']
                wave = np.sin(np.pi * phase) ** 2 if motion['wave'] == 'pulse' else np.sin(2 * np.pi * phase + motion['phase'])
                angle = motion['offset'] + motion['amplitude'] * wave
                axis = np.array(motion['axis'], dtype=float)
                axis /= np.linalg.norm(axis)
                quat[:, :3] = np.sin(angle[:, None]/2) * axis
                quat[:, 3] = np.cos(angle/2)
            tracks.append((names[joint['name']], times, quat))
        result.append((name, tracks))
    return result
