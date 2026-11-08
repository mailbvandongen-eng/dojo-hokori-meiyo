// Spelersprofiel: graad (kyu/dan), keiko-punten, vrijgespeelde kostuums en vechters.
// Lokaal opgeslagen; bij online spelen synchroniseert online.js dit met de server.
import { beltOf } from './roster.js';

export const RANKS = [
  ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(kyu => ({ kyu })),
  { dan: 1 }, { dan: 2 }, { dan: 3 },
];
const NEED = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4100, 5000];

export const COSTUMES = [
  { id: 'wit', naam: 'Witte wedstrijddogi', rank: 0 },
  { id: 'zwart', naam: 'Zwarte trainingsdogi', rank: 5 },   // vanaf 5e kyu
  // gepland (zie docs/GDD.md §8): dojo-shirt, bondsdogi, jubileumdogi
];

const KEY = 'dhm-profile-v1';
const fresh = () => ({ points: 0, wins: 0, losses: 0, ippons: 0, titles: 0, storyBest: 0, costume: 'wit', unlocked: { wesley: false }, history: [] });

export const profile = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}'));
export function save() { localStorage.setItem(KEY, JSON.stringify(profile)); }

export function rankIndex(p = profile.points) { let i = 0; while (i < NEED.length - 1 && p >= NEED[i + 1]) i++; return i; }
export function rankInfo() {
  const i = rankIndex(), next = NEED[i + 1];
  return { index: i, graad: RANKS[i], belt: beltOf(RANKS[i]), points: profile.points, next, progress: next ? (profile.points - NEED[i]) / (next - NEED[i]) : 1 };
}

// Punten: winst telt het zwaarst, maar verlies levert ook iets op (Osu no seishin: doorzetten).
export function addResult({ won, how, mode }) {
  const before = rankIndex();
  let pts = won ? 60 : 15;
  if (won && (how === 'ippon' || how === 'awasete')) { pts += 40; profile.ippons++; }
  if (mode === 'story' && won) pts += 20;
  profile.points += pts; won ? profile.wins++ : profile.losses++;
  profile.history = [{ won, how, mode, at: Date.now() }, ...profile.history].slice(0, 50);
  save();
  return { pts, promoted: rankIndex() > before };
}
export function addBonus(pts) { const before = rankIndex(); profile.points += pts; save(); return { pts, promoted: rankIndex() > before }; }
export function costumeUnlocked(c) { return rankIndex() >= c.rank; }
