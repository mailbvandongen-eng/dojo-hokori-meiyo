// Bepaalt per techniek de grootste afstand (midden tot midden) waarop het raakvlak de juiste zone
// van een staande tegenstander nog raakt, zonder instap. Gebruik dit voor `reach` in moves.js.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/calibrate.cjs
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 320, height: 200 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(1200);
  // met de realistische modellen (MakeHuman): het gameskelet neemt hun lichaamsmaten over
  if (!process.env.SIMPEL) await p.evaluate(async () => { const { ROSTER } = await import('./src/data/roster.js'); await __game.preload(ROSTER.map(f => f.id)); });
  const rows = await p.evaluate(async () => {
    const { MOVES } = await import('./src/data/moves.js'); const F = await import('./src/game/fighter.js');
    __game.pause(true);
    __game.startFight({ mode: 'versus', akaId: 'amir', shiroId: 'amir', akaCtrl: 'dummy', shiroCtrl: 'dummy', roundTime: 999 });
    const G = __game.G; G.match.script = []; G.match.phase = 'fight';
    const a = G.aka, o = G.shiro, out = [];
    const hitsAt = (id, gap) => {
      a.reset(-gap / 2, 1); o.reset(gap / 2, -1); a.state = o.state = 'idle'; o.ki = 1e9; o.legs = o.body = 0; G.match.phase = 'fight';
      let n = 0; a.onEvent = (t) => { if (t === 'hit') n++; };
      a.startMove(id, { reach: 10 }); // instap uit
      const m = MOVES[id];
      for (let t = 0; t < m.end * 1.3; t += 1 / 240) { a.update(1 / 240, o, G.match); o.update(1 / 240, a, G.match); if (o.state === 'hit') { o.state = 'idle'; o.vx = 0; o.x = gap / 2; } }
      return n;
    };
    for (const [id, m] of Object.entries(MOVES)) {
      if (!m.hits) continue;
      let lo = 0.62, hi = 2.2;
      if (!hitsAt(id, lo + 0.01) && !m.travel) { out.push({ id, max: null }); continue; }
      for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (hitsAt(id, mid) >= m.hits.length) lo = mid; else hi = mid; }
      out.push({ id, reach: m.reach, max: +lo.toFixed(2) });
    }
    return out;
  });
  console.log('techniek            reach  max. raakafstand (alle treffers)');
  for (const r of rows) console.log(r.id.padEnd(20), String(r.reach).padEnd(6), r.max);
  console.log(errs.join('\n') || 'geen fouten'); await b.close();
})();
