// Leaderboards en online ranking. Nu lokaal; de interface is wat de backend later implementeert.
// Voorstel backend (zie docs/TECH.md §6): Supabase of Firebase, met anonieme login en
// een dojo-code zodat alleen leden van Dojo Hokori Meiyo op het dojo-bord komen.
// Online versus vraagt een realtime-server (rollback netcode); dat is fase 3.

const KEY = 'dhm-leaderboard-v1';
const local = () => JSON.parse(localStorage.getItem(KEY) || '[]');

export const online = {
  available: false,
  async submit(entry) { // { naam, vechter, punten, graad }
    const list = local().filter(e => e.naam !== entry.naam);
    list.push({ ...entry, at: Date.now() });
    list.sort((a, b) => b.punten - a.punten);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
    return true;
  },
  async top(n = 20) { return local().slice(0, n); },
  async findMatch() { throw new Error('Online versus volgt in fase 3'); },
};
