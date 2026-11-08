// Toernooihal: tatami-wedstrijdvlak, scheidsrechter (shushin), hoekscheidsrechters
// (fukushin) met rode en witte vlaggen, jurytafel, publiek, banners en Hokori Meiyo-vlaggen.
//
// Afmetingen: wedstrijdvlak 8 x 8 m plus 1 m veiligheidszone (gangbaar bij Kyokushin;
// controleer het reglement van de eigen bond). Aka (rood) staat rechts van de
// scheidsrechter = links in beeld, shiro (wit) rechts in beeld.
import * as THREE from '../../lib/three.module.js';
import { buildFighter } from './model.js';
import { GUARD, POSES, blendPose, clonePose } from './poses.js';
import { tatamiTexture, bannerTexture, boardTexture, flagMaterial, getLogo, logoReady } from './textures.js';

export const MAT = { half: 4, safety: 1 };

const P = o => ({ ...POSES.stand, ...o });
const SIT = { root: [-0.45, 0, 0, 0], lHip: [-1.5, 0, 0.12], lKnee: [1.5, 0, 0], rHip: [-1.5, 0, -0.12], rKnee: [1.5, 0, 0] };
export const OFFICIAL_POSES = {
  refStand: P({ lSh: [0.05, 0, 0.1], rSh: [0.05, 0, -0.1] }),
  refHajime: P({ rSh: [-1.35, 0, 0.05], rEl: [-0.1, 0, 0], spine: [0.1, 0, 0] }),
  refYame: P({ rSh: [-2.7, 0, 0.05], rEl: [-0.05, 0, 0] }),
  refWazaAka: P({ rSh: [0, 0, -1.5], rEl: [0, 0, 0] }),         // arm zijwaarts naar aka
  refWazaShiro: P({ lSh: [0, 0, 1.5], lEl: [0, 0, 0] }),
  refIpponAka: P({ rSh: [0, 0, -2.4], rEl: [0, 0, 0] }),         // arm schuin omhoog
  refIpponShiro: P({ lSh: [0, 0, 2.4], lEl: [0, 0, 0] }),
  refHantei: P({ rSh: [-1.0, 0, -0.3], rEl: [-1.4, 0, 0], head: [0.1, 0, 0] }),
  refHikiwake: P({ lSh: [-1.0, 0, -0.7], lEl: [-0.2, 0, 0], rSh: [-1.0, 0, 0.7], rEl: [-0.2, 0, 0] }),
  refRei: { ...POSES.rei },
  judgeSit: P({ ...SIT, lSh: [-0.55, 0, 0.05], lEl: [-0.9, 0, 0], rSh: [-0.55, 0, -0.05], rEl: [-0.9, 0, 0] }),
  judgeAka: P({ ...SIT, rSh: [-2.85, 0, -0.15], rEl: [0, 0, 0], lSh: [-0.55, 0, 0.05], lEl: [-0.9, 0, 0] }),
  judgeShiro: P({ ...SIT, lSh: [-2.85, 0, 0.15], lEl: [0, 0, 0], rSh: [-0.55, 0, -0.05], rEl: [-0.9, 0, 0] }),
  judgeDraw: P({ ...SIT, lSh: [-0.75, 0, -0.75], lEl: [-0.1, 0, 0], rSh: [-0.75, 0, 0.75], rEl: [-0.1, 0, 0] }),
};

class Official {
  constructor(scene, data, x, z, faceYaw, poseName) {
    this.m = buildFighter(data, 'aka', { official: true });
    this.m.group.position.set(x, 0, z); this.m.group.rotation.y = faceYaw; scene.add(this.m.group);
    this.cur = clonePose(OFFICIAL_POSES[poseName]); this.from = clonePose(this.cur); this.to = OFFICIAL_POSES[poseName]; this.t = 1;
    this.m.setPose(this.cur);
  }
  pose(name, speed = 6) { if (this.to === OFFICIAL_POSES[name]) return; this.from = clonePose(this.cur); this.to = OFFICIAL_POSES[name]; this.t = 0; this.speed = speed; }
  update(dt) {
    if (this.t < 1) { this.t = Math.min(1, this.t + dt * this.speed); blendPose(this.from, this.to, 1 - Math.pow(1 - this.t, 3), this.cur); this.m.setPose(this.cur); }
  }
}

function addFlag(fist, color) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), new THREE.MeshStandardMaterial({ color: '#8a6a3a' }));
  pole.position.y = -0.2; pole.rotation.x = Math.PI; fist.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), flagMaterial(color));
  cloth.position.set(0, -0.08, 0.16); cloth.rotation.y = Math.PI / 2; pole.add(cloth);
}

export function createArena(scene, renderer) {
  const S = MAT.half + MAT.safety;
  // ── Hal ──
  scene.background = new THREE.Color('#0b0b10');
  scene.fog = new THREE.Fog('#0b0b10', 16, 42);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#17151a', roughness: 1 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), wallMat); back.position.set(0, 7, -15); scene.add(back);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallMat); w.position.set(sx * 16, 7, 0); w.rotation.y = -sx * Math.PI / 2; scene.add(w); }

  // ── Tatami: matten van 1 x 2 m in wisselend verband, rode veiligheidszone ──
  const matGroup = new THREE.Group(); scene.add(matGroup);
  const tA = tatamiTexture('#d2c48f', '#2f5d2c'), tB = tatamiTexture('#c7b880', '#2f5d2c'), tR = tatamiTexture('#9e1b22', '#5a0d12');
  const mA = new THREE.MeshStandardMaterial({ map: tA, roughness: 0.85 }), mB = new THREE.MeshStandardMaterial({ map: tB, roughness: 0.85 }), mR = new THREE.MeshStandardMaterial({ map: tR, roughness: 0.85 });
  const tile = new THREE.BoxGeometry(1, 0.05, 2);
  for (let ix = -S; ix < S; ix++) for (let iz = -S; iz < S; iz += 2) {
    const inner = Math.abs(ix + 0.5) < MAT.half && Math.abs(iz + 1) < MAT.half;
    const alt = ((ix + iz / 2) & 1) === 0;
    const m = new THREE.Mesh(tile, inner ? (alt ? mA : mB) : mR);
    m.position.set(ix + 0.5, 0.025, iz + 1); m.receiveShadow = true; matGroup.add(m);
  }
  // startlijnen (aka/shiro) en scheidsrechterslijn
  const lineMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  for (const [x, c] of [[-1.5, '#c8102e'], [1.5, '#ffffff']]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.6), lineMat(c)); l.position.set(x, 0.052, 0); scene.add(l); }
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, 0.06), lineMat('#ffffff')); rl.position.set(0, 0.052, -1.4); scene.add(rl);

  // ── Boarding met logo rond de mat ──
  const bt = boardTexture();
  const boardMat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.6, emissive: '#ffffff', emissiveMap: bt, emissiveIntensity: 0.25 });
  for (const [x, z, ry, len] of [[0, -S - 1.6, 0, 2 * S + 3], [-S - 1.6, 0, Math.PI / 2, 2 * S + 3], [S + 1.6, 0, -Math.PI / 2, 2 * S + 3]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.7, 0.08), boardMat); b.position.set(x, 0.35, z); b.rotation.y = ry; b.castShadow = true; scene.add(b);
  }

  // ── Jurytafel (kansa / tijdwaarneming) ──
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.8), new THREE.MeshStandardMaterial({ color: '#1a1a1e' }));
  table.position.set(0, 0.375, -S - 2.6); scene.add(table);
  const tableFront = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.6), new THREE.MeshStandardMaterial({ map: bannerTexture('kanji'), roughness: 0.7 }));
  tableFront.position.set(0, 0.4, -S - 2.19); scene.add(tableFront);
  tableFront.material.map.repeat.set(1, 0.3); tableFront.material.map.offset.set(0, 0.35);

  // ── Banners aan de achterwand en zijwanden ──
  const kinds = ['logo', 'kanji', 'osu', 'logo', 'osu', 'kanji', 'logo'];
  kinds.forEach((k, i) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.8), new THREE.MeshStandardMaterial({ map: bannerTexture(k), roughness: 0.85, side: THREE.DoubleSide }));
    b.position.set((i - 3) * 4.2, 8.2, -14.9); scene.add(b);
  });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4), new THREE.MeshStandardMaterial({ map: bannerTexture(i === 1 ? 'kanji' : 'logo'), roughness: 0.85 }));
    b.position.set(sx * 15.9, 8, -8 + i * 6); b.rotation.y = -sx * Math.PI / 2; scene.add(b);
  }
  // groot logo boven de hal
  const bigLogoMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });
  const bigLogo = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), bigLogoMat); bigLogo.position.set(0, 11.4, -14.8); scene.add(bigLogo);
  logoReady.then(() => { const lg = getLogo(); if (lg) { const t = new THREE.Texture(lg); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; bigLogoMat.map = t; bigLogoMat.needsUpdate = true; } });

  // ── Wapperende Hokori Meiyo-vlaggen op masten ──
  const flags = [];
  const flagTex = bannerTexture('logo');
  for (const x of [-7.5, -5.5, 5.5, 7.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 4.5, 8), new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.6, roughness: 0.4 }));
    pole.position.set(x, 2.25, -S - 3.2); scene.add(pole);
    const geo = new THREE.PlaneGeometry(1.6, 1.0, 16, 4); geo.translate(0.8, 0, 0);
    const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }));
    f.position.set(x + 0.03, 3.9, -S - 3.2); scene.add(f);
    flags.push({ mesh: f, base: geo.attributes.position.array.slice(), phase: Math.random() * 6 });
  }

  // ── Publiek op tribunes (instanced) ──
  const crowdGeo = new THREE.CapsuleGeometry(0.19, 0.34, 3, 8); crowdGeo.translate(0, 0.36, 0);
  const headGeo = new THREE.SphereGeometry(0.11, 10, 8); headGeo.translate(0, 0.78, 0);
  const crowdMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const seats = [];
  const tier = (x0, x1, z, rows, dir, side) => {
    for (let r = 0; r < rows; r++) for (let x = x0; x <= x1; x += 0.62) {
      if (Math.random() < 0.12) continue;
      const jitter = (Math.random() - 0.5) * 0.2;
      const pos = side ? new THREE.Vector3(z + dir * r * 0.9, 0.55 * r + 0.4, x + jitter) : new THREE.Vector3(x + jitter, 0.55 * r + 0.4, z + dir * r * 0.9);
      seats.push({ pos, ph: Math.random() * 6, amp: 0.02 + Math.random() * 0.04 });
    }
  };
  tier(-12, 12, -S - 4.5, 7, -1, false);
  tier(-9, 6, -S - 4, 6, -1, true); tier(-9, 6, S + 4, 6, 1, true);
  const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, seats.length);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), seats.length);
  const skins = ['#e0b896', '#c6936b', '#8d5a3b', '#5b3a25', '#f0cfb0', '#a9744f'];
  const shirt = ['#f4f1ea', '#b1101f', '#1d1d22', '#2f63c9', '#d9a441', '#5a5a64', '#e8e2d2', '#7b1820'];
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  seats.forEach((s, i) => { m4.makeTranslation(s.pos.x, s.pos.y, s.pos.z); crowd.setMatrixAt(i, m4); crowd.setColorAt(i, col.set(shirt[(Math.random() * shirt.length) | 0]).multiplyScalar(0.3 + Math.random() * 0.35)); heads.setMatrixAt(i, m4); heads.setColorAt(i, col.set(skins[(Math.random() * skins.length) | 0]).multiplyScalar(0.55)); });
  scene.add(crowd, heads);
  const stepMat = new THREE.MeshStandardMaterial({ color: '#1c1a1f', roughness: 1 });
  for (let r = 0; r < 7; r++) { const st = new THREE.Mesh(new THREE.BoxGeometry(26, 0.55 * r + 0.4, 0.9), stepMat); st.position.set(0, (0.55 * r + 0.4) / 2, -S - 4.5 - r * 0.9); scene.add(st); }
  let crowdHype = 0;

  // ── Licht ──
  scene.add(new THREE.HemisphereLight('#c9d3ff', '#2a1d14', 0.55));
  const key = new THREE.DirectionalLight('#fff3df', 2.4);
  key.position.set(3, 12, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; scene.add(key);
  const rim = new THREE.DirectionalLight('#9fb6ff', 0.9); rim.position.set(-6, 6, -8); scene.add(rim);
  const warm = new THREE.PointLight('#ffb36b', 25, 30); warm.position.set(0, 9, -12); scene.add(warm);

  // ── Officials ──
  const refData = { naam: 'Shushin', uiterlijk: { lengte: 1.0, bouw: 1.05, haar: '#55504a' } };
  const ref = new Official(scene, refData, 0, -1.7, 0, 'refStand');
  const judges = [
    new Official(scene, { naam: 'Fukushin 1', uiterlijk: { lengte: 0.98, haar: '#1b1410' } }, -S - 0.5, -S + 0.6, Math.PI * 0.25, 'judgeSit'),
    new Official(scene, { naam: 'Fukushin 2', uiterlijk: { lengte: 1.02, haar: '#3a2a1a' } }, S + 0.5, -S + 0.6, -Math.PI * 0.25, 'judgeSit'),
  ];
  const chairMat = new THREE.MeshStandardMaterial({ color: '#202024' });
  for (const j of judges) {
    addFlag(j.m.joints.rFist, '#c8102e'); addFlag(j.m.joints.lFist, '#ffffff');
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.5), chairMat); chair.position.copy(j.m.group.position); chair.position.y = 0.23;
    chair.rotation.y = j.m.group.rotation.y; scene.add(chair);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), chairMat); backrest.position.set(0, 0.5, -0.25); chair.add(backrest);
  }

  function update(dt, t) {
    ref.update(dt); judges.forEach(j => j.update(dt));
    for (const f of flags) {
      const arr = f.mesh.geometry.attributes.position.array, b = f.base;
      for (let i = 0; i < arr.length; i += 3) { const x = b[i]; arr[i + 2] = Math.sin(t * 3 + x * 3 + f.phase) * 0.08 * x; }
      f.mesh.geometry.attributes.position.needsUpdate = true;
    }
    crowdHype = Math.max(0, crowdHype - dt * 0.6);
    const hype = 1 + crowdHype * 4;
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      m4.makeTranslation(s.pos.x, s.pos.y + Math.max(0, Math.sin(t * (2 + crowdHype * 6) + s.ph)) * s.amp * hype, s.pos.z);
      crowd.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
    }
    crowd.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  }

  return {
    update, ref, judges, bounds: MAT.half + 0.6,
    cheer(v = 1) { crowdHype = Math.min(1.5, crowdHype + v); },
    flags(votes) { judges.forEach((j, i) => j.pose(votes ? (votes[i] === 'aka' ? 'judgeAka' : votes[i] === 'shiro' ? 'judgeShiro' : 'judgeDraw') : 'judgeSit')); },
  };
}
