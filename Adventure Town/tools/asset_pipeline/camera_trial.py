"""Bounded orthographic bundle adjustment, with one withheld observation/track."""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares
from scipy.sparse import lil_matrix

from correspondence_trial import triangulate, projection_matrix


def run(tracks_path, out, jitter=False):
    tracks = json.loads((tracks_path/'candidate_tracks.json').read_text())
    cameras = json.loads((tracks_path/'cameras.json').read_text())
    truth = np.array([[c['angle'], c['cx'], c['floor']] for c in cameras])
    initial = truth.copy()
    if jitter:
        rng = np.random.default_rng(47)
        initial[1:] += rng.normal(size=(len(cameras)-1, 3))*[np.deg2rad(3), 4, 3]
    def decode(params):
        settings = np.vstack([initial[0], params[:3*(len(cameras)-1)].reshape(-1, 3)])
        return [dict(cam, angle=float(s[0]), cx=float(s[1]), floor=float(s[2])) for cam, s in zip(cameras, settings)]
    # Withheld observations never enter the fit objective or point initialization.
    start_cameras = decode(initial[1:].ravel())
    # Reject implausible initial tracks using training coordinates alone.
    retained = []
    for track in tracks:
        point, error = triangulate([(v, np.array(p)) for v, p in track[:-1]], start_cameras)
        if error <= 6 and -.2 <= point[1] <= 1.2 and max(abs(point[0]), abs(point[2])) <= .8:
            retained.append(track)
    tracks = retained
    heldout = [t[-1] for t in tracks]
    training = [t[:-1] for t in tracks]
    points = np.array([triangulate([(v, np.array(p)) for v, p in t], start_cameras)[0] for t in training])
    camera_size = 3*(len(cameras)-1)
    x0 = np.r_[initial[1:].ravel(), points.ravel()]
    observations = [(k, v, np.array(p)) for k, t in enumerate(training) for v, p in t]
    prior_scale = np.tile([np.deg2rad(5), 8., 8.], len(cameras)-1)
    def pixels(params, entries):
        cams = decode(params)
        xyz = params[camera_size:].reshape(-1, 3)
        values = []
        for k, v, p in entries:
            a, b = projection_matrix(cams[v])
            values.extend(a@xyz[k]+b-p)
        return np.array(values)
    def residual(params):
        return np.r_[pixels(params, observations), (params[:camera_size]-x0[:camera_size])/prior_scale]
    sparse = lil_matrix((2*len(observations)+camera_size, len(x0)), dtype=int)
    for row, (k, v, _) in enumerate(observations):
        sparse[2*row:2*row+2, camera_size+3*k:camera_size+3*k+3] = 1
        if v:
            sparse[2*row:2*row+2, 3*(v-1):3*v] = 1
    for k in range(camera_size):
        sparse[2*len(observations)+k, k] = 1
    bound = np.r_[np.tile([np.deg2rad(10), 20., 20.], len(cameras)-1), np.full(points.size, np.inf)]
    fit = least_squares(residual, x0, bounds=(x0-bound, x0+bound), jac_sparsity=sparse.tocsr(),
        loss='soft_l1', f_scale=1.5, max_nfev=150, ftol=1e-6)
    withheld = [(k, v, np.array(p)) for k, (v, p) in enumerate(heldout)]
    def describe(params):
        return dict(training_median_px=float(np.median(np.linalg.norm(pixels(params, observations).reshape(-1, 2), axis=1))),
            heldout_median_px=float(np.median(np.linalg.norm(pixels(params, withheld).reshape(-1, 2), axis=1))),
            heldout_p90_px=float(np.percentile(np.linalg.norm(pixels(params, withheld).reshape(-1, 2), axis=1), 90)))
    result = dict(tracks=len(tracks), synthetic_camera_jitter=jitter, withheld_observations=len(heldout),
        before=describe(x0), after=describe(fit.x), optimizer_success=bool(fit.success), evaluations=fit.nfev)
    if jitter:
        final = np.array([[c['angle'], c['cx'], c['floor']] for c in decode(fit.x)])
        result['before_yaw_mae_degrees'] = float(np.rad2deg(abs(initial[1:, 0]-truth[1:, 0])).mean())
        result['after_yaw_mae_degrees'] = float(np.rad2deg(abs(final[1:, 0]-truth[1:, 0])).mean())
        result['before_translation_mae_px'] = float(abs(initial[1:, 1:]-truth[1:, 1:]).mean())
        result['after_translation_mae_px'] = float(abs(final[1:, 1:]-truth[1:, 1:]).mean())
    out.mkdir(parents=True, exist_ok=True)
    (out/'cameras.json').write_text(json.dumps(decode(fit.x), indent=2))
    (out/'report.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('tracks', type=Path)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--jitter', action='store_true')
    a = p.parse_args()
    run(a.tracks, a.out, a.jitter)
