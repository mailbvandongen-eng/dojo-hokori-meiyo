// Genereert docs/ROSTER.md uit src/data/roster.js en moves.js (bron van waarheid = de data).
import { writeFileSync } from 'node:fs';
import { ROSTER, beltOf } from '../src/data/roster.js';
import { MOVES, INPUT_MAP } from '../src/data/moves.js';

const DIR = { n: '', f: '→ + ', b: '← + ', d: '↓ + ', u: '↑ + ' };
const bar = v => '█'.repeat(v) + '░'.repeat(10 - v);
const L = [];
L.push('# Roster & movesets: Dojo Hokori Meiyo', '');
L.push('> Gegenereerd met `npm run docs:roster` uit `src/data/roster.js`. Pas de data aan, niet dit bestand.', '');
L.push('> **Let op:** dit zijn echte dojoleden. Persoonlijkheid, speelstijl, graad en uiterlijk zijn een **voorstel**.',
  '> Laat iedere vechter (bij kinderen samen met ouders) zelf kiezen en akkoord geven; zie de checklist onderaan.', '');
L.push('## Overzicht', '', '| # | Vechter | Stijl | Rol | Graad (spel) | Kr | Sn | Be | Co | Bn |', '|---|---|---|---|---|---|---|---|---|---|');
ROSTER.forEach((f, i) => { const s = f.stats; L.push(`| ${i + 1} | **${f.naam}** | ${f.stijl} | ${f.rol} | ${beltOf(f.graad).naam}${f.bevestigd?.graad ? '' : ' *'} | ${s.kracht} | ${s.snelheid} | ${s.bereik} | ${s.conditie} | ${s.benen} |`); });
L.push('', '\\* = voorlopig, nog te bevestigen. Kr = kracht, Sn = snelheid, Be = bereik, Co = conditie, Bn = benen (weerstand tegen lage trappen).', '');

L.push('## Basis-moveset (alle vechters)', '', 'Richting is relatief: → = naar de tegenstander toe.', '', '| Input | Techniek | Wat het is | Doel | Startup | Schade |', '|---|---|---|---|---|---|');
for (const [k, id] of Object.entries(INPUT_MAP)) { if (k === 'tsuki.u') continue; const [b, d] = k.split('.'), m = MOVES[id]; L.push(`| ${DIR[d]}${b.toUpperCase()} | ${m.jp} | ${m.nl} | ${m.target} | ${Math.round(m.startup * 1000)} ms | ${m.dmg}${m.legDmg ? ` (+${m.legDmg} been)` : ''} |`); }
L.push(`| → + GERI (op afstand) | ${MOVES.mae_geri.jp} | ${MOVES.mae_geri.nl} | chudan | ${MOVES.mae_geri.startup * 1000} ms | ${MOVES.mae_geri.dmg} |`);
L.push(`| UKE (vasthouden) | ${MOVES.uke.jp} | ${MOVES.uke.nl} | | | |`, `| ↓ + UKE | ${MOVES.sune_uke.jp} | ${MOVES.sune_uke.nl} | | | |`);
L.push(`| KIAI / → KIAI / ↓ KIAI | Signature 1/2/3 | kost 1/3 kiai-meter | | | |`, `| KIAI (meter vol) | Super | slow motion; finisher als de tegenstander bijna op is | | | |`, '');
L.push('Renzoku (combinaties): druk TSUKI of GERI opnieuw als de vorige techniek raakt. Bijvoorbeeld jab → gyaku-tsuki → gedan mawashi.', '');

for (const f of ROSTER) {
  L.push(`## ${f.naam}${f.eindbaas ? ' (eindbaas)' : ''}`, '');
  L.push(`*${f.titel ? f.titel + ' · ' : ''}${f.stijl} · ${beltOf(f.graad).naam}${f.bevestigd?.graad ? '' : ' (voorlopig)'}*`, '');
  L.push(`> “${f.quote}”`, '', f.persoonlijkheid, '');
  const s = f.stats;
  L.push('```', `Kracht    ${bar(s.kracht)}  Snelheid ${bar(s.snelheid)}`, `Bereik    ${bar(s.bereik)}  Conditie ${bar(s.conditie)}`, `Benen     ${bar(s.benen)}`, '```', '');
  L.push('| Input | Signature | Techniek | Effect |', '|---|---|---|---|');
  f.signatures.forEach((g, i) => {
    const eff = [g.mod.sequence ? 'reeks: ' + g.mod.sequence.map(id => MOVES[id].jp).join(' → ') : null, g.mod.counter ? 'counter (blokt en antwoordt)' : null, g.mod.armor ? 'loopt door een treffer heen' : null,
      g.mod.dmg ? `schade ×${g.mod.dmg}` : null, g.mod.startup ? `snelheid ×${(1 / g.mod.startup).toFixed(2)}` : null, g.mod.kdChance ? 'grote kans op knock-down' : null, g.mod.push ? 'duwt ver weg' : null].filter(Boolean).join('; ');
    L.push(`| ${['', '→ + ', '↓ + '][i]}KIAI | **${g.naam}** | ${g.jp} | ${g.uitleg}${eff ? ` *(${eff})*` : ''} |`);
  });
  L.push('', `**Super: ${f.super.naam}** (${f.super.jp}): ${f.super.uitleg} Reeks: ${f.super.sequence.map(id => MOVES[id].jp).join(' → ')}.`, '');
  L.push(`**Finisher: ${f.finisher.naam}**: ${f.finisher.uitleg}`, '');
  const ai = f.ai; L.push(`<sub>AI-profiel: lage trap ${ai.lowkick} · romp ${ai.body} · hoofd ${ai.head} · draai ${ai.spin} · agressie ${ai.aggression} · verdediging ${ai.defense}</sub>`, '');
}
L.push('## Checklist voor de dojo', '', 'Per vechter afstemmen en in `roster.js` op `bevestigd: true` zetten:', '');
L.push('| Vechter | Graad | Stijl & moves | Uiterlijk (lengte, bouw, huid, haar) | Toestemming naam (bij kind: ouder) |', '|---|---|---|---|---|');
for (const f of ROSTER) L.push(`| ${f.naam} | ${f.bevestigd?.graad ? '✅' : '☐'} | ☐ | ${f.uiterlijk?.bevestigd ? '✅' : '☐'} | ☐ |`);
L.push('');
writeFileSync(new URL('../docs/ROSTER.md', import.meta.url), L.join('\n'));
console.log('docs/ROSTER.md geschreven');
