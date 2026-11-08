// Controleert de speldata: roster compleet, technieken bestaan, geen dubbele namen.
import { ROSTER } from '../../src/data/roster.js';
import { MOVES, INPUT_MAP, CHAINS } from '../../src/data/moves.js';
import { POSES } from '../../src/game/poses.js';

const errs = [];
// Opgave van de dojo (8 november 2026): naam, geslacht, graad.
const SPEC = `Sensei Wesley m 4d|Sensei Conchita v 4d|Senpai Anjay m 2d|Senpai Ferry m 2d|Senpai Dave m 2d|Senpai Micha v 1d|Senpai Daan m 1d|Senpai Niesje v 1d|
Seth m 2k|Gwenn v 2k|Yassin m 2k|Roshni v 4k|Skylar v 6k|Djordy m 7k|Jayh m 7k|Laura v 8k|Azad m 8k|
Eli m 9k|Rayaan m 9k|Yi-En m 9k|Ace m 9k|Azim m 9k|Amir m 9k|Nino m 9k|Mano m 9k|Naotaka m 9k|Niven m 9k|
Livia v 9k|Senna v 9k|Sophia v 9k|Jailey v 9k|Riley v 9k|James m 10k|Raf m 10k|Leo m 10k|Maylea v 10k|Nina v 10k`
  .split('|').map(s => s.trim()).filter(Boolean).map(s => { const m = s.match(/^(.+) ([mv]) (\d+)([dk])$/); return { naam: m[1], g: m[2], n: +m[3], dan: m[4] === 'd' }; });
const need = SPEC.map(s => s.naam);
const names = ROSTER.map(f => f.naam);
for (const n of need) if (!names.includes(n)) errs.push(`ontbreekt: ${n}`);
for (const n of names) if (/jalissa|jaylee/i.test(n)) errs.push(`mag niet in de roster: ${n}`);
if (ROSTER.length !== SPEC.length) errs.push(`verwacht ${SPEC.length} vechters, gevonden ${ROSTER.length}`);
for (const s of SPEC) {
  const f = ROSTER.find(f => f.naam === s.naam); if (!f) continue;
  if (f.geslacht !== s.g) errs.push(`${s.naam}: geslacht ${f.geslacht}, verwacht ${s.g}`);
  const ok = s.dan ? f.graad?.dan === s.n : f.graad?.kyu === s.n;
  if (!ok) errs.push(`${s.naam}: graad ${JSON.stringify(f.graad)}, verwacht ${s.n}${s.dan ? 'e dan' : 'e kyu'}`);
}
const djordy = ROSTER.find(f => f.id === 'djordy');
if (djordy.ai.head < 0.8 || djordy.ai.lowkick > 0.4) errs.push('Djordy moet high kicks als specialiteit hebben');
for (const id of ['ushiro_mawashi', 'rol_kick']) if (!Object.values(INPUT_MAP).includes(id)) errs.push(`${id} zit niet in de basis-moveset`);
if (new Set(names).size !== names.length) errs.push('dubbele naam in roster');
if (new Set(ROSTER.map(f => f.id)).size !== ROSTER.length) errs.push('dubbele id in roster');
if (ROSTER.filter(f => f.eindbaas).map(f => f.id).join() !== 'wesley') errs.push('eindbaas moet alleen Sensei Wesley zijn');
const mv = id => MOVES[id] || errs.push(`onbekende techniek: ${id}`);
for (const f of ROSTER) {
  if (f.signatures.length !== 3) errs.push(`${f.naam}: verwacht 3 signatures`);
  for (const s of f.signatures) { mv(s.base); (s.mod.sequence || []).forEach(mv); }
  f.super.sequence.forEach(mv);
  for (const k of ['kracht', 'snelheid', 'bereik', 'conditie', 'benen']) if (!(f.stats[k] >= 1 && f.stats[k] <= 10)) errs.push(`${f.naam}: stat ${k}`);
}
Object.values(INPUT_MAP).forEach(mv);
for (const [a, c] of Object.entries(CHAINS)) { mv(a); Object.values(c).forEach(mv); }
for (const [id, m] of Object.entries(MOVES)) for (const [p] of m.frames) if (!POSES[p]) errs.push(`${id}: onbekende pose ${p}`);
console.log(`${ROSTER.length} vechters, ${Object.keys(MOVES).length} technieken`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('data ok');
