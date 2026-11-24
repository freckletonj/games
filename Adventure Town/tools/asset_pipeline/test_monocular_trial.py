"""Numerical controls for scale fitting, shared units and camera isolation."""
import numpy as np
from monocular_trial import fit_depth,calibrate,refine_cameras,camera_rotation
from depth_trial import phantom,render_depth


def test_affine_fit_ignores_invalid_background():
    raw = np.linspace(1,10,10000).reshape(100,100)
    target = .15*raw-.3
    valid = np.zeros(raw.shape,bool)
    valid[10:90,10:90] = True
    target[~valid] = np.inf
    predicted,_ = fit_depth(raw,target,valid)
    np.testing.assert_allclose(predicted[valid],target[valid],atol=1e-6)


def test_shared_calibration_preserves_known_units():
    volume = phantom()
    cameras = [dict(angle=a,elevation=.087,cx=80.,floor=150.,scale=130.) for a in [0,np.pi/2]]
    exact = [render_depth(volume,c,(160,160)) for c in cameras]
    masks = [np.isfinite(d) for d in exact]
    raw = [np.where(m,3*d+.7,0) for d,m in zip(exact,masks)]
    predicted,valid,metrics = calibrate(volume,cameras,raw,masks,'shared')
    assert metrics[0]==metrics[1]
    for p,d,m in zip(predicted,exact,valid):
        np.testing.assert_allclose(p[m],d[m],atol=1e-6)


def test_pose_refinement_leaves_withheld_cameras_untouched():
    cameras = [dict(angle=a,elevation=.087,cx=80.,floor=150.,scale=130.) for a in [0,.4,.8]]
    data = {f'pose{i}':np.column_stack([camera_rotation(dict(c,angle=c['angle']+.1)),np.zeros(3)]) for i,c in enumerate(cameras)}
    result = refine_cameras(cameras,data,[0,2])
    assert result[1]==cameras[1]
    assert result is not cameras
    np.testing.assert_allclose(result[0]['angle'],cameras[0]['angle'],atol=1e-7)


if __name__=='__main__':
    for test in [test_affine_fit_ignores_invalid_background,test_shared_calibration_preserves_known_units,
                 test_pose_refinement_leaves_withheld_cameras_untouched]:
        test()
        print(test.__name__+': passed')
