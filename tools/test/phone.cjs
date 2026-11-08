// Telefoonweergave (liggend, touch): menu, gevecht met touch-knoppen, uitslagscherm.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/phone.cjs [uitvoermap]
const { chromium, devices } = require('playwright-core');
const out = process.argv[2] || '/tmp/dhm/phone';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(3000);
  await p.tap('#splash'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/1-menu.png` });
  await p.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); __game.startFight({ mode: 'versus', akaId: 'skylar', shiroId: 'wesley', akaCtrl: 'solo', shiroCtrl: 'ai', roundTime: 120 }); __game.pause(true); __game.sim(1 / 60, 60 * 9); __game.pause(false); __game.setCam('fight'); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/2-fight.png` });
  // laat de AI voor de speler vechten tot het einde
  await p.evaluate(() => { const { AI } = window; const G = __game.G; delete G.ctrl.aka; __game.pause(true); });
  await p.evaluate(async () => { const m = await import('./src/game/ai.js'); const G = __game.G; G.ai.aka = new m.AI(G.aka, 'shihan'); let t = 0; while (G.match.phase !== 'ended' && t < 600) { __game.sim(1 / 60, 60); t++; } __game.sim(1 / 60, 60 * 8); __game.pause(false); });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/3-result.png` });
  console.log(errs.join('\n') || 'geen fouten');
  await b.close();
})();
