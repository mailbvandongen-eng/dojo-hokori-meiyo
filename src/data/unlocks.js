// Vrijspelen van senpai en sensei door toernooien te winnen.
// Volgorde: eerst de lagere senpai (1e dan), dan de hogere (2e dan), dan Sensei Conchita.
// Sensei Wesley (eindbaas) als allerlaatste: alleen door hem in een finale te verslaan.
import { ROSTER, graadNiveau } from './roster.js';
import { profile, save } from './profile.js';

const isLeader = f => /^(Senpai|Sensei)/.test(f.naam);
export const UNLOCK_ORDER = ROSTER.filter(f => isLeader(f) && !f.eindbaas)
  .sort((a, b) => graadNiveau(a.graad) - graadNiveau(b.graad) || (a.naam.startsWith('Sensei') ? 1 : 0) - (b.naam.startsWith('Sensei') ? 1 : 0))
  .map(f => f.id);
export const FINAL_BOSS = 'wesley';

export function isLocked(id) {
  const f = ROSTER.find(x => x.id === id);
  if (!f || !isLeader(f)) return false;
  return !profile.unlocks.includes(id);
}
export function nextUnlock() { return UNLOCK_ORDER.find(id => !profile.unlocks.includes(id)) || (profile.unlocks.includes(FINAL_BOSS) ? null : FINAL_BOSS); }
export function bossFinalDue() { return nextUnlock() === FINAL_BOSS; }

// Na een gewonnen toernooi. beatBossInFinal: de finale was tegen Sensei Wesley en gewonnen.
// Geeft de vrijgespeelde vechter terug (of null).
export function unlockAfterTournament({ beatBossInFinal = false } = {}) {
  const next = nextUnlock();
  if (!next) return null;
  if (next === FINAL_BOSS && !beatBossInFinal) return null;
  profile.unlocks.push(next); save();
  return ROSTER.find(f => f.id === next);
}
