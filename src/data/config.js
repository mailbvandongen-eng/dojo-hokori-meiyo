// Adres van de online leaderboard-server (Cloudflare Worker, zie server/leaderboard/README.md).
// Leeg = offline: het leaderboard toont dan alleen je eigen stand.
// Voor tests kan het adres ook via de URL: ?lb=http://127.0.0.1:8787
const DEPLOYED = '';
export const LEADERBOARD_URL = new URLSearchParams(location.search).get('lb') || DEPLOYED;
