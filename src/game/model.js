// Procedurele vechter: skelet met gewrichten, witte Kyokushin-dogi, band, aka/shiro-lint.
// Placeholder voor echte geriggde modellen (glTF); de gewrichtsnamen komen overeen met
// de bones die een artist later levert, zodat poses en gameplay hetzelfde blijven.
import * as THREE from '../../lib/three.module.js';
import { dogiTexture } from './textures.js';
import { beltOf } from '../data/roster.js';

const DOGI = new THREE.Color('#f4f1ea');
let dogiTexCache = {};

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function cyl(rTop, rBot, h, mat, seg = 10, open = false) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
  geo.translate(0, -h / 2, 0); // hangt omlaag vanaf het gewricht
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; }
function sphere(r, mat, seg = 14) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg * 0.75 | 0), mat); m.castShadow = true; return m; }

export function buildFighter(data, corner = 'aka', costume = {}) {
  const look = data.uiterlijk || {};
  const L = look.lengte || 1, B = look.bouw || 1;
  // Geslacht: vrouwen smallere schouders, iets bredere heupen, lang haar (staart of knot)
  // en een wit T-shirt onder de dogi (zoals gebruikelijk in Kyokushin); mannen bredere
  // schouders, dikkere nek en kort haar.
  const female = data.geslacht === 'v';
  const SH = female ? 0.88 : 1.06, HP = female ? 1.08 : 1.0;
  const hairStyle = look.kapsel || (female ? (hash(data.id || data.naam) % 2 ? 'staart' : 'knot') : 'kort');
  const variant = costume.dogi || 'wit';
  const official = !!costume.official; // scheidsrechter: wit shirt, donkere broek, geen band
  const skin = new THREE.MeshStandardMaterial({ color: look.huid || '#c3946c', roughness: 0.65 });
  const hair = new THREE.MeshStandardMaterial({ color: look.haar || '#24180f', roughness: 0.9 });
  const cloth = new THREE.MeshStandardMaterial({ color: variant === 'zwart' ? '#1b1b1d' : DOGI, roughness: 0.92 });
  const jacketTex = dogiTexCache[variant] || (dogiTexCache[variant] = dogiTexture({ variant }));
  const jacket = official ? cloth : new THREE.MeshStandardMaterial({ map: jacketTex, roughness: 0.92 });
  const pants = official ? new THREE.MeshStandardMaterial({ color: '#1d2433', roughness: 0.8 }) : cloth;
  const belt = beltOf(costume.graad || data.graad);
  const beltMat = new THREE.MeshStandardMaterial({ color: belt.kleur, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: belt.streep || '#d9a441', roughness: 0.5, metalness: 0.3 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: corner === 'aka' ? '#c8102e' : '#ffffff', roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 });

  const group = new THREE.Group();
  const root = new THREE.Group(); group.add(root);
  const J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };

  const hipH = 0.93 * L;
  root.position.y = hipH;
  const pelvis = joint('pelvis', root, 0, 0, 0);
  // jas-rok onder de band en broekzitvlak
  const skirt = cyl(0.17 * B * HP, 0.19 * B * HP, 0.22 * L, jacket, 14, true); skirt.material = cloth; skirt.position.y = 0.04; skirt.scale.z = 0.66; pelvis.add(skirt);
  const seat = sphere(0.15 * B * HP, pants); seat.scale.set(1.05, 0.7, 0.75); seat.position.y = -0.05; pelvis.add(seat);
  // band (obi)
  if (!official) {
  const obi = cyl(0.176 * B * HP, 0.176 * B * HP, 0.055, beltMat, 16, true); obi.position.y = 0.06; obi.scale.z = 0.68; pelvis.add(obi);
  const knot = box(0.07, 0.05, 0.04, beltMat); knot.position.set(0.02, 0.035, 0.125 * B); pelvis.add(knot);
  for (const [i, ang] of [[0, 0.18], [1, -0.12]]) {
    const end = box(0.045, 0.24, 0.012, beltMat); end.position.set(0.035 - i * 0.05, -0.08, 0.13 * B); end.rotation.z = ang; pelvis.add(end);
    if (i === 0 && belt.strepen) for (let s = 0; s < Math.min(belt.strepen, 5); s++) {
      const st = box(0.047, 0.012, 0.014, stripeMat); st.position.set(0, -0.09 + s * 0.022, 0); end.add(st);
    }
  }
  // aka/shiro-lint achter op de band, zoals in een echte wedstrijd
  const ribbon = box(0.05, 0.32, 0.01, ribbonMat); ribbon.position.set(0, -0.1, -0.125 * B); pelvis.add(ribbon);
  }

  // romp
  const spine = joint('spine', pelvis, 0, 0.07, 0);
  const torsoH = 0.5 * L;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * B * SH, 0.168 * B * (female ? 0.94 : 1), torsoH, 20, 1, false, Math.PI), jacket);
  torso.position.y = torsoH / 2; torso.scale.z = 0.64; torso.castShadow = true; spine.add(torso);
  const chestTop = sphere(0.2 * B * SH, cloth); chestTop.scale.set(1, 0.32, 0.64); chestTop.position.y = torsoH; spine.add(chestTop);
  const neck = cyl(female ? 0.043 : 0.056, female ? 0.048 : 0.062, 0.09, skin, 8); neck.position.y = torsoH + 0.1; spine.add(neck);
  if (female && !official) { // ronde hals van het witte T-shirt
    const tee = cyl(0.068, 0.078, 0.05, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), 12);
    tee.position.y = torsoH + 0.035; spine.add(tee);
  }
  const head = joint('head', spine, 0, torsoH + 0.09, 0);
  const skull = sphere(0.105, skin); skull.scale.set(0.95, 1.12, 1.02); skull.position.y = 0.11; head.add(skull);
  const cap = sphere(0.11, hair); cap.scale.set(0.98, female ? 1.0 : 0.95, 1.05); cap.position.set(0, female ? 0.145 : 0.15, female ? -0.016 : -0.012); head.add(cap);
  if (hairStyle === 'staart') {
    const tie = sphere(0.03, hair); tie.position.set(0, 0.17, -0.11); head.add(tie);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.17, 4, 8), hair); tail.position.set(0, 0.07, -0.135); tail.rotation.x = 0.35; tail.castShadow = true; head.add(tail);
  } else if (hairStyle === 'knot') {
    const bun = sphere(0.055, hair); bun.position.set(0, 0.2, -0.1); head.add(bun);
  }
  for (const sx of [-0.035, 0.035]) { const eye = sphere(0.012, dark, 6); eye.position.set(sx, 0.12, 0.098); head.add(eye); }
  const brow = box(0.09, female ? 0.008 : 0.014, 0.02, hair); brow.position.set(0, 0.145, 0.095); head.add(brow);

  // armen: Kyokushin-mouwen eindigen net onder de elleboog
  for (const side of ['l', 'r']) {
    const sx = side === 'l' ? 1 : -1;
    const sh = joint(side + 'Sh', spine, 0.205 * B * SH * sx, torsoH - 0.06, 0);
    const pad = sphere(0.07 * B, cloth); pad.scale.set(1, 0.85, 0.9); sh.add(pad);
    const upper = cyl(0.064 * B * (female ? 0.92 : 1.04), 0.058 * B * (female ? 0.92 : 1.04), 0.29 * L, cloth, 10); sh.add(upper);
    const el = joint(side + 'El', sh, 0, -0.29 * L, 0);
    const sleeve = cyl(0.06 * B, 0.056 * B, 0.12 * L, cloth, 10); el.add(sleeve);
    const fore = cyl(0.04 * B, 0.034 * B, 0.17 * L, official ? cloth : skin, 8); fore.position.y = -0.1 * L; el.add(fore);
    const fist = box(0.075, 0.085, 0.085, skin); fist.position.y = -0.29 * L; el.add(fist); J[side + 'Fist'] = fist;
  }
  // benen: wijde broek tot boven de enkel, blote voeten
  for (const side of ['l', 'r']) {
    const sx = side === 'l' ? 1 : -1;
    const hip = joint(side + 'Hip', pelvis, 0.095 * B * HP * sx, -0.03, 0);
    const thigh = cyl(0.09 * B, 0.078 * B, 0.44 * L, pants, 10); hip.add(thigh);
    const knee = joint(side + 'Knee', hip, 0, -0.44 * L, 0);
    const shin = cyl(0.078 * B, 0.072 * B, 0.4 * L, pants, 10); knee.add(shin);
    const ankle = cyl(0.038, 0.034, 0.05, skin, 8); ankle.position.y = -0.39 * L; knee.add(ankle);
    const foot = box(0.085, 0.05, 0.21, skin); foot.position.set(0, -0.445 * L, 0.05); knee.add(foot); J[side + 'Foot'] = foot;
  }

  group.traverse(o => { if (o.isMesh) o.castShadow = true; });

  function setPose(p) {
    root.position.y = hipH + p.root[0] * L;
    root.position.z = p.root[1];
    root.rotation.set(p.root[3], p.root[2], 0, 'YXZ');
    for (const k in J) {
      const r = p[k]; if (!r) continue;
      J[k].rotation.set(r[0], r[1], r[2]);
    }
  }

  // Wereldpositie van een lichaamsdeel (voor hit-effecten)
  const v = new THREE.Vector3();
  function partWorld(name, out = new THREE.Vector3()) { (J[name] || root).getWorldPosition(v); return out.copy(v); }

  // treffer-flits: alle materialen van deze vechter lichten kort op (wit, of oranje bij een counter)
  const mats = new Set(); group.traverse(o => { if (o.isMesh && o.material?.emissive) mats.add(o.material); });
  const flashCol = new THREE.Color(); let flashT = 0;
  function hitFlash(color = '#ffffff') { flashCol.set(color); flashT = 0.12; }
  function tickFlash(dt) {
    if (flashT <= 0) return;
    flashT = Math.max(0, flashT - dt);
    const k = flashT / 0.12 * 0.55;
    for (const m of mats) { m.emissive.copy(flashCol); m.emissiveIntensity = k; }
  }

  return { group, root, joints: J, setPose, partWorld, hitFlash, tickFlash, height: 1.8 * L, scale: L };
}
