# BVH lezen en forward kinematics (numpy). Rotaties in wereldruimte per gewricht per frame.
import numpy as np, re

def _rot(axis, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    if axis == 'X': return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'Y': return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def load(path):
    tok = open(path).read().split()
    i = 0; joints = []; stack = []
    while tok[i] != 'MOTION':
        t = tok[i]
        if t in ('ROOT', 'JOINT'):
            joints.append({'name': tok[i + 1], 'parent': stack[-1] if stack else -1, 'chan': [], 'end': None}); i += 2
        elif t == 'End':
            i += 2; # End Site { OFFSET x y z }
            assert tok[i] == '{' and tok[i + 1] == 'OFFSET'
            joints[stack[-1]]['end'] = np.array([float(x) for x in tok[i + 2:i + 5]]); i += 6
            continue
        elif t == '{':
            stack.append(len(joints) - 1); i += 1
        elif t == '}':
            stack.pop(); i += 1
        elif t == 'OFFSET':
            joints[-1]['offset'] = np.array([float(x) for x in tok[i + 1:i + 4]]); i += 4
        elif t == 'CHANNELS':
            n = int(tok[i + 1]); joints[-1]['chan'] = tok[i + 2:i + 2 + n]; i += 2 + n
        else:
            i += 1
    n_frames = int(tok[i + 2]); dt = float(tok[i + 5]); data = np.array([float(x) for x in tok[i + 6:]]).reshape(n_frames, -1)
    return joints, data, dt

def fk(joints, data):
    """geeft pos[f, j, 3] (meter) en rot[f, j, 3, 3] (wereld)"""
    F = len(data); J = len(joints)
    pos = np.zeros((F, J, 3)); rot = np.zeros((F, J, 3, 3))
    for f in range(F):
        c = 0
        for j, jt in enumerate(joints):
            R = np.eye(3); p = jt['offset'].copy()
            for ch in jt['chan']:
                v = data[f, c]; c += 1
                if ch.endswith('position'): p['XYZ'.index(ch[0])] = v if jt['parent'] < 0 else p['XYZ'.index(ch[0])]
                else: R = R @ _rot(ch[0], v)
            if jt['parent'] < 0:
                rot[f, j] = R; pos[f, j] = p
            else:
                P = jt['parent']; rot[f, j] = rot[f, P] @ R; pos[f, j] = pos[f, P] + rot[f, P] @ jt['offset']
    return pos / 100.0, rot
