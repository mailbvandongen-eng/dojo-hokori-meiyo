# Minimale C3D-lezer (Intel-formaat, float of int16 punten). Geeft labels, rate en punten [frames, n, 3] in mm.
import struct, numpy as np

def load(path):
    b = open(path, 'rb').read()
    pblock = b[0]; 
    hdr = struct.unpack('<BBHHHHHfHHf', b[:24])
    _, _, npts, nanalog, f0, f1, maxgap, scale, dstart, aper, rate = hdr
    p = (pblock - 1) * 512
    proc = b[p + 3]
    assert proc == 84, f'processor {proc} niet ondersteund'
    i = p + 4; groups = {}; params = {}
    while True:
        nlen = struct.unpack('<b', b[i:i + 1])[0]; gid = struct.unpack('<b', b[i + 1:i + 2])[0]
        if nlen == 0: break
        name = b[i + 2:i + 2 + abs(nlen)].decode('latin1'); j = i + 2 + abs(nlen)
        off = struct.unpack('<h', b[j:j + 2])[0]; nxt = j + off
        if gid < 0: groups[-gid] = name
        else:
            k = j + 2; typ = struct.unpack('<b', b[k:k + 1])[0]; nd = b[k + 1]; dims = list(b[k + 2:k + 2 + nd]); k += 2 + nd
            size = abs(typ) * int(np.prod(dims)) if dims else abs(typ)
            raw = b[k:k + size]
            if typ == -1: val = [raw[x * dims[0]:(x + 1) * dims[0]].decode('latin1').strip() for x in range(int(np.prod(dims[1:])) if len(dims) > 1 else 1)]
            elif typ == 4: val = np.frombuffer(raw, '<f4').tolist()
            elif typ == 2: val = np.frombuffer(raw, '<i2').tolist()
            else: val = list(raw)
            params[(gid, name)] = val
        if off == 0: break
        i = nxt
    g = {v: k for k, v in groups.items()}
    P = lambda grp, n: params.get((g.get(grp), n))
    labels = P('POINT', 'LABELS') or []
    for extra in ('LABELS2', 'LABELS3'):
        if P('POINT', extra): labels += P('POINT', extra)
    nfr = f1 - f0 + 1
    per_analog = aper * nanalog if nanalog else 0
    if scale < 0:
        rowsz = npts * 16 + per_analog * 4
    else:
        rowsz = npts * 8 + per_analog * 2
    start = (dstart - 1) * 512
    pts = np.zeros((nfr, npts, 3))
    for f in range(nfr):
        o = start + f * rowsz
        if scale < 0:
            a = np.frombuffer(b[o:o + npts * 16], '<f4').reshape(npts, 4)
            pts[f] = a[:, :3]
            pts[f][a[:, 3] < 0] = np.nan
        else:
            a = np.frombuffer(b[o:o + npts * 8], '<i2').reshape(npts, 4).astype(float)
            pts[f] = a[:, :3] * scale
            pts[f][a[:, 3] < 0] = np.nan
    return labels[:npts], rate, pts
