"""Configured quadruped skin regions and procedural idle/trot poses."""
import numpy as np
from rig import smoothstep


def skin_weights(positions, names, joints, height, gates):
    index = {name: i for i, name in enumerate(names)}
    x, y, z = (positions / height).T
    weights = np.zeros((len(positions), len(names)))
    tail = smoothstep(*gates['tail_y'], y) * (1 - smoothstep(*gates['tail_z'], z))
    head = smoothstep(*gates['head_y'], y) * smoothstep(*gates['head_z'], z) * (1 - tail)
    body = 1 - tail - head
    legs = 1 - smoothstep(*gates['leg_y'], y)
    front = smoothstep(*gates['chest_z'], z)
    tip = smoothstep(*gates['tail_tip'], y)
    weights[:, index['head']] = head
    weights[:, index['tailBase']] = tail * (1 - tip)
    weights[:, index['tailTip']] = tail * tip
    weights[:, index['chest']] = body * (1 - legs) * front
    weights[:, index['pelvis']] = body * (1 - legs) * (1 - front)
    for pair, region in [('front', front), ('rear', 1 - front)]:
        for side, side_mask in [('L', x >= 0), ('R', x < 0)]:
            bones = [f'{pair}{part}{side}' for part in ['Upper', 'Lower', 'Paw']]
            distances = []
            for i, bone in enumerate(bones):
                start = joints[index[bone]]
                end = joints[index[bones[i + 1]]] if i < 2 else start + [0, -height * .04, height * .05]
                segment = end - start
                t = np.clip((positions - start) @ segment / (segment @ segment), 0, 1)
                distances.append(np.linalg.norm(positions - start - t[:, None] * segment, axis=1))
            distance = np.stack(distances, axis=1)
            scores = np.exp(-(distance - distance.min(axis=1, keepdims=True)) / (height * .022))
            scores /= scores.sum(axis=1, keepdims=True)
            for i, bone in enumerate(bones):
                weights[:, index[bone]] = body * legs * region * side_mask * scores[:, i]
    ids = np.argsort(-weights, axis=1)[:, :4]
    weights = np.take_along_axis(weights, ids, axis=1)
    weights /= weights.sum(axis=1, keepdims=True)
    return ids.astype(np.uint16), weights.astype(np.float32)


def pose_angles(names, clip, t):
    angles = np.zeros((len(names), 3))
    index = {name: i for i, name in enumerate(names)}
    wave = np.sin(2 * np.pi * t)
    angles[index['tailBase'], 2] = .07 * wave
    angles[index['tailTip'], 2] = .10 * np.sin(2 * np.pi * t + .6)
    if clip == 'idle':
        angles[index['head'], 1] = .07 * wave
        angles[index['chest'], 0] = .012 * wave
    elif clip == 'walk':
        # Diagonal paws share a phase; the opposite diagonal alternates.
        for pair, phase in [('front', 1), ('rear', -1)]:
            for side, sign in [('L', 1), ('R', -1)]:
                swing = phase * sign * wave
                bend = .34 * max(0, -swing)
                angles[index[f'{pair}Upper{side}'], 0] = .38 * swing
                angles[index[f'{pair}Lower{side}'], 0] = bend
                angles[index[f'{pair}Paw{side}'], 0] = -.38 * swing - bend
        angles[index['head'], 1] = .025 * wave
    return angles
