"""Numerical controls for the experimental depth path; no extra test dependencies."""
import numpy as np
from depth_trial import decode, positive_control, phantom, render_depth, fit_angle


def test_hue_encoding_ignores_lighting_value():
    pixels = np.array([[[0,0,255,255],[0,255,255,255],[0,255,0,255],[255,255,0,255],[255,0,0,255]]],np.uint8)
    expected = [[-.6,-.3,0,.3,.6]]
    np.testing.assert_allclose(decode(pixels,'hue'),expected)
    dim = pixels.copy()
    dim[:,:,:3] //= 2
    np.testing.assert_allclose(decode(dim,'hue'),expected)


def test_gray_endpoints():
    pixels = np.array([[[0,0,0,255],[255,255,255,255]]],np.uint8)
    np.testing.assert_allclose(decode(pixels,'gray'),[[-.6,.6]])


def test_exact_depth_recovers_hidden_recess():
    metrics = positive_control()
    assert metrics['exact_depth_volume_iou'] > .97
    assert metrics['exact_depth_volume_iou']-metrics['baseline_volume_iou'] > .08


def test_yaw_search_recovers_known_offset():
    truth = phantom()
    cam = dict(angle=.4,elevation=.087,cx=80.,floor=150.,scale=130.)
    mask = np.isfinite(render_depth(truth,cam,(160,160)))
    score,delta,_ = fit_angle(truth,dict(cam,angle=cam['angle']+np.deg2rad(5)),mask)
    assert delta == -5
    assert score == 1.


if __name__=='__main__':
    for test in [test_hue_encoding_ignores_lighting_value,test_gray_endpoints,
                 test_exact_depth_recovers_hidden_recess,test_yaw_search_recovers_known_offset]:
        test()
        print(test.__name__+': passed')
