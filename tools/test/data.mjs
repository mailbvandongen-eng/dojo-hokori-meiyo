// Controleert de speldata: roster compleet, technieken bestaan, geen dubbele namen.
import { ROSTER } from '../../src/data/roster.js';
import { MOVES, INPUT_MAP, CHAINS } from '../../src/data/moves.js';
import { POSES } from '../../src/game/poses.js';

const errs = [];
const need = ['Sensei Wesley', 'Skylar', 'Djordy', 'Daan', 'Sensei Conchita', 'Senpai Anjay', 'Roshni', 'Niesje', 'Gwenn', 'Yassin', 'Dave', 'Seth',
  'James', 'Raf', 'Eli', 'Rayaan', 'Livia', 'Senna', 'Sophia', 'Jailey', 'Maylea', 'Yi-En', 'Ace', 'Riley', 'Azim', 'Amir', 'Nino', 'Laura', 'Jayh'];
const names = ROSTER.map(f => f.naam);
for (const n of need) if (!names.includes(n)) errs.push(`ontbreekt: ${n}`);
for (const n of names) if (/jalissa|jaylee/i.test(n)) errs.push(`mag niet in de roster: ${n}`);
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
