// Online leaderboard: meeste gevechten en meeste toernooizeges.
// Server: Cloudflare Worker met D1-database (server/leaderboard/). Elk toestel krijgt een
// anonieme speler-id; op het bord staat alleen de zelfgekozen naam (geen persoonsgegevens).
import { LEADERBOARD_URL } from './config.js';

const ID_KEY = 'dhm-player-id', LAST_KEY = 'dhm-leaderboard-last';
const playerId = localStorage.getItem(ID_KEY) || (() => {
  const id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  localStorage.setItem(ID_KEY, id); return id;
})();

let timer = null, pending = null;
async function post(entry) {
  const r = await fetch(`${LEADERBOARD_URL}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: playerId, ...entry }) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export const online = {
  playerId,
  get available() { return !!LEADERBOARD_URL; },
  // entry: { naam, fights, twins, graad, titels }. Wordt kort uitgesteld zodat snelle gevechten één verzoek geven.
  submit(entry) {
    localStorage.setItem(LAST_KEY, JSON.stringify({ id: playerId, ...entry, me: true }));
    if (!LEADERBOARD_URL) return;
    pending = entry; clearTimeout(timer);
    timer = setTimeout(() => { const e = pending; pending = null; post(e).catch(() => { /* volgende keer opnieuw */ }); }, 1500);
  },
  // by: 'fights' of 'twins'. Geeft { online, rows, reason }.
  async top(by = 'fights', n = 25) {
    const mine = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
    if (!LEADERBOARD_URL) return { online: false, reason: 'Online leaderboard nog niet aangesloten', rows: mine ? [mine] : [] };
    try {
      if (pending) { const e = pending; pending = null; clearTimeout(timer); await post(e).catch(() => {}); }
      // de server geeft geen speler-id's terug (die zijn de 'sleutel'); 'me' markeert je eigen rij
      const r = await fetch(`${LEADERBOARD_URL}/top?by=${by}&limit=${n}&me=${playerId}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { online: true, rows: (await r.json()).rows || [] };
    } catch (e) {
      return { online: false, reason: 'Server niet bereikbaar', rows: mine ? [mine] : [] };
    }
  },
};
