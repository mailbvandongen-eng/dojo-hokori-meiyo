// Motion capture op de MakeHuman-modellen.
//
// De opnames (tools/mocap/convert.py) bevatten per bot per frame een "anatomisch frame" A(t):
// een rotatie waarvan de eerste as langs het bot wijst (naar het volgende gewricht) en de tweede
// naar de voorkant van het lichaam. Voor elk doelskelet maken we één keer K = inverse(Ft) * W0:
// Ft is hetzelfde anatomische frame in de rusthouding van het model, W0 de rustrotatie van het bot.
// De wereldrotatie van het bot op tijd t is dan A(t) * K. Zo maakt het niet uit in welke rusthouding
// het model staat (A-pose, T-pose) of hoe de botten in Blender gerold zijn; de draaiing van
// onderarm, vuist en scheen komt mee uit de opname.
import * as THREE from '../../lib/three.module.js';

export const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'RightUpLeg', 'RightLeg', 'RightFoot'];

// richting van elk bot in de rusthouding: naar dit kind (of 'up')
const CHILD = {
  Hips: 'Spine1', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'up',
};
for (const s of ['Left', 'Right']) Object.assign(CHILD, {
  [s + 'Shoulder']: s + 'Arm', [s + 'Arm']: s + 'ForeArm', [s + 'ForeArm']: s + 'Hand', [s + 'Hand']: s + 'HandMiddle1',
  [s + 'UpLeg']: s + 'Leg', [s + 'Leg']: s + 'Foot', [s + 'Foot']: s + 'ToeBase',
});

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();

// anatomisch frame: kolommen (bot, voorkant, derde as)
export function anatFrame(p, s) {
  const a = p.clone().normalize(), b = s.clone().sub(a.clone().multiplyScalar(s.dot(a))).normalize();
  const c = new THREE.Vector3().crossVectors(a, b);
  return new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(a, b, c));
}
function secondary(name, p, up, fwd) {
  if (name.endsWith('Foot')) return up;
  if (name === 'Hips') return fwd;
  return Math.abs(p.dot(fwd)) < 0.8 ? fwd : up;
}

// Bereidt een skelet voor. `space` is het object waarin de opname wordt afgespeeld
// (de modelgroep van de vechter); de rest van de rig hangt daaronder.
export function makeRetarget(B, space) {
  space.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(space.matrixWorld).invert();
  const pos = n => B[n].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
  const spaceQ = space.getWorldQuaternion(new THREE.Quaternion());
  const rot = n => spaceQ.clone().invert().multiply(B[n].getWorldQuaternion(new THREE.Quaternion()));
  const left = pos('LeftUpLeg').sub(pos('RightUpLeg')); left.y = 0; left.normalize();
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3().crossVectors(left, up);
  const K = {};
  for (const n of BONES) {
    if (!B[n]) continue;
    const ch = CHILD[n];
    let p;
    if (n === 'Hips') p = pos('Spine1').sub(pos('LeftUpLeg').add(pos('RightUpLeg')).multiplyScalar(0.5));
    else if (ch === 'up') p = up.clone();
    else p = pos(ch).sub(pos(n));
    p.normalize();
    const Ft = anatFrame(p, secondary(n, p, up, fwd));
    K[n] = Ft.invert().multiply(rot(n));
  }
  const hipH = pos('Hips').y;
  const W = {}; for (const n of BONES) W[n] = new THREE.Quaternion();
  const hipsParent = B.Hips.parent;

  // q: Float32Array/array met per bot [x,y,z,w] (volgorde BONES); hips: [x,y,z] in heuphoogtes
  function apply(q, hips) {
    for (let i = 0; i < BONES.length; i++) {
      const n = BONES[i]; if (!K[n]) continue;
      W[n].set(q[i * 4], q[i * 4 + 1], q[i * 4 + 2], q[i * 4 + 3]).multiply(K[n]);
    }
    // heup: positie en rotatie relatief aan de ouder van de heup (die hangt onder `space`)
    hipsParent.updateWorldMatrix(true, false);
    _m.copy(space.matrixWorld).invert().multiply(hipsParent.matrixWorld); // ouder → space
    const parentQ = new THREE.Quaternion().setFromRotationMatrix(_m);
    _v.set(hips[0] * hipH, hips[1] * hipH, hips[2] * hipH).applyMatrix4(_m.clone().invert());
    B.Hips.position.copy(_v);
    B.Hips.quaternion.copy(parentQ.invert().multiply(W.Hips));
    for (let i = 1; i < BONES.length; i++) {
      const n = BONES[i], b = B[n]; if (!K[n]) continue;
      const pn = b.parent.name.replace(/^mixamorig:?/, '');
      b.quaternion.copy(_q.copy(W[pn]).invert().multiply(W[n]));
    }
  }
  return { apply, hipH };
}

// ── Clips ──
let lib = null;
export async function loadClips(url = 'assets/anims/clips.json') {
  if (!lib) lib = fetch(url).then(r => r.json()).then(j => {
    for (const c of Object.values(j.clips)) { c.q = c.q.map(r => Float32Array.from(r)); c.dur = (c.frames - 1) / c.fps; }
    return j.clips;
  });
  return lib;
}

// sample op tijd t (seconden) met slerp tussen frames → out {q: Float32Array, hips: [3]}
export function sample(clip, t, out, loop = false) {
  let f = t * clip.fps;
  if (loop) f = ((f % (clip.frames - 1)) + (clip.frames - 1)) % (clip.frames - 1);
  f = Math.max(0, Math.min(clip.frames - 1, f));
  const i = Math.min(clip.frames - 2, Math.floor(f)), u = f - i;
  const a = clip.q[i], b = clip.q[i + 1];
  for (let k = 0; k < a.length; k += 4) {
    _q.fromArray(a, k); _q2.fromArray(b, k); if (_q.dot(_q2) < 0) _q2.set(-_q2.x, -_q2.y, -_q2.z, -_q2.w);
    _q.slerp(_q2, u); out.q[k] = _q.x; out.q[k + 1] = _q.y; out.q[k + 2] = _q.z; out.q[k + 3] = _q.w;
  }
  const ha = clip.hips[i], hb = clip.hips[i + 1];
  for (let k = 0; k < 3; k++) out.hips[k] = ha[k] + (hb[k] - ha[k]) * u;
  return out;
}
export function blend(a, b, w, out) {
  for (let k = 0; k < a.q.length; k += 4) {
    _q.fromArray(a.q, k); _q2.fromArray(b.q, k); if (_q.dot(_q2) < 0) _q2.set(-_q2.x, -_q2.y, -_q2.z, -_q2.w);
    _q.slerp(_q2, w); out.q[k] = _q.x; out.q[k + 1] = _q.y; out.q[k + 2] = _q.z; out.q[k + 3] = _q.w;
  }
  for (let k = 0; k < 3; k++) out.hips[k] = a.hips[k] + (b.hips[k] - a.hips[k]) * w;
  return out;
}
export const newFrame = () => ({ q: new Float32Array(BONES.length * 4), hips: [0, 1, 0] });

// Vuisten: elk vingerkootje klapt om de as dwars op de vinger, naar de handpalm toe; de duim ligt
// over wijs- en middelvinger. Berekend uit de rusthouding van het model (rolonafhankelijk).
export function makeFists(B, space) {
  space.updateMatrixWorld(true);
  const wp = n => B[n].getWorldPosition(new THREE.Vector3());
  const center = wp('Hips');
  for (const s of ['Left', 'Right']) {
    if (!B[s + 'HandMiddle1']) continue;
    const hand = wp(s + 'Hand'), mid = wp(s + 'HandMiddle1'), idx = wp(s + 'HandIndex1'), pnk = wp(s + 'HandPinky1');
    const along = mid.clone().sub(hand).normalize();
    let palm = new THREE.Vector3().crossVectors(along, idx.clone().sub(pnk)).normalize();
    // handpalm wijst in de rusthouding naar het lichaam
    const toBody = center.clone().sub(hand); toBody.y = 0;
    if (palm.dot(toBody) < 0) palm.negate();
    const curl = (bn, angle, axisW) => {
      const b = B[bn]; if (!b) return;
      const bq = b.getWorldQuaternion(new THREE.Quaternion());
      const axL = axisW.clone().applyQuaternion(bq.clone().invert()).normalize();
      b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axL, angle));
      b.updateMatrixWorld(true);
    };
    // assen eerst in de rusthouding bepalen (na het buigen van een kootje klopt de richting niet meer)
    const todo = [];
    for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {
      const base = wp(`${s}Hand${f}1`), tip = B[`${s}Hand${f}3`] ? wp(`${s}Hand${f}3`) : mid;
      const axis = new THREE.Vector3().crossVectors(tip.sub(base).normalize(), palm).normalize(); // positief: punt → palm
      todo.push([`${s}Hand${f}1`, 1.4, axis], [`${s}Hand${f}2`, 1.55, axis], [`${s}Hand${f}3`, 1.2, axis]);
    }
    for (const [bn, a, ax] of todo) curl(bn, a, ax);
    // duim: punt naar het midden van wijs- en middelvinger (over de gebogen vingers heen)
    const T1 = B[s + 'HandThumb1'], tipB = B[s + 'HandThumb3'];
    if (T1 && tipB) {
      const t1 = wp(s + 'HandThumb1'), tip = wp(s + 'HandThumb3');
      const goal = wp(s + 'HandIndex2').add(wp(s + 'HandMiddle2')).multiplyScalar(0.5).addScaledVector(palm, -0.012);
      const turn = new THREE.Quaternion().setFromUnitVectors(tip.sub(t1).normalize(), goal.sub(t1).normalize());
      const pw = T1.parent.getWorldQuaternion(new THREE.Quaternion()), bw = T1.getWorldQuaternion(new THREE.Quaternion());
      T1.quaternion.copy(pw.invert().multiply(turn.multiply(bw))); T1.updateMatrixWorld(true);
    }
  }
}
