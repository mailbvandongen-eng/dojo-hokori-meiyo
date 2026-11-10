// Realistische vechters: MakeHuman/MPFB-modellen (CC0) met een in Blender gebouwde Kyokushin-dogi
// (tools/humans/), geladen als glTF met een Mixamo-skelet.
//
// Het gameskelet (dezelfde gewrichten als altijd: pelvis, spine, head, lSh, lEl, …) blijft de
// bron van alle bewegingen en van de raakdetectie. Het krijgt hier de echte lichaamsmaten van het
// model (heuphoogte, beenlengte, armlengte, schouderbreedte), zodat raken precies klopt met wat je
// ziet. Elk frame volgt het skelet van het model die pose ("retargeting"), met behoud van de draaiing
// van armen en benen (voor- en zijkant blijven op hun plek).
import * as THREE from '../../lib/three.module.js';
import { GLTFLoader, SkeletonUtils } from '../../lib/three-addons.js';
import { fabricNormal, kanjiDecalTexture } from './textures.js';
import { beltOf } from '../data/roster.js';
import { makeRetarget, makeFists } from './mocap.js';

const DIR = 'assets/humans/';
const cache = new Map();   // id → Promise<gltf|null>
const ready = new Map();   // id → gltf (geladen)
let manifest = null;
const manifestReady = fetch(DIR + 'index.json').then(r => (r.ok ? r.json() : {})).then(j => (manifest = j)).catch(() => (manifest = {}));

export function humanAvailable(id) { return !!(manifest && manifest[id]); }
export function humanLoaded(id) { return ready.has(id); }
export function cachedHuman(id) { return id ? ready.get(id) || null : null; }
export async function loadHuman(id) {
  await manifestReady;
  if (!manifest[id]) return null;
  if (!cache.has(id)) cache.set(id, new GLTFLoader().loadAsync(DIR + manifest[id]).then(g => { ready.set(id, g); return g; }).catch(e => { console.warn('model niet geladen', id, e); return null; }));
  return cache.get(id);
}
export const preloadHumans = ids => Promise.all(ids.map(loadHuman));

// gameskelet-gewricht → Mixamo-bot (+ kind voor de richting)
const MAP = [
  ['pelvis', 'Hips', 'Spine'], ['spine', 'Spine', 'Spine1'], ['head', 'Head', null],
  ['lSh', 'LeftArm', 'LeftForeArm'], ['lEl', 'LeftForeArm', 'LeftHand'], ['rSh', 'RightArm', 'RightForeArm'], ['rEl', 'RightForeArm', 'RightHand'],
  ['lHip', 'LeftUpLeg', 'LeftLeg'], ['lKnee', 'LeftLeg', 'LeftFoot'], ['rHip', 'RightUpLeg', 'RightLeg'], ['rKnee', 'RightLeg', 'RightFoot'],
];
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), FWD = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4();

// basis (richting d, voorkant f) → quaternion
function frame(d, f) {
  const y = d.clone().normalize(), z = f.clone().sub(y.clone().multiplyScalar(f.dot(y)));
  if (z.lengthSq() < 1e-6) z.set(1, 0, 0).cross(y);
  z.normalize(); const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// gemiddelde kleur van de dichte delen van een haartextuur (voor de onderlaag)
const hairAvgCache = new WeakMap();
function hairAverage(tex) {
  const img = tex?.image; if (!img) return null;
  if (hairAvgCache.has(img)) return hairAvgCache.get(img);
  try {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 180) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    const col = n ? new THREE.Color(r / n / 255, gg / n / 255, b / n / 255).convertSRGBToLinear() : null;
    hairAvgCache.set(img, col); return col;
  } catch { return null; }
}

function bonesOf(root) { const b = {}; root.traverse(o => { if (o.isBone) b[o.name.replace(/^mixamorig:?/, '')] = o; }); return b; }

// Maakt de vechter: zelfde API als buildFighter in model.js.
export function buildHumanFighter(data, corner, costume, gltf) {
  const L = data.uiterlijk?.lengte || 1;
  const scene = SkeletonUtils.clone(gltf.scene);
  const B = bonesOf(scene);
  scene.updateMatrixWorld(true);
  const wp = n => B[n].getWorldPosition(new THREE.Vector3());

  // ── materialen ──
  const fabric = fabricNormal();
  const belt = beltOf(costume.graad || data.graad);
  const gi = new THREE.MeshPhysicalMaterial({ color: costume.dogi === 'zwart' ? '#1b1b1d' : '#eeebe4', roughness: 0.9, normalMap: fabric, normalScale: new THREE.Vector2(0.65, 0.65), sheen: 0.45, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff4e6'), side: THREE.DoubleSide });
  const lapel = new THREE.MeshPhysicalMaterial({ color: costume.dogi === 'zwart' ? '#141416' : '#dedad2', roughness: 0.88, normalMap: fabric, normalScale: new THREE.Vector2(1.0, 1.0), sheen: 0.4, side: THREE.DoubleSide });
  const tee = new THREE.MeshPhysicalMaterial({ color: '#f7f7f5', roughness: 0.85, normalMap: fabric, normalScale: new THREE.Vector2(0.3, 0.3), side: THREE.DoubleSide });
  const obi = new THREE.MeshPhysicalMaterial({ color: belt.kleur, roughness: 0.7, normalMap: fabric, normalScale: new THREE.Vector2(0.5, 0.5), sheen: 0.4, side: THREE.DoubleSide });
  const kanji = new THREE.MeshStandardMaterial({ map: kanjiDecalTexture(costume.dogi === 'zwart'), transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const skinTint = data.uiterlijk?.huid ? new THREE.Color(data.uiterlijk.huid).lerp(new THREE.Color('#ffffff'), 0.35) : null;
  const hairMeshes = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const n = (o.material?.name || '').toLowerCase();
    if (n === 'gi') o.material = gi;
    else if (n === 'gi_lapel') o.material = lapel;
    else if (n === 'tee') o.material = tee;
    else if (n === 'obi') o.material = obi;
    else if (n === 'gi_kanji') { o.material = kanji; o.castShadow = false; o.renderOrder = 2; }
    else if (n.includes('body')) { const m = o.material = o.material.clone(); m.transparent = false; m.alphaTest = 0; m.depthWrite = true; m.side = THREE.FrontSide; m.roughness = 0.55; if (skinTint) m.color.copy(skinTint); }
    else if (n.includes('eyebrow') || n.includes('eyelash')) { const m = o.material = o.material.clone(); m.transparent = true; m.depthWrite = false; m.alphaTest = 0.05; o.renderOrder = 3; o.castShadow = false; }
    else if (n.includes('hair') || /short|long|bob|braid|ponytail|afro/.test(n)) hairMeshes.push(o);
    else { const m = o.material = o.material.clone(); m.transparent = false; }
  });

  // ── haar: een dichte onderlaag in de haarkleur (de hoofdhuid schijnt nooit door, ook niet van ver
  //    als de fijne plukken in de verkleinde textuur wegvallen) met daarop de plukken ──
  for (const o of hairMeshes) {
    const top = o.material = o.material.clone();
    top.transparent = false; top.alphaTest = 0.35; top.side = THREE.DoubleSide; top.roughness = 0.7;
    top.polygonOffset = true; top.polygonOffsetFactor = -1; top.polygonOffsetUnits = -1;
    const capColor = new THREE.Color(data.uiterlijk?.haar || hairAverage(top.map) || '#2a1f18');
    if (data.uiterlijk?.haar) top.color.set(data.uiterlijk.haar).lerp(new THREE.Color('#ffffff'), 0.35);
    const cap = top.clone(); cap.alphaTest = 0.02; cap.polygonOffset = false; cap.roughness = 0.85;
    cap.onBeforeCompile = sh => { sh.uniforms.capColor = { value: capColor.clone().multiplyScalar(0.8) }; sh.fragmentShader = 'uniform vec3 capColor;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n\tdiffuseColor.rgb = capColor;'); };
    cap.customProgramCacheKey = () => 'haarlaag';
    const under = new THREE.SkinnedMesh(o.geometry, cap); under.bind(o.skeleton, o.bindMatrix); under.frustumCulled = false; under.castShadow = true;
    o.parent.add(under); o.renderOrder = 1;
  }

  // ── gameskelet met de maten van het model (rustpose, armen en benen recht omlaag) ──
  const group = new THREE.Group(), root = new THREE.Group(); group.add(root);
  const J = {};
  const joint = (name, parent, p) => { const g = new THREE.Group(); g.position.copy(p); parent.add(g); J[name] = g; return g; };
  const hips = wp('Hips'), spineP = wp('Spine'), headP = wp('Head');
  const hipH = hips.y;
  root.position.y = hipH;
  const pelvis = joint('pelvis', root, new THREE.Vector3());
  const spine = joint('spine', pelvis, spineP.clone().sub(hips));
  joint('head', spine, headP.clone().sub(spineP));
  for (const [s, side] of [['l', 'Left'], ['r', 'Right']]) {
    const arm = wp(side + 'Arm'), fore = wp(side + 'ForeArm'), hand = wp(side + 'Hand');
    const sh = joint(s + 'Sh', spine, arm.clone().sub(spineP));
    const el = joint(s + 'El', sh, new THREE.Vector3(0, -arm.distanceTo(fore), 0));
    joint(s + 'Fist', el, new THREE.Vector3(0, -fore.distanceTo(hand) - 0.045, 0.01));
    const up = wp(side + 'UpLeg'), leg = wp(side + 'Leg'), foot = wp(side + 'Foot');
    const hp = joint(s + 'Hip', pelvis, up.clone().sub(hips));
    const kn = joint(s + 'Knee', hp, new THREE.Vector3(0, -up.distanceTo(leg), 0));
    joint(s + 'Foot', kn, new THREE.Vector3(0, -leg.distanceTo(foot) - 0.04, 0.06));
  }
  group.updateMatrixWorld(true);

  // ── uitlijning: rustpose van het model ↔ nulpose van het gameskelet ──
  scene.position.set(0, 0, 0); group.add(scene); group.updateMatrixWorld(true);
  const links = [];
  for (const [jn, bn, child] of MAP) {
    const bone = B[bn]; if (!bone) continue;
    const bw = bone.getWorldQuaternion(new THREE.Quaternion());
    const dB = child && B[child] ? wp(child).sub(wp(bn)) : UP.clone().applyQuaternion(bw);
    const dP = (jn === 'pelvis' || jn === 'spine' || jn === 'head') ? UP : DOWN;
    const align = frame(dP, FWD).multiply(frame(dB, FWD).invert());          // rustrichting → nulrichting, voorkant behouden
    const aligned = align.multiply(bw);
    const pz = J[jn].getWorldQuaternion(new THREE.Quaternion());
    links.push({ joint: J[jn], bone, off: pz.invert().multiply(aligned) });
  }
  const hipsOff = hips.clone().sub(J.pelvis.getWorldPosition(new THREE.Vector3())); // in nulpose: nul (pelvis = heup)
  // vuisten (rolonafhankelijk, uit de rusthouding) en motion capture
  makeFists(B, group);
  const mc = makeRetarget(B, group);
  const restToe = Math.min(wp('LeftToeBase').y, wp('RightToeBase').y), restAnkle = Math.min(wp('LeftFoot').y, wp('RightFoot').y);
  let mode = 'proc';
  function retarget() {
    group.updateMatrixWorld(true);
    // heup volgt het gameskelet (positie en draaiing)
    const hipsBone = B.Hips;
    J.pelvis.getWorldPosition(_v).add(hipsOff);
    hipsBone.parent.updateWorldMatrix(true, false);
    hipsBone.position.copy(hipsBone.parent.worldToLocal(_v));
    for (const l of links) {
      l.joint.getWorldQuaternion(_q).multiply(l.off);              // gewenste wereldoriëntatie
      l.bone.parent.updateWorldMatrix(true, false);
      l.bone.parent.getWorldQuaternion(_q2);
      l.bone.quaternion.copy(_q2.invert().multiply(_q));
      l.bone.updateMatrixWorld(true);
    }
  }

  function setPose(p) {
    mode = 'proc';
    root.position.y = hipH + p.root[0] * L;
    root.position.z = p.root[1];
    root.rotation.set(p.root[3], p.root[2], 0, 'YXZ');
    for (const k in J) { const r = p[k]; if (r) J[k].rotation.set(r[0], r[1], r[2]); }
    retarget();
  }

  // aka/shiro-lint achter op de band
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.008), new THREE.MeshStandardMaterial({ color: corner === 'aka' ? '#c8102e' : '#ffffff', roughness: 0.8 }));
  ribbon.position.set(0, -0.12, -0.15); J.pelvis.add(ribbon); group.updateMatrixWorld(true); B.Hips.attach(ribbon); // beweegt mee met de heup
  if (costume.official) scene.traverse(o => { if (o.isMesh && (o.material === obi || o.material === kanji)) o.visible = false; });

  // opname toepassen; voeten op de vloer (verschil in heuphoogte tussen opname en model)
  let ground = 0;
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function applyMocap(f, opt = {}) {
    mode = 'mocap';
    mc.apply(f.q, f.hips);
    group.updateMatrixWorld(true);
    if (opt.ground !== false) {
      const inv = _m.copy(group.matrixWorld).invert();
      const toe = Math.min(B.LeftToeBase.getWorldPosition(_a).applyMatrix4(inv).y, B.RightToeBase.getWorldPosition(_b).applyMatrix4(inv).y) - restToe;
      const ank = Math.min(B.LeftFoot.getWorldPosition(_a).applyMatrix4(inv).y, B.RightFoot.getWorldPosition(_b).applyMatrix4(inv).y) - restAnkle;
      const want = -Math.min(toe, ank);
      ground += (Math.max(-0.15, Math.min(0.15, want)) - ground) * 0.5;
    } else ground *= 0.9;
    if (Math.abs(ground) > 1e-4) { B.Hips.position.y += ground / B.Hips.parent.getWorldScale(_a).y; group.updateMatrixWorld(true); }
  }
  // raakpunten: in mocap-modus direct uit de botten
  const PART = { pelvis: 'Hips', spine: 'Spine', head: 'Head', lSh: 'LeftArm', lEl: 'LeftForeArm', rSh: 'RightArm', rEl: 'RightForeArm',
    lHip: 'LeftUpLeg', lKnee: 'LeftLeg', rHip: 'RightUpLeg', rKnee: 'RightLeg', lFoot: 'LeftToeBase', rFoot: 'RightToeBase' };
  const v = new THREE.Vector3();
  function partWorld(name, out = new THREE.Vector3()) {
    if (mode === 'mocap') {
      if (name === 'lFist' || name === 'rFist') { // knokkels: hand + iets voorbij de middelvingerbasis
        const s = name[0] === 'l' ? 'Left' : 'Right';
        B[s + 'Hand'].getWorldPosition(_a); B[s + 'HandMiddle1'].getWorldPosition(_b);
        return out.copy(_b).sub(_a).multiplyScalar(1.35).add(_a);
      }
      const bn = PART[name]; if (bn && B[bn]) return B[bn].getWorldPosition(out);
    }
    (J[name] || root).getWorldPosition(v); return out.copy(v);
  }
  const mats = new Set(); scene.traverse(o => { if (o.isMesh && o.material?.emissive) mats.add(o.material); });
  const flashCol = new THREE.Color(); let flashT = 0;
  function hitFlash(color = '#ffffff') { flashCol.set(color); flashT = 0.12; }
  function tickFlash(dt) {
    if (flashT <= 0) return;
    flashT = Math.max(0, flashT - dt);
    const k = flashT / 0.12 * 0.45;
    for (const m of mats) { m.emissive.copy(flashCol); m.emissiveIntensity = k; }
  }
  setPose({ root: [0, 0, 0, 0] });
  return { group, root, joints: J, setPose, applyMocap, hipH: mc.hipH, legH: wp('LeftUpLeg').y, get mode() { return mode; }, partWorld, hitFlash, tickFlash, height: hips.y / 0.52, scale: L, human: true };
}
