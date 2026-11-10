# Zet ACCAD-BVH-opnames om naar "anatomische frames" per bot per frame (assets/anims/*.json).
# In de game: wereldrotatie van een doelbot = A(t) * K, met K = inverse(anatomisch rustframe) * rustrotatie
# van dat bot (src/game/mocap.js). Zo is het onafhankelijk van de rusthouding en de botrol van het doelskelet.
import sys, json, glob, numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__)); import bvh

SRC = '/opt/mocap/accad/m2'
# doelbot -> (bronbot, bron-kind voor de richting of 'end')
MAP = {
    'Hips': ('Hips', None), 'Spine': ('ToSpine', 'Spine'), 'Spine1': ('Spine', 'Spine1'), 'Spine2': ('Spine1', 'Neck'),
    'Neck': ('Neck', 'Head'), 'Head': ('Head', 'up'),
}
for s, S in (('Left', 'Left'), ('Right', 'Right')):
    MAP.update({f'{s}Shoulder': (f'{S}Shoulder', f'{S}Arm'), f'{s}Arm': (f'{S}Arm', f'{S}ForeArm'), f'{s}ForeArm': (f'{S}ForeArm', f'{S}Hand'),
                f'{s}Hand': (f'{S}Hand', 'end'), f'{s}UpLeg': (f'{S}UpLeg', f'{S}Leg'), f'{s}Leg': (f'{S}Leg', f'{S}Foot'),
                f'{s}Foot': (f'{S}Foot', f'{S}ToeBase')})
ORDER = list(MAP)

def nrm(v): return v / np.linalg.norm(v)
def frame(p, s):
    p = nrm(p); s = nrm(s - np.dot(s, p) * p); return np.stack([p, s, np.cross(p, s)], 1)
def quat(M):
    from scipy.spatial.transform import Rotation as Rr
    return Rr.from_matrix(M).as_quat()  # x y z w

def body_axes(P, ix):
    left = P[ix['LeftUpLeg']] - P[ix['RightUpLeg']]; left[1] = 0; left = nrm(left)
    up = np.array([0, 1.0, 0]); fwd = np.cross(left, up); return left, up, fwd

def direction(P, R, ix, J, tgt):
    src, ch = MAP[tgt]; j = ix[src]
    if tgt == 'Hips':  return nrm((P[ix['Spine1']]) - (P[ix['LeftUpLeg']] + P[ix['RightUpLeg']]) / 2)
    if ch == 'end': return nrm(R[j] @ J[j]['end'])
    if ch == 'up': return nrm(R[j] @ J[j]['end'])
    return nrm(P[ix[ch]] - P[j])

def secondary(tgt, prim, left, up, fwd):
    if tgt.endswith('Foot'): return up
    if tgt == 'Hips': return fwd
    return fwd if abs(np.dot(prim, fwd)) < 0.8 else up

J, _, _ = bvh.load(glob.glob(f'{SRC}/**/Male2_A1_Stand.bvh', recursive=True)[0])
ix = {jt['name']: i for i, jt in enumerate(J)}
Jc, Dc, _ = bvh.load(glob.glob(f'{SRC}/**/Male2_A1_Stand.bvh', recursive=True)[0])
Pc, Rc = bvh.fk(Jc, Dc[:1]); Pc, Rc = Pc[0], Rc[0]
l, u, f = body_axes(Pc, ix)
CAL = {}
for t in ORDER:
    j = ix[MAP[t][0]]; p = direction(Pc, Rc, ix, J, t)
    CAL[t] = Rc[j].T @ frame(p, secondary(t, p, l, u, f))  # R_cal^-1 * Fs_cal
HIP_H = Pc[ix['Hips']][1]

MS = np.diag([-1.0, 1, 1]); MD = np.diag([1.0, 1, -1])

def yaw_to_z(fwd):
    a = np.arctan2(fwd[0], fwd[2]); c, s = np.cos(-a), np.sin(-a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])

def convert(name, start=None, end=None, facing=None, mirror=False):
    path = glob.glob(f'{SRC}/**/Male2_{name}.bvh', recursive=True)[0]
    Jn, D, dt = bvh.load(path); D = D[start:end]
    P, R = bvh.fk(Jn, D)
    _, _, f0 = body_axes(P[0], ix)
    Y = np.eye(3) if facing is None else yaw_to_z(facing)
    hips0 = P[0, ix['Hips']].copy()
    out = {'fps': round(1 / dt), 'frames': len(D), 'bones': ORDER, 'q': [], 'hips': []}
    for k in range(len(D)):
        row = []
        for t in ORDER:
            if mirror:
                src = t.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')
                A = MS @ (Y @ R[k, ix[MAP[src][0]]] @ CAL[src]) @ MD
            else: A = Y @ R[k, ix[MAP[t][0]]] @ CAL[t]
            q = quat(A); row += [round(float(x), 4) for x in q]
        out['q'].append(row)
        h = Y @ (P[k, ix['Hips']] - np.array([hips0[0], 0, hips0[2]]))
        if mirror: h[0] = -h[0]
        out['hips'].append([round(float(x / HIP_H), 4) for x in h])  # in eenheden heuphoogte
    return out

if __name__ == '__main__':
    names = sys.argv[2:]; res = {n: convert(n) for n in names}
    json.dump({'source': 'ACCAD Open Motion Project (CC BY 3.0)', 'clips': res}, open(sys.argv[1], 'w'), separators=(',', ':'))
    print('ok', list(res))
