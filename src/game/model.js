// Vechter: skelet met gewrichten en een realistische Kyokushin-dogi.
//  - hoofd: 3D-scan (head.js) met huidskleur, vrouwelijke variant en haar dat de schedel volgt
//  - jas: gevormde romp (lathe) met kanji 極真 en Hokori Meiyo-badge, kraag en revers als
//    aparte band, wijde mouwen tot net onder de elleboog, jasrok onder de band
//  - broek: wijde pijpen tot boven de enkel; blote handen (vuist met duim) en voeten
//  - stof: fysiek materiaal met weefsel/plooien (normal map) en glans (sheen)
// De gewrichten en hun posities zijn dezelfde als voorheen: poses, raakdetectie en kalibratie
// blijven kloppen. Valt de hoofdscan weg, dan komt er een eenvoudig hoofd.
import * as THREE from '../../lib/three.module.js';
import { dogiTexture, fabricNormal } from './textures.js';
import { beltOf } from '../data/roster.js';
import { makeHead, headReady } from './head.js';

const DOGI = new THREE.Color('#e9e5dc');
const dogiTexCache = {};

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };

// Omwentelingsvorm die omlaag hangt vanaf het gewricht: profiel [[straal, diepte], ...]
function lathe(profile, mat, seg = 18, zScale = 1) {
  const pts = profile.map(([r, d]) => new THREE.Vector2(Math.max(0.001, r), -d)).reverse();
  const g = new THREE.LatheGeometry(pts, seg, Math.PI, Math.PI * 2);
  if (zScale !== 1) g.scale(1, 1, zScale);
  g.computeVertexNormals();
  return shadow(new THREE.Mesh(g, mat));
}
function cone(rTop, rBot, h, mat, seg = 16, open = true) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 3, open);
  g.translate(0, -h / 2, 0);
  return shadow(new THREE.Mesh(g, mat));
}
function blob(rx, ry, rz, mat, seg = 16) { const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg * 0.7 | 0), mat)); m.scale.set(rx, ry, rz); return m; }
function box(w, h, d, mat) { return shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), mat)); }

// Vuist: handpalm, opgerolde vingers met knokkels, duim
function makeFist(mat, side) {
  const g = new THREE.Group();
  const palm = blob(0.036, 0.046, 0.042, mat); g.add(palm);
  const fingers = blob(0.034, 0.03, 0.03, mat); fingers.position.set(0, -0.03, 0.02); g.add(fingers);
  for (let i = 0; i < 4; i++) { const k = blob(0.011, 0.011, 0.012, mat, 8); k.position.set(-0.024 + i * 0.016, -0.022, 0.044); g.add(k); }
  const thumb = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.03, 3, 8), mat)); thumb.position.set(side * 0.026, -0.02, 0.03); thumb.rotation.set(1.2, 0, side * 0.6); g.add(thumb);
  return g;
}
// Blote voet: middenvoet, hiel, tenen
function makeFoot(mat) {
  const g = new THREE.Group();
  const mid = blob(0.042, 0.03, 0.1, mat); mid.position.set(0, 0, 0.03); g.add(mid);
  const heel = blob(0.036, 0.034, 0.04, mat); heel.position.set(0, 0.005, -0.045); g.add(heel);
  const toes = blob(0.04, 0.017, 0.03, mat); toes.position.set(0, -0.012, 0.12); g.add(toes);
  return g;
}

export function buildFighter(data, corner = 'aka', costume = {}) {
  const look = data.uiterlijk || {};
  const L = look.lengte || 1, B = look.bouw || 1;
  // Geslacht: vrouwen smallere schouders, iets bredere heupen, lang haar (staart of knot)
  // en een wit T-shirt onder de dogi (zoals gebruikelijk in Kyokushin); mannen bredere schouders.
  const female = data.geslacht === 'v';
  const SH = female ? 0.88 : 1.06, HP = female ? 1.08 : 1.0;
  const hairStyle = look.kapsel || (female ? (hash(data.id || data.naam) % 2 ? 'staart' : 'knot') : 'kort');
  const variant = costume.dogi || 'wit';
  const official = !!costume.official; // scheidsrechter: wit shirt, donkere broek, geen band
  const skinCol = look.huid || '#c3946c';

  const fabric = fabricNormal();
  const clothCol = variant === 'zwart' ? new THREE.Color('#1b1b1d') : DOGI;
  const cloth = new THREE.MeshPhysicalMaterial({ color: clothCol, roughness: 0.92, normalMap: fabric, normalScale: new THREE.Vector2(0.7, 0.7), sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff4e6'), side: THREE.DoubleSide });
  const jacketTex = dogiTexCache[variant] || (dogiTexCache[variant] = dogiTexture({ variant }));
  const jacket = official ? cloth : new THREE.MeshPhysicalMaterial({ map: jacketTex, color: '#f0ece4', roughness: 0.92, normalMap: fabric, normalScale: new THREE.Vector2(0.8, 0.8), sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff4e6') });
  const collar = new THREE.MeshPhysicalMaterial({ color: clothCol.clone().multiplyScalar(0.94), roughness: 0.85, normalMap: fabric, normalScale: new THREE.Vector2(0.8, 0.8), sheen: 0.5 });
  const pants = official ? new THREE.MeshPhysicalMaterial({ color: '#1d2433', roughness: 0.75, normalMap: fabric, normalScale: new THREE.Vector2(0.4, 0.4), sheen: 0.3, side: THREE.DoubleSide }) : cloth;
  // huid van armen en voeten afgestemd op de gescande gezichtshuid (iets lichter en roziger dan de kale kleur)
  const skinBody = new THREE.Color(skinCol).lerp(new THREE.Color('#d9a68c'), 0.12);
  const skin = new THREE.MeshPhysicalMaterial({ color: skinBody, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffd2b8') });
  const tee = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.85, normalMap: fabric, normalScale: new THREE.Vector2(0.3, 0.3) });
  const belt = beltOf(costume.graad || data.graad);
  const beltMat = new THREE.MeshPhysicalMaterial({ color: belt.kleur, roughness: 0.75, sheen: 0.4, normalMap: fabric, normalScale: new THREE.Vector2(0.5, 0.5) });
  const stripeMat = new THREE.MeshStandardMaterial({ color: belt.streep || '#d9a441', roughness: 0.45, metalness: 0.35 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: corner === 'aka' ? '#c8102e' : '#ffffff', roughness: 0.8 });

  const group = new THREE.Group();
  const root = new THREE.Group(); group.add(root);
  const J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };

  const hipH = 0.93 * L;
  root.position.y = hipH;
  const pelvis = joint('pelvis', root, 0, 0, 0);
  // jasrok onder de band (wijd uitlopend) en broekzitvlak
  const skirt = lathe([[0.168 * B * HP, -0.06], [0.178 * B * HP, 0.06], [0.198 * B * HP, 0.2 * L]], official ? cloth : cloth, 22, 0.68);
  skirt.position.y = 0.0; pelvis.add(skirt);
  const seat = blob(0.155 * B * HP, 0.11, 0.115, pants); seat.position.y = -0.05; pelvis.add(seat);
  if (!official) {
    // band (obi): twee keer om het middel, knoop met twee hangende uiteinden
    const obi = cone(0.178 * B * HP, 0.18 * B * HP, 0.055, beltMat, 24, true); obi.position.y = 0.088; obi.scale.z = 0.69; pelvis.add(obi);
    const obi2 = cone(0.181 * B * HP, 0.183 * B * HP, 0.02, beltMat, 24, true); obi2.position.y = 0.06; obi2.scale.z = 0.7; pelvis.add(obi2);
    const knot = blob(0.04, 0.03, 0.022, beltMat); knot.position.set(0.02, 0.06, 0.128 * B); pelvis.add(knot);
    for (const [i, ang] of [[0, 0.22], [1, -0.14]]) {
      const end = box(0.046, 0.25, 0.01, beltMat); end.position.set(0.04 - i * 0.055, -0.07, 0.135 * B); end.rotation.set(-0.08, 0, ang); pelvis.add(end);
      if (i === 0 && belt.strepen) for (let s = 0; s < Math.min(belt.strepen, 5); s++) {
        const st = box(0.048, 0.012, 0.013, stripeMat); st.position.set(0, -0.09 + s * 0.022, 0); end.add(st);
      }
    }
    // aka/shiro-lint achter op de band, zoals in een echte wedstrijd
    const ribbon = box(0.05, 0.32, 0.008, ribbonMat); ribbon.position.set(0, -0.09, -0.128 * B); pelvis.add(ribbon);
  }

  // romp: gevormde jas (borst breder dan middel), kraag en revers
  const spine = joint('spine', pelvis, 0, 0.07, 0);
  const torsoH = 0.5 * L, sw = 0.2 * B * SH;
  const prof = [[0.166 * B * (female ? 0.94 : 1), 0], [0.172 * B, 0.1 * L], [sw * 0.93, 0.25 * L], [sw, 0.37 * L], [sw * 1.01, 0.43 * L], [sw * 0.9, 0.48 * L], [0.1, 0.52 * L], [0.055, 0.535 * L], [0.001, 0.54 * L]];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28, Math.PI, Math.PI * 2), jacket);
  torso.geometry.scale(1, 1, 0.64); torso.geometry.computeVertexNormals(); shadow(torso); spine.add(torso);
  // revers: band van rechts-boven (nek) schuin naar links-onder (de linkerpand ligt over de rechter)
  const rAt = y => { // straal van de romp op hoogte y (lineair tussen de profielpunten)
    for (let i = 0; i < prof.length - 1; i++) if (y <= prof[i + 1][1]) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
    return prof[prof.length - 1][0];
  };
  const onSurf = (x, y, out = 0.008) => { const r = rAt(y); return new THREE.Vector3(x, y, 0.64 * Math.sqrt(Math.max(0.0004, r * r - x * x)) + out); };
  const lapelPts = [[-0.07, 0.5], [-0.05, 0.4], [0, 0.29], [0.06, 0.17], [0.11, 0.04]].map(([x, y]) => onSurf(x * B, y * L, 0.002));
  const lapel = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lapelPts), 24, 0.013, 6), collar); lapel.scale.set(1, 1, 0.985); lapel.scale.set(1, 1, 1); shadow(lapel); spine.add(lapel);
  const innerPts = [[0.07, 0.5], [0.045, 0.4], [0.01, 0.31]].map(([x, y]) => onSurf(x * B, y * L, 0.0));
  spine.add(shadow(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerPts), 10, 0.014, 6), collar)));
  // kraag om de nek
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.068 * B, 0.014, 8, 28, Math.PI * 1.3), collar);
  collarRing.rotation.set(Math.PI / 2, 0, Math.PI * 0.35 + Math.PI); collarRing.position.set(0, torsoH + 0.035, -0.006); collarRing.scale.set(1.05, 0.9, 1); shadow(collarRing); spine.add(collarRing);
  // in de V van de jas: borst (man) of wit T-shirt (vrouw)
  const vMat = female && !official ? tee : official ? cloth : skin;
  const vPatch = blob(0.05 * B, 0.075, 0.012, vMat); vPatch.position.copy(onSurf(-0.01, 0.45 * L, -0.006)); vPatch.rotation.x = -0.35; spine.add(vPatch);
  const neck = cone(female ? 0.045 : 0.055, female ? 0.05 : 0.06, 0.09, skin, 14, false); neck.position.y = torsoH + 0.07; spine.add(neck); // alleen bij het reservehoofd
  if (female && !official) { const t = cone(0.07, 0.08, 0.05, tee, 18, true); t.position.y = torsoH + 0.035; spine.add(t); }

  const head = joint('head', spine, 0, torsoH + 0.09, 0);
  const headOpts = { skin: skinCol, hair: look.haar || '#24180f', kapsel: hairStyle, female, scale: L };
  const scan = makeHead(headOpts);
  if (scan) { head.add(scan); neck.visible = false; } // de scan heeft zelf een hals
  else { // reserve tot de scan binnen is (bijvoorbeeld de officials, die al bij het opstarten gebouwd worden)
    const tmp = new THREE.Group();
    const skull = blob(0.1, 0.118, 0.107, skin); skull.position.y = 0.11; tmp.add(skull);
    const cap = blob(0.108, 0.1, 0.115, new THREE.MeshStandardMaterial({ color: look.haar || '#24180f', roughness: 0.9 })); cap.position.set(0, 0.15, -0.012); tmp.add(cap);
    head.add(tmp);
    headReady.then(ok => { const real = ok && makeHead(headOpts); if (real) { head.remove(tmp); head.add(real); neck.visible = false; } });
  }

  // armen: schouder, bovenarm in wijde mouw, mouw tot net onder de elleboog, blote onderarm en vuist
  for (const side of ['l', 'r']) {
    const sx = side === 'l' ? 1 : -1;
    const sh = joint(side + 'Sh', spine, 0.205 * B * SH * sx, torsoH - 0.06, 0);
    const pad = blob(0.074 * B, 0.07, 0.068, cloth); sh.add(pad);
    const aw = female ? 0.92 : 1.04;
    const upper = lathe([[0.07 * B * aw, -0.02], [0.074 * B * aw, 0.12 * L], [0.072 * B * aw, 0.3 * L]], cloth, 16); sh.add(upper);
    const el = joint(side + 'El', sh, 0, -0.29 * L, 0);
    const sleeve = lathe([[0.07 * B * aw, -0.02], [0.078 * B, 0.08 * L], [0.084 * B, 0.13 * L]], cloth, 16); el.add(sleeve);
    const foreMat = official ? cloth : skin;
    const fore = lathe([[0.042 * B * aw, 0.02], [0.044 * B * aw, 0.08 * L], [0.036 * B * aw, 0.2 * L], [0.03 * B, 0.26 * L]], foreMat, 12); el.add(fore);
    const elbow = blob(0.045, 0.045, 0.045, cloth); el.add(elbow);
    const fist = makeFist(skin, sx); fist.position.y = -0.29 * L; el.add(fist); J[side + 'Fist'] = fist;
  }
  // benen: wijde broek tot boven de enkel, blote voeten
  for (const side of ['l', 'r']) {
    const sx = side === 'l' ? 1 : -1;
    const hip = joint(side + 'Hip', pelvis, 0.095 * B * HP * sx, -0.03, 0);
    const thigh = lathe([[0.1 * B, -0.03], [0.096 * B, 0.15 * L], [0.088 * B, 0.44 * L]], pants, 16); hip.add(thigh);
    const knee = joint(side + 'Knee', hip, 0, -0.44 * L, 0);
    const kneeCap = blob(0.08 * B, 0.07, 0.08, pants); knee.add(kneeCap);
    const shin = lathe([[0.086 * B, -0.02], [0.088 * B, 0.2 * L], [0.095 * B, 0.37 * L]], pants, 16); knee.add(shin);
    const ankle = cone(0.04, 0.036, 0.07, skin, 10, false); ankle.position.y = -0.36 * L; knee.add(ankle);
    const foot = makeFoot(skin); foot.position.set(0, -0.445 * L, 0.03); knee.add(foot); J[side + 'Foot'] = foot;
  }

  function setPose(p) {
    root.position.y = hipH + p.root[0] * L;
    root.position.z = p.root[1];
    root.rotation.set(p.root[3], p.root[2], 0, 'YXZ');
    for (const k in J) {
      const r = p[k]; if (!r) continue;
      J[k].rotation.set(r[0], r[1], r[2]);
    }
  }

  // Wereldpositie van een lichaamsdeel (voor raakdetectie en effecten)
  const v = new THREE.Vector3();
  function partWorld(name, out = new THREE.Vector3()) { (J[name] || root).getWorldPosition(v); return out.copy(v); }

  // treffer-flits: alle materialen van deze vechter lichten kort op (wit, of oranje bij een counter)
  const mats = new Set(); group.traverse(o => { if (o.isMesh && o.material?.emissive) mats.add(o.material); });
  const flashCol = new THREE.Color(); let flashT = 0;
  function hitFlash(color = '#ffffff') { flashCol.set(color); flashT = 0.12; }
  function tickFlash(dt) {
    if (flashT <= 0) return;
    flashT = Math.max(0, flashT - dt);
    const k = flashT / 0.12 * 0.5;
    for (const m of mats) { m.emissive.copy(flashCol); m.emissiveIntensity = k; }
  }

  return { group, root, joints: J, setPose, partWorld, hitFlash, tickFlash, height: 1.8 * L, scale: L };
}
