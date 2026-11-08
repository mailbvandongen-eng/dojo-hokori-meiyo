// Controleert dat snel tikken op de knoppen de pagina niet inzoomt (telefoon, touch).
// NODE_PATH=/root/tools/pw/node_modules node tools/test/zoom.cjs
const { chromium, devices } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['Pixel 7 landscape'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.tap('#splash'); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); __game.startFight({ mode: 'training', training: true, akaId: 'skylar', shiroId: 'leo', akaCtrl: 'solo', shiroCtrl: 'dummy' }); });
  await p.waitForTimeout(800);
  const scale0 = await p.evaluate(() => visualViewport.scale);
  for (const sel of ['[data-btn=tsuki]', '[data-btn=geri]', '#hud', 'canvas']) for (let i = 0; i < 6; i++) { await p.tap(sel, { force: true }).catch(() => {}); await p.waitForTimeout(90); }
  await p.waitForTimeout(600);
  const scale1 = await p.evaluate(() => visualViewport.scale);
  await p.screenshot({ path: '/tmp/dhm/phone/zoom.png' });
  console.log(JSON.stringify({ scale0, scale1 }), errs.join('\n') || 'geen fouten');
  await b.close(); process.exit(scale1 > 1.01 ? 1 : 0);
})();
