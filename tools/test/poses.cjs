// Posegalerij: elke techniek op het moment van impact, als losse screenshots.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/poses.cjs [uitvoermap]
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/dhm/poses';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 520, height: 400 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(1500);
  await p.evaluate(([TH, R]) => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); __game.startFight({ mode: 'training', training: true, akaId: 'wesley', shiroId: 'daan', akaCtrl: 'solo', shiroCtrl: 'dummy' }); __game.pause(true); document.getElementById('hud').classList.remove('on'); __game.setCam('photo'); Object.assign(__game.photo, { theta: TH, phi: 1.35, r: R }); }, [Number(process.env.TH || 0.15), Number(process.env.R || 4.4)]);
  const moves = process.env.MOVES ? process.env.MOVES.split(',') : ['seiken_jab', 'seiken_gyaku', 'shita_tsuki', 'hiji_ate', 'mae_geri', 'gedan_mawashi', 'chudan_mawashi', 'jodan_mawashi', 'ushiro_geri', 'ushiro_mawashi', 'kakato_otoshi', 'hiza_geri', 'tobi_hiza'];
  for (let i = 0; i < 40; i++) await p.evaluate(() => __game.step(1 / 30));
  await p.screenshot({ path: `${out}/00-guard.png` });
  for (const id of moves) {
    await p.evaluate(id => { const g = __game.G; g.aka.reset(-0.7, 1); g.shiro.reset(0.7, -1); g.shiro.state = 'idle'; g.aka.startMove(id, {}); }, id);
    const tHit = await p.evaluate(() => __game.G.aka.move.startup * __game.G.aka.scale);
    const steps = Math.round(tHit / (1 / 60));
    for (let i = 0; i < steps; i++) await p.evaluate(() => __game.step(1 / 60));
    await p.screenshot({ path: `${out}/${id}.png` });
  }
  // knock-down en ceremonie-poses
  for (const st of ['block', 'lowblock', 'rei', 'osu', 'victory']) {
    await p.evaluate(st => { const g = __game.G; g.aka.reset(-0.7, 1); g.aka.state = st; }, st);
    for (let i = 0; i < 40; i++) await p.evaluate(() => __game.step(1 / 30));
    await p.screenshot({ path: `${out}/st-${st}.png` });
  }
  for (const type of ['knees', 'back']) {
    await p.evaluate(type => { const g = __game.G; g.aka.reset(-0.7, 1); g.aka.knockdown({ type }); }, type);
    for (let i = 0; i < 40; i++) await p.evaluate(() => __game.step(1 / 30));
    await p.screenshot({ path: `${out}/kd-${type}.png` });
  }
  console.log(errs.length ? errs.join('\n') : 'geen fouten');
  await b.close();
})();
