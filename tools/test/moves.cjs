// Filmstrip per techniek met de echte modellen en motion capture: opbouw, treffer, herstel.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/moves.cjs [uitvoermap]
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/dhm/moves';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 420, height: 360 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(1500);
  const AKA = process.env.AKA || 'wesley', SHIRO = process.env.SHIRO || 'daan';
  await p.evaluate(ids => __game.preload(ids), [AKA, SHIRO]);
  await p.evaluate(([TH, R, AKA, SHIRO]) => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); __game.startFight({ mode: 'training', training: true, akaId: AKA, shiroId: SHIRO, akaCtrl: 'solo', shiroCtrl: 'dummy' }); __game.pause(true); document.getElementById('hud').classList.remove('on'); __game.setCam('photo'); Object.assign(__game.photo, { theta: TH, phi: 1.4, r: R }); }, [Number(process.env.TH || 0), Number(process.env.R || 4.2), AKA, SHIRO]);
  console.log('mocap:', await p.evaluate(() => !!__game.G.aka.anim));
  const moves = process.env.MOVES ? process.env.MOVES.split(',') : ['seiken_jab', 'seiken_gyaku', 'shita_tsuki', 'jodan_tsuki', 'hiji_ate', 'mae_geri', 'gedan_mawashi', 'chudan_mawashi', 'jodan_mawashi', 'ushiro_geri', 'ushiro_mawashi', 'kakato_otoshi', 'double_tap', 'rol_kick', 'hiza_geri'];
  const GAP = Number(process.env.GAP || 1.3);
  for (let i = 0; i < 30; i++) await p.evaluate(() => __game.step(1 / 30));
  const shots = [];
  for (const id of moves) {
    await p.evaluate(([id, GAP]) => { const g = __game.G; g.aka.reset(-GAP / 2, 1); g.shiro.reset(GAP / 2, -1); g.shiro.state = 'idle'; for (let i = 0; i < 10; i++) __game.step(1 / 30); g.aka.startMove(id, {}); }, [id, GAP]);
    const m = await p.evaluate(() => { const f = __game.G.aka; return { hits: f.move.hits.map(h => (h.t + h.active * 0.4) * f.scale), end: f.move.end * f.scale }; });
    const times = [m.hits[0] * 0.5, ...m.hits, m.hits[m.hits.length - 1] + (m.end - m.hits[m.hits.length - 1]) * 0.6];
    let t = 0; const row = [];
    for (const [k, tt] of times.entries()) {
      while (t < tt - 1e-6) { const d = Math.min(1 / 60, tt - t); await p.evaluate(d => __game.step(d), d); t += d; }
      const f = `${out}/${id}-${k}.png`; await p.screenshot({ path: f }); row.push(f);
    }
    const hit = await p.evaluate(() => ({ st: __game.G.shiro.state, ki: Math.round(__game.G.shiro.ki), x: [__game.G.aka.x.toFixed(2), __game.G.shiro.x.toFixed(2)] }));
    console.log(id, JSON.stringify(hit));
    shots.push(row);
  }
  // toestanden: blok, scheenblok, treffer opvangen, knock-down, opstaan, rei, overwinning
  const states = process.env.STATES === '0' ? [] : [['block', 0.4], ['lowblock', 0.4], ['hitHead', 0.12], ['hitBody', 0.15], ['knees', 0.9], ['back', 1.2], ['getup', 0.6], ['rei', 0.8], ['victory', 1.5]];
  const row = [];
  for (const [st, dur] of states) {
    await p.evaluate(([st, GAP]) => { const g = __game.G, a = g.aka; a.reset(-GAP / 2, 1); g.shiro.reset(GAP / 2, -1); for (let i = 0; i < 10; i++) __game.step(1 / 30);
      if (st === 'knees' || st === 'back') a.knockdown({ type: st });
      else if (st === 'getup') { a.knockdown({ type: 'back' }); for (let i = 0; i < 40; i++) __game.step(1 / 30); a.getUp(); }
      else if (st.startsWith('hit')) { a.state = 'hit'; a.stun = 0.4; a.t = 0; a.anim?.hit(st === 'hitHead' ? 'head' : 'body', 1.2); }
      else a.state = st; }, [st, GAP]);
    for (let t = 0; t < dur; t += 1 / 30) await p.evaluate(() => __game.step(1 / 30));
    const f = `${out}/st-${st}.png`; await p.screenshot({ path: f }); row.push(f);
    if (row.length === 3) { shots.push(row.splice(0)); }
  }
  if (row.length) shots.push(row);
  require('fs').writeFileSync(`${out}/list.json`, JSON.stringify(shots));
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'geen fouten');
  await b.close();
})();
