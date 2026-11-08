# Online leaderboard (Cloudflare Worker + D1)

Houdt bij wie de meeste gevechten heeft gedaan en wie de meeste toernooien heeft gewonnen.
Gratis tier van Cloudflare is ruim genoeg (100.000 verzoeken per dag).

## API

| | |
|---|---|
| `GET /top?by=fights\|twins&limit=25&me=<speler-id>` | `{ rows: [{ naam, fights, twins, graad, titels, me }] }` |
| `POST /submit` `{ id, naam, fights, twins, graad, titels }` | `{ ok: true }` |

Elk toestel heeft een willekeurige speler-id (UUID); die wordt nooit teruggegeven. Op het bord staat
alleen de zelfgekozen naam. Bescherming: waarden mogen alleen stijgen (max. +30 gevechten, +5 toernooizeges
per verzoek), hooguit één verzoek per 2 s per speler, namen worden opgeschoond, CORS alleen voor de game.

## Eenmalig online zetten

```bash
cd server/leaderboard
npx wrangler login                     # of: export CLOUDFLARE_API_TOKEN=... (token met Workers + D1 rechten)
npx wrangler d1 create dhm-leaderboard # zet de database_id die je krijgt in wrangler.toml
npx wrangler d1 execute dhm-leaderboard --remote --file schema.sql
npx wrangler deploy                    # geeft https://dhm-leaderboard.<account>.workers.dev
```

Zet daarna dat adres in `src/data/config.js` (`DEPLOYED`) en push: de game gebruikt het meteen.

## Lokaal testen

```bash
npx wrangler@3 d1 execute dhm-leaderboard --local --file schema.sql
npx wrangler@3 dev --local --port 8787
# game: http://127.0.0.1:8766/?lb=http://127.0.0.1:8787
NODE_PATH=/root/tools/pw/node_modules node tools/test/campaign.cjs
```
(Wrangler 4 vraagt Node 22; op Node 20 werkt `wrangler@3`.)
