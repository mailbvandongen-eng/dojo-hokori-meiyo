// Spelersprofiel: graad (kyu/dan), keiko-punten, vrijgespeelde kostuums en vechters.
// Lokaal opgeslagen; bij online spelen synchroniseert online.js dit met de server.
// De graadcurve staat in progress.js (witte band → 5e kyu normaal, → bruin 2× zo langzaam, → zwart 4×).
import { RANKS, rankIndexOf, rankOf } from './progress.js';
export { RANKS };

export const COSTUMES = [
  { id: 'wit', naam: 'Witte wedstrijddogi', rank: 0 },
  { id: 'zwart', naam: 'Zwarte trainingsdogi', rank: 5 },   // vanaf 5e kyu
  // gepland (zie docs/GDD.md §8): dojo-shirt, bondsdogi, jubileumdogi
];

const KEY = 'dhm-profile-v1';
// fights/tWins tellen alle modi (ook de campaign) en gaan naar het online leaderboard.
const fresh = () => ({ points: 0, wins: 0, losses: 0, ippons: 0, titles: 0, storyBest: 0, costume: 'wit', unlocks: [], fights: 0, tWins: 0, naam: '', history: [] });

export const profile = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}'));
if (!Array.isArray(profile.unlocks)) profile.unlocks = [];
delete profile.unlocked; // oude regel (Story speelde Sensei Wesley vrij) geldt niet meer
export function save() { localStorage.setItem(KEY, JSON.stringify(profile)); }

export function rankIndex(p = profile.points) { return rankIndexOf(p); }
export function rankInfo() { return { ...rankOf(profile.points), points: profile.points }; }

// Punten: winst telt het zwaarst, maar verlies levert ook iets op (Osu no seishin: doorzetten).
export function addResult({ won, how, mode }) {
  const before = rankIndex();
  let pts = won ? 60 : 15;
  if (won && (how === 'ippon' || how === 'awasete')) { pts += 40; profile.ippons++; }
  if (mode === 'story' && won) pts += 20;
  profile.points += pts; won ? profile.wins++ : profile.losses++; profile.fights++;
  profile.history = [{ won, how, mode, at: Date.now() }, ...profile.history].slice(0, 50);
  save();
  return { pts, promoted: rankIndex() > before };
}
export function addBonus(pts) { const before = rankIndex(); profile.points += pts; save(); return { pts, promoted: rankIndex() > before }; }
export function costumeUnlocked(c) { return rankIndex() >= c.rank; }
// telt een gevecht/toernooizege uit de campaign mee voor het leaderboard
export function countFight() { profile.fights++; save(); }
export function countTournamentWin() { profile.tWins++; save(); }
