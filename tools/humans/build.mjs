// Bouwt de realistische vechters met Blender + MPFB: node tools/humans/build.mjs [id ...]
// Leest de roster, zet die om naar MakeHuman-instellingen en roept Blender aan per vechter.
// Uitvoer: assets/humans/<id>.gltf + .bin, gedeelde textures in assets/humans/tex/, index.json.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { ROSTER } from '../../src/data/roster.js';
import { beltOf } from '../../src/data/roster.js';

const OUT = new URL('../../assets/humans/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MALE_HAIR = ['short02.mhclo', 'short01.mhclo', 'short04.mhclo'];
const BROWS_M = ['eyebrow001.mhclo', 'eyebrow002.mhclo', 'eyebrow005.mhclo', 'eyebrow007.mhclo', 'eyebrow009.mhclo'];
const BROWS_F = ['eyebrow003.mhclo', 'eyebrow004.mhclo', 'eyebrow006.mhclo', 'eyebrow010.mhclo'];

// Speciale modellen: de eigen campaign-vechter (per geslacht/kapsel) en de scheidsrechter.
const EXTRA = [
  { id: 'speler_m_kort', naam: 'speler', geslacht: 'm', uiterlijk: { lengte: 1, bouw: 0.95, kapsel: 'kort' }, stats: { kracht: 5, conditie: 5 } },
  { id: 'speler_v_staart', naam: 'speler', geslacht: 'v', uiterlijk: { lengte: 0.95, bouw: 0.92, kapsel: 'staart' }, stats: { kracht: 5, conditie: 5 } },
  { id: 'speler_v_knot', naam: 'speler', geslacht: 'v', uiterlijk: { lengte: 0.95, bouw: 0.92, kapsel: 'knot' }, stats: { kracht: 5, conditie: 5 } },
  { id: 'speler_v_kort', naam: 'speler', geslacht: 'v', uiterlijk: { lengte: 0.95, bouw: 0.92, kapsel: 'kort' }, stats: { kracht: 5, conditie: 5 } },
  { id: 'official_m', naam: 'scheidsrechter', geslacht: 'm', outfit: 'official', uiterlijk: { lengte: 1.0, bouw: 1.05, mhHaar: 'short01.mhclo' }, stats: { kracht: 6, conditie: 6 } },
  { id: 'official_v', naam: 'hoekscheidsrechter', geslacht: 'v', outfit: 'official', uiterlijk: { lengte: 0.97, bouw: 1.0, kapsel: 'staart' }, stats: { kracht: 6, conditie: 6 } },
];

export function specOf(f) {
  const male = f.geslacht !== 'v', L = f.uiterlijk?.lengte || 1, B = f.uiterlijk?.bouw || 1, st = f.stats || {};
  const kapsel = f.uiterlijk?.kapsel || (male ? 'kort' : (hash(f.id || f.naam) % 2 ? 'staart' : 'knot'));
  const hair = f.uiterlijk?.mhHaar || (male ? MALE_HAIR[hash(f.id) % MALE_HAIR.length] : { staart: 'ponytail01.mhclo', knot: 'ponytail01.mhclo', kort: 'short02.mhclo' }[kapsel]);
  return {
    id: f.id, geslacht: male ? 'm' : 'v',
    race: 'caucasian',                         // basistextuur; de huidtint komt uit roster.uiterlijk.huid
    raceBlend: true,                           // gezichtsvorm neutraal (gemengd)
    height: clamp(0.5 + (L - (male ? 1 : 0.95)) * 2.4, 0.08, 0.92),
    muscle: clamp(0.55 + ((st.kracht ?? 6) - 6) * 0.045 + ((st.conditie ?? 7) - 7) * 0.02, 0.35, 0.85),
    weight: clamp(0.5 + (B - 1) * 1.6, 0.25, 0.8),
    proportions: 0.7, cupsize: 0.4,
    hair, eyebrows: (male ? BROWS_M : BROWS_F)[hash(f.id + 'b') % (male ? BROWS_M.length : BROWS_F.length)],
    belt_rgb: [0.9, 0.9, 0.9], outfit: f.outfit || 'gi', age: f.outfit === 'official' ? 0.72 : 0.5,
  };
}

const want = process.argv.slice(2);
const list = [...ROSTER, ...EXTRA].filter(f => !want.length || want.includes(f.id));
const index = existsSync(OUT + 'index.json') ? JSON.parse(readFileSync(OUT + 'index.json', 'utf8')) : {};
for (const f of list) {
  const spec = specOf(f), tmp = `/tmp/mh-spec-${f.id}.json`;
  writeFileSync(tmp, JSON.stringify(spec));
  const t0 = Date.now();
  const log = execFileSync('blender', ['-b', '--factory-startup', '--python', new URL('gen.py', import.meta.url).pathname, '--', tmp, OUT + f.id + '.gltf'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const line = log.split('\n').find(l => l.startsWith('GEEXPORTEERD'));
  if (!line) { console.error(f.id, 'MISLUKT\n', log.split('\n').filter(l => /rror|Traceback|File "/.test(l)).join('\n')); process.exitCode = 1; continue; }
  index[f.id] = f.id + '.gltf';
  console.log(f.id.padEnd(16), ((Date.now() - t0) / 1000).toFixed(1) + 's', line.split(' ').slice(2).map(n => (n / 1e6).toFixed(2) + 'MB').join(' + '));
}
writeFileSync(OUT + 'index.json', JSON.stringify(index, null, 1));
