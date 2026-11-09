// Realistisch hoofd: 3D-scan "Infinite, 3D Head Scan" van Lee Perry-Smith (CC BY 3.0,
// assets/models/head/LeePerrySmith_License.txt), via de Three.js-voorbeelden.
// We knippen de schouders van de scan af, schalen naar meters en maken per vechter:
//  - huidskleur via een tint op de scantextuur
//  - een vrouwelijke variant (smaller gezicht en kaak)
//  - haar dat de vorm van de schedel volgt (kort, staart of knot)
import * as THREE from '../../lib/three.module.js';
import { GLTFLoader } from '../../lib/three-addons.js';

const BASE = 'assets/models/head/';
const UNIT = 0.054;          // scan-eenheid → meter (kruin-kin ≈ 0,23 m)
const NECK_CUT = -1.45;      // alles onder deze hoogte (schouders) eraf
const ANCHOR = -1.05;        // dit punt van de hals komt op het nekgewricht
const REF_SKIN = new THREE.Color('#dcae92'); // gemiddelde huid van de scantextuur

let geo = null, geoF = null, hairGeo = null, hairGeoF = null, maps = null;
export const headReady = (async () => {
  try {
    const tl = new THREE.TextureLoader();
    const [gltf, map, normal] = await Promise.all([
      new GLTFLoader().loadAsync(BASE + 'LeePerrySmith.glb'),
      tl.loadAsync(BASE + 'Map-COL.jpg'),
      tl.loadAsync(BASE + 'Infinite-Level_02_Tangent_SmoothUV.jpg'),
    ]);
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    maps = { map, normal };
    const src = gltf.scene.getObjectByProperty('isMesh', true).geometry;
    geo = crop(src, (y) => y > NECK_CUT);
    geo.translate(0, -ANCHOR, 0); geo.scale(UNIT, UNIT, UNIT); geo.computeBoundingSphere();
    // haar: de schedel boven de haarlijn (voor hoger dan achter), iets naar buiten geduwd
    hairGeo = crop(src, (y, z) => y > (z > 1.2 ? 2.55 : z > 0 ? 1.7 : 0.55), 0.16);
    hairGeo.translate(0, -ANCHOR, 0); hairGeo.scale(UNIT, UNIT, UNIT);
    // vrouwelijke variant: smallere kaak en gezicht, voller haar tot in de nek
    geoF = geo.clone(); feminize(geoF);
    hairGeoF = crop(src, (y, z) => y > (z > 1.4 ? 2.45 : z > 0.2 ? 0.9 : -1.0), 0.26);
    hairGeoF.translate(0, -ANCHOR, 0); hairGeoF.scale(UNIT, UNIT, UNIT); feminize(hairGeoF);
    return true;
  } catch (e) { console.warn('hoofdscan niet geladen', e); return false; }
})();
export const headLoaded = () => !!geo;

// Houdt alleen driehoeken waarvan alle hoekpunten aan de voorwaarde voldoen.
function crop(src, keep, shell = 0) {
  const pos = src.attributes.position, idx = src.index.array, out = [];
  for (let i = 0; i < idx.length; i += 3) {
    let ok = true;
    for (let k = 0; k < 3; k++) { const v = idx[i + k]; if (!keep(pos.getY(v), pos.getZ(v))) { ok = false; break; } }
    if (ok) out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  const g = new THREE.BufferGeometry();
  const p = pos.array.slice(), n = src.attributes.normal.array;
  if (shell) for (let i = 0; i < p.length; i += 3) { const s = shell; p[i] += n[i] * s; p[i + 1] += n[i + 1] * s; p[i + 2] += n[i + 2] * s; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', src.attributes.normal.clone());
  if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone());
  g.setIndex(out);
  return g;
}

// Smaller gezicht: onderste deel (kaak, kin) smaller dan de schedel.
function feminize(g) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / UNIT + ANCHOR; // terug naar scanhoogte
    const k = y < 1.0 ? 0.86 : y < 2.2 ? 0.86 + (y - 1.0) / 1.2 * 0.07 : 0.93;
    p.setX(i, p.getX(i) * k); if (y < 1.0) p.setZ(i, p.getZ(i) * 0.96);
  }
  p.needsUpdate = true; g.computeVertexNormals();
}

// Hoofd (met haar) voor één vechter. Geeft null als de scan (nog) niet geladen is.
export function makeHead({ skin = '#c3946c', hair = '#24180f', kapsel = 'kort', female = false, scale = 1 } = {}) {
  if (!geo) return null;
  const g = new THREE.Group();
  const tint = new THREE.Color(skin);
  const c = new THREE.Color(Math.min(1.15, tint.r / REF_SKIN.r), Math.min(1.15, tint.g / REF_SKIN.g), Math.min(1.15, tint.b / REF_SKIN.b));
  const mat = new THREE.MeshPhysicalMaterial({ map: maps.map, normalMap: maps.normal, normalScale: new THREE.Vector2(0.6, 0.6), color: c, roughness: 0.52, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffd2b8') });
  const head = new THREE.Mesh(female ? geoF : geo, mat); head.castShadow = true;
  const s = 0.94 + (scale - 1) * 0.5;
  head.scale.set(s, s * (female ? 0.97 : 1), s * (female ? 0.96 : 1));
  g.add(head);
  if (kapsel !== 'kaal') {
    const hm = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85, metalness: 0.0 });
    const cap = new THREE.Mesh(female && kapsel !== 'kort' ? hairGeoF : hairGeo, hm); cap.castShadow = true; cap.scale.copy(head.scale);
    g.add(cap);
    const top = (3.97 - ANCHOR) * UNIT * head.scale.y; // kruin boven het nekgewricht
    if (kapsel === 'staart') {
      const tie = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), hm); tie.position.set(0, top - 0.06, -0.11); g.add(tie);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.2, 4, 10), hm); tail.position.set(0, top - 0.17, -0.135); tail.rotation.x = 0.3; tail.castShadow = true; g.add(tail);
    } else if (kapsel === 'knot') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), hm); bun.scale.set(1, 0.85, 1); bun.position.set(0, top - 0.035, -0.1); bun.castShadow = true; g.add(bun);
    }
  }
  return g;
}
