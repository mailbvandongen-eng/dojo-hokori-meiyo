// Online leaderboard voor de Dojo Hokori Meiyo Fight Game (Cloudflare Worker + D1).
//   GET  /top?by=fights|twins&limit=25&me=<speler-id>  → { rows: [{ naam, fights, twins, graad, titels, me }] }
//   POST /submit { id, naam, fights, twins, graad, titels } → { ok: true }
// De speler-id is een willekeurige UUID per toestel en wordt nooit teruggegeven.
// Simpele bescherming tegen valsspelen: waarden mogen alleen stijgen, met een maximum per verzoek,
// en per speler hooguit één verzoek per 2 seconden.

const MAX_STEP = { fights: 30, twins: 5, titels: 5 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = origin => ({
  'access-control-allow-origin': origin || '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
});
const json = (data, status, origin) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) } });

function cleanName(s) {
  return String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = allowedOrigin(req.headers.get('origin'), env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    if (req.method === 'GET' && url.pathname === '/top') {
      const by = url.searchParams.get('by') === 'twins' ? 'twins' : 'fights';
      const limit = int(url.searchParams.get('limit') || 25, 100) || 25, me = url.searchParams.get('me') || '';
      const order = by === 'twins' ? 'twins DESC, fights DESC' : 'fights DESC, twins DESC';
      const { results } = await env.DB.prepare(`SELECT id, naam, fights, twins, graad, titels FROM players WHERE ${by} > 0 ORDER BY ${order}, updated ASC LIMIT ?`).bind(limit).all();
      return json({ by, rows: results.map(r => ({ naam: r.naam, fights: r.fights, twins: r.twins, graad: r.graad, titels: r.titels, me: r.id === me })) }, 200, origin);
    }

    if (req.method === 'POST' && url.pathname === '/submit') {
      let b; try { b = await req.json(); } catch { return json({ error: 'geen json' }, 400, origin); }
      if (!UUID.test(b.id || '')) return json({ error: 'ongeldige id' }, 400, origin);
      const naam = cleanName(b.naam); if (!naam) return json({ error: 'naam ontbreekt' }, 400, origin);
      const now = Date.now();
      const old = await env.DB.prepare('SELECT fights, twins, titels, updated FROM players WHERE id = ?').bind(b.id).first();
      if (old && now - old.updated < 2000) return json({ error: 'te snel' }, 429, origin);
      const step = (k, v) => old ? Math.max(old[k], Math.min(int(v, 1e6), old[k] + MAX_STEP[k])) : Math.min(int(v, 1e6), MAX_STEP[k] * 4);
      const row = { fights: step('fights', b.fights), twins: step('twins', b.twins), titels: step('titels', b.titels) };
      await env.DB.prepare(`INSERT INTO players (id, naam, fights, twins, graad, titels, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET naam = excluded.naam, fights = excluded.fights, twins = excluded.twins, graad = excluded.graad, titels = excluded.titels, updated = excluded.updated`)
        .bind(b.id, naam, row.fights, row.twins, cleanName(b.graad), row.titels, now).run();
      return json({ ok: true, ...row }, 200, origin);
    }
    return json({ error: 'niet gevonden' }, 404, origin);
  },
};

// Alleen de game zelf (GitHub Pages) en lokale tests mogen de API vanuit de browser gebruiken.
function allowedOrigin(o, env) {
  const ok = (env.ALLOWED_ORIGINS || 'https://mailbvandongen-eng.github.io,http://127.0.0.1:8766,http://localhost:8766').split(',');
  return o && ok.includes(o) ? o : ok[0];
}
