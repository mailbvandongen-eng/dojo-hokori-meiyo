// Rooktest: splash → menu (demo-gevecht) → toernooigevecht, met screenshots.
// Gebruik: python3 -m http.server 8766 --bind 127.0.0.1  (in de repo-map), dan
//          NODE_PATH=/root/tools/pw/node_modules node tools/test/smoke.cjs [uitvoermap]
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/dhm/shots';
const URL = process.env.URL || 'http://127.0.0.1:8766/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 960, height: 440 }, deviceScaleFactor: 1 });
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL); await p.waitForTimeout(3200);
  await p.screenshot({ path: `${out}/0-splash.png` });
  await p.click('#splash'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/1-menu.png` });
  await p.click('[data-go=tournament]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/2-select.png` });
  await p.click('#selOk'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/3-bracket.png` });
  await p.click('#bracketGo'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/4-loading.png` });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/5-intro.png` });
  // ceremonie overslaan: wacht tot hajime (in speltijd ~5,5 s; headless loopt traag)
  for (let i = 0; i < 60; i++) { if (await p.evaluate(() => __game.G?.match.phase === 'fight')) break; await p.waitForTimeout(500); }
  await p.keyboard.down('KeyD'); await p.waitForTimeout(1200); await p.keyboard.up('KeyD');
  for (const k of ['KeyJ', 'KeyK']) { await p.keyboard.press(k); await p.waitForTimeout(250); }
  await p.keyboard.down('KeyS'); await p.keyboard.press('KeyK'); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/6-lowkick.png` }); await p.keyboard.up('KeyS');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/7-fight.png` });
  const st = await p.evaluate(() => { const g = __game.G; return { phase: g.match.phase, timer: g.match.timer, aka: { x: g.aka.x, ki: g.aka.ki, st: g.aka.state }, shiro: { x: g.shiro.x, ki: g.shiro.ki, legs: g.shiro.legs, st: g.shiro.state } }; });
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log(JSON.stringify({ st, fps }));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'geen fouten');
  await b.close();
})();
