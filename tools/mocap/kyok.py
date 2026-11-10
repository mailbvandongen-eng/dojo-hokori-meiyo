# Kyokushin-dataset (Szczęsna e.a. 2021, CC0): Vicon Plug-in Gait-segmenten → anatomische frames.
# Zelfde uitvoerformaat als convert.py (ACCAD). Per segment: primaire as langs het bot (tussen
# gewrichtsmiddelpunten), tweede as = anterieure as van het segment. Romp, bekken en hoofd worden
# rechtgezet op het eerste (staande) frame, zodat de kanteling van het Plug-in Gait-bekken verdwijnt.
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); import c3dread
from scipy.spatial.transform import Rotation as Rr, Slerp

def nrm(v): return v / np.linalg.norm(v, axis=-1, keepdims=True)
def frame(p, s):
    p = nrm(p); s = nrm(s - np.sum(s * p, -1, keepdims=True) * p); return np.stack([p, s, np.cross(p, s)], -1)
M = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)  # Vicon (Z omhoog, kijkt naar -Y) → game (Y omhoog, kijkt naar +Z)

ORDER = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'RightUpLeg', 'RightLeg', 'RightFoot']

def load(path):
    L, rate, P = c3dread.load(path); ix = {l.split(':')[-1]: i for i, l in enumerate(L)}
    g = lambda n: (P[:, ix[n]] / 1000.0) @ M.T
    return g, rate, len(P)

def interp_nan(a):
    a = a.copy()
    for c in range(a.shape[1]):
        v = a[:, c]; bad = np.isnan(v)
        if bad.any() and (~bad).any(): v[bad] = np.interp(np.flatnonzero(bad), np.flatnonzero(~bad), v[~bad])
    return a

def frames(g):
    G = lambda n: interp_nan(g(n))
    seg = lambda s: (G(s + 'O'), G(s + 'A') - G(s + 'O'), G(s + 'L') - G(s + 'O'), G(s + 'P') - G(s + 'O'))
    F = {}
    pO, pA, pL, pP = seg('PEL'); tO, tA, tL, tP = seg('TRX'); hO, hA, hL, hP = seg('HED')
    def upright(Fr):  # kanteling op frame 0 eruit (rond de laterale as)
        p0, s0 = Fr[0][:, 0], Fr[0][:, 1]
        want = frame(np.array([0, 1.0, 0]) if abs(p0[1]) > 0.7 else p0, np.array([s0[0], 0, s0[2]]))
        C = Fr[0].T @ want
        return Fr @ C
    Fp = upright(frame(pP, pA)); Ft = upright(frame(tP, tA)); Fh = upright(frame(hP, hA))
    F['Hips'] = Fp
    def sl(A, B, u):
        out = np.zeros_like(A)
        for k in range(len(A)):
            r = Slerp([0, 1], Rr.from_matrix([A[k], B[k]]))(u); out[k] = r.as_matrix()
        return out
    F['Spine'] = sl(Fp, Ft, 0.33); F['Spine1'] = sl(Fp, Ft, 0.66); F['Spine2'] = Ft
    F['Neck'] = sl(Ft, Fh, 0.5); F['Head'] = Fh
    for s, S in (('L', 'Left'), ('R', 'Right')):
        SJ, EJ, WJ = G(s + 'SJC'), G(s + 'EJC'), G(s + 'WJC')
        HJ, KJ, AJ = G(s + 'HJC'), G(s + 'KJC'), G(s + 'AJC')
        clav_base = (G('CLAV') + G('C7')) / 2
        F[S + 'Shoulder'] = frame(SJ - clav_base, Ft[:, :, 1])
        F[S + 'Arm'] = frame(EJ - SJ, G(s + 'HUA') - G(s + 'HUO'))
        F[S + 'ForeArm'] = frame(WJ - EJ, G(s + 'RAA') - G(s + 'RAO'))
        F[S + 'Hand'] = frame(G(s + 'FIN') - WJ, G(s + 'HNA') - G(s + 'HNO'))
        F[S + 'UpLeg'] = frame(KJ - HJ, G(s + 'FEA') - G(s + 'FEO'))
        F[S + 'Leg'] = frame(AJ - KJ, G(s + 'TIA') - G(s + 'TIO'))
        toe = G(s + 'TOE'); fp = toe - AJ; lat = G(s + 'FOL') - G(s + 'FOO')
        up = np.cross(lat, fp); up *= np.sign(np.sum(up * np.array([0, 1.0, 0]), -1, keepdims=True)[0:1] + 1e-9)
        F[S + 'Foot'] = frame(fp, up)
    hips = (G('LHJC') + G('RHJC')) / 2
    return F, hips, G

def quat(Mx): return Rr.from_matrix(Mx).as_quat()

def clip(path, a, b, fps=60, mirror=False, hip_h=None):
    g, rate, n = load(path); F, hips, G = frames(g)
    t_src = np.arange(n) / rate; t = np.arange(a / rate, b / rate, 1 / fps)
    if hip_h is None: hip_h = float(np.median(hips[:40, 1]))
    out = {'fps': fps, 'frames': len(t), 'bones': ORDER, 'q': [], 'hips': []}
    H0 = hips[a].copy()
    Q = {}
    for bn in ORDER:
        rots = Rr.from_matrix(F[bn]); Q[bn] = Slerp(t_src, rots)(np.clip(t, 0, t_src[-1])).as_matrix()
    hp = np.stack([np.interp(t, t_src, hips[:, c]) for c in range(3)], 1)
    S = np.diag([-1.0, 1, 1]); D = np.diag([1.0, 1, -1])
    for k in range(len(t)):
        row = []
        for bn in ORDER:
            if mirror:
                src = bn.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')
                A = S @ Q[src][k] @ D
            else: A = Q[bn][k]
            row += [round(float(x), 4) for x in quat(A)]
        out['q'].append(row)
        h = hp[k] - np.array([H0[0], 0, H0[2]])
        if mirror: h[0] = -h[0]
        out['hips'].append([round(float(x / hip_h), 4) for x in h])
    return out
