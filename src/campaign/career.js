// Campaign: de loopbaan van je eigen vechter, van witte band (noob) tot zwarte band (legend).
// Ritme: training → toernooi → training → toernooi … Toernooien lopen op van club via NK en EK
// naar het WK, met Sensei Wesley als eindbaas in de WK-finale.
// Puur data en regels; de schermen staan in campaign.js.
import { rankOf, NEED, SHODAN_INDEX } from '../data/progress.js';
import { ROSTER, graadNiveau } from '../data/roster.js';

const KEY = 'dhm-career-v1';

// ── Upgrades ──
export const STATS = [
  { id: 'kracht', naam: 'Kracht', uitleg: 'Meer schade per techniek', icoon: '💪' },
  { id: 'snelheid', naam: 'Snelheid', uitleg: 'Snellere technieken en voetenwerk', icoon: '⚡' },
  { id: 'techniek', naam: 'Techniek', uitleg: 'Snellere kiai-meter, meer kans op knock-down met hoofdtrappen', icoon: '🎯' },
  { id: 'uithouding', naam: 'Uithoudingsvermogen', uitleg: 'Meer ki: je houdt het langer vol', icoon: '❤️' },
  { id: 'benen', naam: 'Scheenharding', uitleg: 'Beter bestand tegen lage trappen', icoon: '🦵' },
];
export const MAX_LEVEL = 10, START_LEVEL = 2;
export const upgradeCost = lvl => 40 * lvl;                    // van lvl naar lvl+1
export function levelName(l) { return l >= 10 ? 'Legend' : l >= 8 ? 'Elite' : l >= 6 ? 'Kampioen' : l >= 4 ? 'Gevorderd' : 'Noob'; }

// ── Toernooien ──
// opp: bereik van tegenstanders in graadniveau (0 = 10e kyu … 13 = 4e dan); min: minimale graad (index in RANKS).
// scale: sterkte van de tegenstanders (vroege toernooien zijn milder); boss: de eindbaas staat in de finale.
export const TOURNAMENTS = [
  { id: 'club', niveau: 'Club', naam: 'Hokori Meiyo Clubtoernooi', plaats: 'Zoetermeer', titel: 'Clubkampioen', size: 4, min: 0, opp: [0, 1], scale: 0.72, diff: ['kohai', 'kohai'], xp: 150 },
  { id: 'regio', niveau: 'Regio', naam: 'Regiotoernooi Zuid-Holland', plaats: 'Den Haag', titel: 'Regiokampioen', size: 4, min: 1, opp: [0, 3], scale: 0.8, diff: ['kohai', 'senpai'], xp: 250 },
  { id: 'nk-kyu', niveau: 'NK', naam: 'NK Kyokushin · kyu-klasse', plaats: 'Utrecht', titel: 'Nederlands Kampioen', size: 8, min: 2, opp: [1, 5], scale: 0.88, diff: ['kohai', 'senpai', 'senpai'], xp: 500 },
  { id: 'nk-open', niveau: 'NK', naam: 'NK Kyokushin · open klasse', plaats: 'Rotterdam', titel: 'Nederlands Kampioen', size: 8, min: 5, opp: [3, 10], scale: 0.94, diff: ['senpai', 'senpai', 'sensei'], xp: 800 },
  { id: 'ek-kyu', niveau: 'EK', naam: 'EK Kyokushin · kyu-klasse', plaats: 'Boedapest', titel: 'Europees Kampioen', size: 8, min: 6, opp: [4, 11], scale: 0.98, diff: ['senpai', 'sensei', 'sensei'], xp: 1100 },
  { id: 'ek-open', niveau: 'EK', naam: 'EK Kyokushin · open klasse', plaats: 'Warschau', titel: 'Europees Kampioen', size: 8, min: 7, opp: [6, 13], scale: 1.02, diff: ['sensei', 'sensei', 'shihan'], xp: 1400 },
  { id: 'wk', niveau: 'WK', naam: 'WK Kyokushin', plaats: 'Tokio', titel: 'Wereldkampioen', size: 8, min: 9, opp: [8, 13], scale: 1.06, diff: ['sensei', 'shihan', 'shihan'], xp: 2000, boss: 'wesley' },
];
// Open toernooi: als je graad nog te laag is voor het volgende kampioenschap (geen titel, wel punten).
export function openTournament(c) {
  const g = rankOf(c.xp).index, lo = Math.max(0, g - 1), hi = Math.min(13, g + 2);
  return { id: 'open', niveau: 'Open', naam: `Open toernooi ${['Leiden', 'Delft', 'Haarlem', 'Antwerpen', 'Eindhoven', 'Gent'][c.stats.trainings % 6]}`, plaats: '', titel: null, size: 4, min: 0, opp: [lo, hi], scale: 0.8 + g * 0.02, diff: g < 4 ? ['kohai', 'senpai'] : ['senpai', 'sensei'], xp: 120 + g * 30, open: true };
}
// Na het WK: titels verdedigen.
const DEFENSE = ['nk-open', 'ek-open', 'wk'];

export const TRAININGS = {
  bokszak: { naam: 'Bokszak', uitleg: 'Stoot en trap op het ritme. Raak de bokszak precies op tijd voor een combo.', stat: 'kracht' },
  gewicht: { naam: 'Gewichtheffen', uitleg: 'Druk de halter op het juiste moment omhoog. Elke herhaling wordt zwaarder.', stat: 'uithouding' },
};

// ── Opslag ──
export function fresh({ naam, geslacht, kapsel, huid, haar }) {
  const levels = Object.fromEntries(STATS.map(s => [s.id, START_LEVEL]));
  return {
    v: 1, naam: naam || (geslacht === 'v' ? 'Nieuwe karateka' : 'Nieuwe karateka'), geslacht, kapsel, huid, haar,
    created: Date.now(), xp: 0, punten: 0, levels, next: 'training', tIndex: 0, done: false,
    titles: [], stats: { fights: 0, wins: 0, losses: 0, ippons: 0, tWins: 0, trainings: 0, best: { bokszak: 0, gewicht: 0 } }, log: [],
  };
}
export function load() { try { const c = JSON.parse(localStorage.getItem(KEY)); return c && c.v === 1 ? c : null; } catch { return null; } }
export function save(c) { localStorage.setItem(KEY, JSON.stringify(c)); }
export function reset() { localStorage.removeItem(KEY); }

// ── Volgend evenement ──
export function nextTournament(c) {
  if (c.done) return TOURNAMENTS.find(t => t.id === DEFENSE[c.tIndex % DEFENSE.length]);
  const t = TOURNAMENTS[c.tIndex];
  return rankOf(c.xp).index >= t.min ? t : { ...openTournament(c), blockedBy: t };
}

// ── Beloningen ──
// Alles wat je verdient telt voor je graad (XP) én als upgradepunten.
export function reward(c, xp, reason) {
  const before = rankOf(c.xp).index;
  c.xp += xp; c.punten += xp;
  c.log = [{ reason, xp, at: Date.now() }, ...c.log].slice(0, 40);
  const after = rankOf(c.xp).index;
  return { xp, promoted: after > before ? rankOf(c.xp) : null };
}
export function promoteToShodan(c) {
  if (rankOf(c.xp).index >= SHODAN_INDEX) return null;
  const add = NEED[SHODAN_INDEX] - c.xp; c.xp += add; c.punten += Math.round(add / 2);
  return rankOf(c.xp);
}
export function trainingReward(score) { return Math.round(40 + Math.min(1, score / 100) * 110); } // 40-150
export function fightReward(t, won, how) { return won ? Math.round(t.xp * 0.12) + (how === 'ippon' || how === 'awasete' ? 25 : 0) : Math.round(t.xp * 0.04); }

export function canUpgrade(c, id) { const l = c.levels[id]; return l < MAX_LEVEL && c.punten >= upgradeCost(l); }
export function upgrade(c, id) { if (!canUpgrade(c, id)) return false; c.punten -= upgradeCost(c.levels[id]); c.levels[id]++; save(c); return true; }
export function overallLevel(c) { const v = Object.values(c.levels); return v.reduce((a, b) => a + b, 0) / v.length; }

// Titels als telling: "2× Nederlands Kampioen"
export function titleSummary(c) {
  const n = {}; for (const t of c.titles) n[t.titel] = (n[t.titel] || 0) + 1;
  const order = ['Wereldkampioen', 'Europees Kampioen', 'Nederlands Kampioen', 'Regiokampioen', 'Clubkampioen'];
  return order.filter(k => n[k]).map(k => ({ titel: k, n: n[k], label: n[k] > 1 ? `${n[k]}× ${k}` : k }));
}
export function topTitle(c) { return titleSummary(c)[0]?.titel || null; }

// ── De vechter als speldata (zelfde vorm als roster.js) ──
export function playerFighter(c) {
  const r = rankOf(c.xp), g = r.graad, lvl = graadNiveau(g), L = c.levels;
  const s = (naam, jp, base, mod, uitleg) => ({ naam, jp, base, mod, uitleg });
  return {
    id: 'me', naam: c.naam, geslacht: c.geslacht, graad: g, speler: true,
    humanId: c.geslacht === 'v' ? `speler_v_${['staart', 'knot', 'kort'].includes(c.kapsel) ? c.kapsel : 'staart'}` : 'speler_m_kort',
    titel: topTitle(c) || 'Dojo Hokori Meiyo', stijl: `${levelName(Math.round(overallLevel(c)))}`, rol: 'Jouw vechter',
    persoonlijkheid: 'Jouw eigen vechter van Dojo Hokori Meiyo. Begonnen als witte band, op weg naar de zwarte.',
    quote: 'Osu! Ik geef nooit op.',
    stats: { kracht: L.kracht, snelheid: L.snelheid, bereik: 6, conditie: L.uithouding, benen: L.benen, techniek: L.techniek },
    ai: { lowkick: 0.5, body: 0.6, head: 0.4, spin: 0.3, aggression: 0.6, defense: 0.6 },
    // nieuwe technieken komen vrij met je graad
    signatures: [
      s('Renzoku', 'Seiken · Gyaku · Gedan', 'seiken_jab', { sequence: ['seiken_jab', 'seiken_gyaku', 'gedan_mawashi'] }, 'De basiscombinatie van elke Kyokushin-les.'),
      lvl >= 2 ? s('Hoge lijn', 'Jodan Mawashi Geri', 'jodan_mawashi', { dmg: 1.15, startup: 0.9 }, 'Een snelle trap naar het hoofd. Vrij vanaf de blauwe band.') : null,
      lvl >= 6 ? s('Rol Kick', 'Kaiten Kakato Geri', 'rol_kick', { dmg: 1.1 }, 'Rollend naar voren, de hiel van boven. Vrij vanaf de groene band.') : null,
    ],
    super: lvl >= 5 ? { naam: 'Hokori Meiyo', jp: '誇り名誉', sequence: ['seiken_gyaku', 'shita_tsuki', 'gedan_mawashi', 'jodan_mawashi'], uitleg: 'Eer en trots in vier technieken. Vrij vanaf de gele band met streep (5e kyu).' } : null,
    finisher: { naam: 'Eer & Trots', uitleg: 'Slow motion op de laatste trap; het hele publiek staat op.' },
    uiterlijk: { lengte: c.geslacht === 'v' ? 0.95 : 1.0, bouw: 0.92 + (L.kracht - 2) * 0.02, huid: c.huid, haar: c.haar, kapsel: c.kapsel, bevestigd: true },
  };
}

// Tegenstanders voor een toernooi: graadniveau binnen t.opp; de eindbaas alleen als finalist.
export function tournamentField(t) {
  const n = t.size - 1 - (t.boss ? 1 : 0);
  let pool = ROSTER.filter(f => !f.eindbaas && graadNiveau(f.graad) >= t.opp[0] && graadNiveau(f.graad) <= t.opp[1]);
  if (pool.length < n) pool = ROSTER.filter(f => !f.eindbaas).sort((a, b) => Math.abs(graadNiveau(a.graad) - t.opp[1]) - Math.abs(graadNiveau(b.graad) - t.opp[1])).slice(0, n + 4);
  return pool.sort(() => Math.random() - 0.5).slice(0, n).map(f => f.id);
}
