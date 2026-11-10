# Bouwt assets/anims/clips.json uit de motion capture-bronnen.
#   ACCAD Open Motion Project, Male2 (CC BY 3.0): /opt/mocap/accad/m2
#   Kyokushin-dataset, atleet B0367 (Szczęsna e.a. 2021, CC0): /opt/mocap/kyok/x/B0367
# Alle clips staan in orthodoxe kamae (links voor) en slaan naar +Z; opnames in de andere stand
# worden gespiegeld. Per aanval worden het begin van de beweging, de treffer(s) en het einde
# automatisch bepaald uit de snelheid en het bereik van het raakvlak.
# Gebruik: python3 tools/mocap/build.py
import sys, os, glob, json, warnings, numpy as np
warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bvh, convert, kyok

ACC = '/opt/mocap/accad/m2'
KY = '/opt/mocap/kyok/x/B0367/2017-01-31-B0367-'
OUT = os.path.join(HERE, '..', '..', 'assets', 'anims', 'clips.json')
SWAP = lambda n: n.replace('Left', '#').replace('Right', 'Left').replace('#', 'Right')

# ── bronnen inlezen: posities van gewrichten in gamecoördinaten (meter) ──
def accad_pos(name):
    J, D, dt = bvh.load(glob.glob(f'{ACC}/**/Male2_{name}.bvh', recursive=True)[0]); P, _ = bvh.fk(J, D)
    ix = convert.ix
    pos = {k: P[:, ix[v]] for k, v in {
        'Hips': 'Hips', 'Head': 'Head', 'LeftHand': 'LeftHand', 'RightHand': 'RightHand', 'LeftElbow': 'LeftForeArm', 'RightElbow': 'RightForeArm',
        'LeftKnee': 'LeftLeg', 'RightKnee': 'RightLeg', 'LeftAnkle': 'LeftFoot', 'RightAnkle': 'RightFoot', 'LeftToe': 'LeftToeBase', 'RightToe': 'RightToeBase'}.items()}
    pos['Hips'] = (P[:, ix['LeftUpLeg']] + P[:, ix['RightUpLeg']]) / 2  # heupgewrichten (zoals bij Plug-in Gait)
    return pos, 1 / dt
def kyok_pos(f):
    g, rate, n = kyok.load(KY + f); G = lambda k: kyok.interp_nan(g(k))
    pos = {'Hips': (G('LHJC') + G('RHJC')) / 2, 'Head': G('HEDO')}
    for s, S in (('L', 'Left'), ('R', 'Right')):
        pos.update({S + 'Hand': G(s + 'FIN'), S + 'Elbow': G(s + 'EJC'), S + 'Knee': G(s + 'KJC'), S + 'Ankle': G(s + 'AJC'), S + 'Toe': G(s + 'TOE')})
    return pos, rate
def mirror_pos(pos):
    out = {}
    for k, v in pos.items(): w = v.copy(); w[:, 0] *= -1; out[SWAP(k)] = w
    return out

# ── gebeurtenissen ──
def events(pos, rate, eff, a, b, n_hits=1, near=None):
    """treffer = grootste voorwaartse reikwijdte (z t.o.v. de heup); begin/einde uit de snelheid"""
    e = pos[eff]; h = pos['Hips']
    z = e[:, 2] - h[:, 2]
    sp = np.r_[0, np.linalg.norm(np.diff(e, axis=0), axis=1) * rate]
    sp = np.convolve(sp, np.ones(5) / 5, 'same')
    seg = range(a, b)
    if near is not None: seg = range(max(a, near - int(0.25 * rate)), min(b, near + int(0.25 * rate)))
    hits = []
    zz = z.copy()
    for _ in range(n_hits):
        k = max(seg, key=lambda i: zz[i] if not np.isnan(zz[i]) else -9); hits.append(k)
        for i in range(max(0, k - int(0.2 * rate)), min(len(zz), k + int(0.2 * rate))): zz[i] = -9
    hits.sort()
    return around(pos, rate, eff, a, b, hits, z, e, sp)

def around(pos, rate, eff, a, b, hits, z, e, sp):
    """begin: laatste rustige moment voor de treffer; einde: weer rustig én terug bij de beginhouding"""
    peak = max(sp[i] for i in range(max(a, hits[0] - int(0.15 * rate)), hits[-1] + 1))
    calm = int(0.06 * rate)
    on = hits[0]
    while on > a + calm and not all(sp[on - j] < 0.2 * peak for j in range(calm)): on -= 1
    on -= calm // 2
    d0 = np.linalg.norm(e[on] - pos['Hips'][on])
    off = hits[-1]
    while off < b - calm and not (all(sp[off + j] < 0.15 * peak for j in range(calm)) and abs(np.linalg.norm(e[off] - pos['Hips'][off]) - d0) < 0.15): off += 1
    return on, hits, off, z, e

CLIPS = {}
def add(cid, data, ev=None, **meta):
    c = data; c['id'] = cid
    if ev: c['ev'] = ev
    c.update(meta); CLIPS[cid] = c

def attack(cid, src, eff, peak=None, mirror=False, pre=0.06, post=0.12, n_hits=1, impact='reach', limb=None, cut=None):
    if src[0] == 'accad':
        pos, rate = accad_pos(src[1]); n = len(pos['Hips'])
    else:
        pos, rate = kyok_pos(src[1]); n = len(pos['Hips'])
    if mirror: pos = mirror_pos(pos)
    a, b = (0, n) if peak is None else (max(0, peak - int(1.0 * rate)), min(n, peak + int(1.1 * rate)))
    if impact == 'height':  # knie of radslag: hoogste punt
        e = pos[eff]; z = e[:, 2] - pos['Hips'][:, 2]; y = e[:, 1]
        seg = range(a, b) if peak is None else range(max(a, peak - int(0.4 * rate)), min(b, peak + int(0.4 * rate)))
        k = max(seg, key=lambda i: y[i])
        sp = np.convolve(np.r_[0, np.linalg.norm(np.diff(e, axis=0), axis=1) * rate], np.ones(5) / 5, 'same')
        on, hits, off, z, e = around(pos, rate, eff, a, b, [k], z, e, sp)
        if cut: off = min(off, k + int(cut * rate))
    else:
        on, hits, off, z, e = events(pos, rate, eff, a, b, n_hits, near=peak)
    s0 = max(0, on - int(pre * rate)); s1 = min(n, off + int(post * rate))
    if src[0] == 'accad': data = convert.convert(src[1], s0, s1, mirror=mirror)
    else: data = kyok.clip(KY + src[1], s0, s1, fps=60, mirror=mirror)
    ev = {'on': (on - s0) / rate, 'hits': [(h - s0) / rate for h in hits], 'off': (off - s0) / rate}
    info = f"{cid:16s} {src[1][-24:]:24s} eff={eff:10s} on→hit {(hits[0]-on)/rate:.2f}s hit→off {(off-hits[-1])/rate:.2f}s reach z={z[hits[0]]:.2f} y={e[hits[0],1]:.2f}"
    print(info)
    hip0 = float(np.median(pos['Hips'][max(0, on - int(0.2 * rate)):on + 1, 1]))
    add(cid, data, ev, kind='attack', reach=round(float(z[hits[0]]), 3), hitY=round(float(e[hits[0], 1]), 3),
        hitRel=[round(float(e[k, 1] / hip0), 3) for k in hits], eff=eff)

def loop(cid, src, a, b, mirror=False, kind='loop'):
    data = convert.convert(src, a, b, mirror=mirror) if not src.endswith('.c3d') else kyok.clip(KY + src, a, b, fps=60, mirror=mirror)
    add(cid, data, kind=kind); print(f"{cid:16s} {src[-24:]:24s} {data['frames']} frames")

def pose_at(src, fsel, mirror=False, cid=None):
    pass

def main():
    # ── aanvallen ──
    attack('jab', ('accad', 'E16_BodyJabLeft'), 'LeftHand')
    attack('gyaku', ('accad', 'E14_BodyCrossRight'), 'RightHand')
    attack('shita', ('accad', 'E9_BodyHookLeft'), 'RightHand', mirror=True)
    attack('jodan_tsuki', ('kyok', 'S01/2017-01-31-B0367-S01-E01-T01.c3d'), 'RightHand', peak=467)
    attack('hiji', ('accad', 'E5_HookLeft'), 'RightElbow', mirror=True)
    attack('mae', ('kyok', 'S02/2017-01-31-B0367-S02-E01-T01.c3d'), 'RightToe', peak=801)
    attack('hiza', ('kyok', 'S02/2017-01-31-B0367-S02-E01-T01.c3d'), 'RightKnee', peak=801, impact='height', cut=0.3)
    attack('gedan', ('kyok', 'S03/2017-01-31-B0367-S03-E01-T01.c3d'), 'RightAnkle', peak=790)
    attack('chudan_mawashi', ('accad', 'G15_RoundhouseBodyRight'), 'RightToe')
    attack('jodan_mawashi', ('kyok', 'S04/2017-01-31-B0367-S04-E01-T01.c3d'), 'RightAnkle', peak=765)
    attack('ushiro_geri', ('accad', 'G5_BackKick'), 'LeftToe', mirror=True, peak=27)
    attack('ushiro_mawashi', ('kyok', 'S05/2017-01-31-B0367-S05-E01-T01.c3d'), 'RightAnkle', peak=1034)
    attack('kakato', ('accad', 'G6_AxeKick'), 'LeftToe', mirror=True, peak=58)
    attack('rol', ('accad', 'G7_Capoeira'), 'LeftToe', impact='height')
    # verdediging (treffer = moment waarop het blok staat)
    attack('block', ('accad', 'E17_BlockMiddleHigh'), 'LeftHand', post=0.3)
    attack('gedan_barai', ('accad', 'E18_BlockMiddleLow'), 'LeftHand', post=0.3)

    # ── lussen en losse bewegingen ──
    loop('idle', 'S03/2017-01-31-B0367-S03-E01-T01.c3d', 10, 150)
    loop('advance', 'E3_Advance', 40, 150, mirror=True)
    loop('retreat', 'E5_Retreat', 40, 190, mirror=True)
    loop('sidestep', 'E9_SideStepLeft', 0, 70, kind='oneshot')
    loop('dash', 'E6_QuickRetreat', 0, 60, mirror=True, kind='oneshot')
    loop('bow', 'D8_BowToReady', 0, 129, kind='oneshot')
    loop('victory', 'D9_Victory1', 0, 200, kind='oneshot')
    loop('crouch_lie', 'A8_CrouchToLie', 0, 174, kind='oneshot')
    loop('lie_crouch', 'A10_LieToCrouch', 0, 138, kind='oneshot')
    loop('crouch_ready', 'D13_CrouchToReady', 0, 114, kind='oneshot')
    loop('stand', 'A1_Stand', 0, 60)
    loop('crouch', 'A7_Crouch', 120, 200)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({'source': 'ACCAD Open Motion Project (CC BY 3.0); Kyokushin karate dataset, Szczęsna, Błaszczyszyn & Pawlyta 2021 (CC0)',
               'clips': CLIPS}, open(OUT, 'w'), separators=(',', ':'))
    print('geschreven', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
