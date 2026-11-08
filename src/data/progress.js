// Graadcurve (kyu → dan), gedeeld door het profiel en de campaign.
// Snelheid volgens de dojo: witte band → 5e kyu normaal, 5e kyu → bruine band (2e kyu)
// 2× zo langzaam, bruine band → zwarte band 4× zo langzaam.
import { beltOf } from './roster.js';

export const RANKS = [...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(kyu => ({ kyu })), { dan: 1 }, { dan: 2 }, { dan: 3 }];
// basis-XP per stap (naar de volgende graad) en de vertraging per traject
const BASE = [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800];
const SLOW = [1, 1, 1, 1, 1, 2, 2, 2, 4, 4, 4, 4];
export const NEED = BASE.reduce((acc, b, i) => (acc.push(acc[i] + b * SLOW[i]), acc), [0]);
export const SHODAN_INDEX = 10; // index van de 1e dan in RANKS

export function rankIndexOf(xp) { let i = 0; while (i < NEED.length - 1 && xp >= NEED[i + 1]) i++; return i; }
export function rankOf(xp) {
  const i = rankIndexOf(xp), next = NEED[i + 1];
  return { index: i, graad: RANKS[i], belt: beltOf(RANKS[i]), xp, next, need: next ? next - xp : 0, progress: next ? (xp - NEED[i]) / (next - NEED[i]) : 1 };
}
