// Campaign-doorloop: vechter maken → bokszak → clubtoernooi winnen (titel + vrijspelen) →
// gewichtheffen → leaderboard → WK-finale tegen Sensei Wesley (zwarte band, eindbaas vrij).
// Lokale leaderboard-server: zie server/leaderboard/README.md (wrangler dev op poort 8787).
// NODE_PATH=/root/tools/pw/node_modules node tools/test/campaign.cjs [uitvoermap]
const { chromium } = require('playwright-core');
const out = process.argv[2] || '/tmp/dhm/camp'; require('fs').mkdirSync(out, { recursive: true });
const URL = (process.env.URL || 'http://127.0.0.1:8766/') + '?lb=' + (process.env.LB || 'http://127.0.0.1:8787');
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 440 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForTimeout(2500);
  await p.click('#splash'); await p.waitForTimeout(700);
  await p.click('[data-go=campaign]'); await p.waitForTimeout(400);
  ok(await p.isVisible('#create.on'), 'scherm: vechter maken');
  await p.click('[data-g=v]'); await p.fill('#crName', 'Testkampioen'); await p.click('[data-k=knot]'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/1-create.png` });
  await p.click('#crGo'); await p.waitForTimeout(800);
  ok(await p.isVisible('#camp.on'), 'hub geopend');
  const c0 = await p.evaluate(() => __game.campaign.career);
  ok(c0.geslacht === 'v' && c0.xp === 0 && c0.next === 'training', 'meisje, witte band, eerst training');
  ok(await p.evaluate(() => __game.campaign.me().graad.kyu === 10), '10e kyu (witte band)');
  await p.screenshot({ path: `${out}/2-hub.png` });

  // bokszak
  await p.click('[data-tr=bokszak]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/3-bokszak.png` });
  await p.evaluate(() => { const s = __game.campaign.session; for (const n of s.notes) { s.t = n.t; s.bagInput(n.type); } s.t = s.duration + 0.1; s.update(0.016); });
  await p.waitForTimeout(1500);
  ok(await p.isVisible('#result.on'), 'trainingsresultaat');
  await p.screenshot({ path: `${out}/4-training-result.png` });
  const c1 = await p.evaluate(() => __game.campaign.career);
  ok(c1.xp >= 140 && c1.next === 'toernooi', `training leverde ${c1.xp} XP op, nu toernooi`);
  await p.click('#resNext'); await p.waitForTimeout(600);

  // clubtoernooi winnen
  await p.click('#campGoT'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/5-bracket.png` });
  for (let round = 0; round < 3; round++) {
    const t = await p.evaluate(() => ({ champ: __game.tourney.champion, out: __game.tourney.out }));
    if (t.champ || t.out) break;
    await p.click('#bracketGo'); await p.waitForTimeout(1700);
    await p.evaluate(() => { __game.pause(true); const G = __game.G; G.match.phase = 'fight'; G.match.award(G.aka, 'ippon'); __game.sim(1 / 60, 60 * 7); __game.pause(false); });
    await p.waitForTimeout(1200);
    if (round === 0) await p.screenshot({ path: `${out}/6-win.png` });
    const champ = await p.evaluate(() => __game.tourney.champion);
    if (champ) break;
    await p.click('#resNext'); await p.waitForTimeout(500);
  }
  await p.screenshot({ path: `${out}/7-champion.png` });
  const c2 = await p.evaluate(() => ({ c: __game.campaign.career, unlocks: __game.profile.unlocks, t2: document.querySelector('#resTitle2').innerText }));
  ok(c2.c.titles[0]?.titel === 'Clubkampioen' && /CLUBKAMPIOEN/.test(c2.t2), 'titel Clubkampioen op het overwinningsscherm');
  ok(c2.unlocks[0] === 'daan', `vrijgespeeld: ${c2.unlocks.join(',')} (verwacht eerst de lagere senpai)`);
  ok(c2.c.tIndex === 1 && c2.c.next === 'training', 'volgende: training, daarna regiotoernooi');
  await p.click('#resNext'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/8-hub-na-titel.png` });

  // upgrade
  const before = await p.evaluate(() => __game.campaign.career.levels.kracht);
  await p.click('[data-up=kracht]'); await p.waitForTimeout(300);
  ok(await p.evaluate(b => __game.campaign.career.levels.kracht === b + 1, before), 'upgrade kracht +1');

  // gewichtheffen
  await p.click('[data-tr=gewicht]'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = __game.campaign.session; s.needle = s.zoneC; s.weightInput(); for (let i = 0; i < 30; i++) s.update(1 / 30); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/9-gewicht.png` });
  await p.evaluate(() => { const s = __game.campaign.session; let guard = 0; while (!s.over && guard++ < 4000) { if (s.phase === 'aim') { s.needle = s.zoneC; s.weightInput(); } s.update(1 / 30); } });
  await p.waitForTimeout(1500);
  ok(await p.isVisible('#result.on'), 'gewichtheffen klaar');
  await p.click('#resNext'); await p.waitForTimeout(500);

  // leaderboard
  await p.evaluate(() => __game.openLeaders()); await p.waitForTimeout(2500);
  const lb = await p.evaluate(() => ({ st: document.querySelector('#ldStatus').innerText, rows: document.querySelectorAll('#ldList tr').length, me: !!document.querySelector('#ldList tr.me') }));
  ok(/Online/.test(lb.st) && lb.me, `leaderboard online (${lb.rows - 1} rijen, eigen rij gemarkeerd)`);
  await p.screenshot({ path: `${out}/10-leaderboard.png` });
  await p.click('#ldClose');

  // WK-finale: zet de loopbaan vooruit
  await p.evaluate(async () => {
    const { UNLOCK_ORDER } = await import('./src/data/unlocks.js');
    const c = JSON.parse(localStorage.getItem('dhm-career-v1'));
    c.xp = 5600; c.tIndex = 6; c.next = 'toernooi'; localStorage.setItem('dhm-career-v1', JSON.stringify(c));
    const pr = JSON.parse(localStorage.getItem('dhm-profile-v1')); pr.unlocks = UNLOCK_ORDER.slice(); localStorage.setItem('dhm-profile-v1', JSON.stringify(pr));
  });
  await p.goto(URL); await p.waitForTimeout(2200); await p.click('#splash'); await p.waitForTimeout(500);
  await p.click('[data-go=campaign]'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/11-hub-wk.png` });
  await p.click('#campGoT'); await p.waitForTimeout(600);
  let finalOpp = null;
  for (let round = 0; round < 3; round++) {
    finalOpp = await p.evaluate(() => { const t = __game.tourney, m = t.rounds[t.r].find(m => m.a === 'me' || m.b === 'me'); return m.a === 'me' ? m.b : m.a; });
    await p.click('#bracketGo'); await p.waitForTimeout(1700);
    await p.evaluate(() => { __game.pause(true); const G = __game.G; G.match.phase = 'fight'; G.match.award(G.aka, 'ippon'); __game.sim(1 / 60, 60 * 7); __game.pause(false); });
    await p.waitForTimeout(1200);
    if (await p.evaluate(() => __game.tourney.champion)) break;
    await p.click('#resNext'); await p.waitForTimeout(500);
  }
  await p.screenshot({ path: `${out}/12-wereldkampioen.png` });
  const c3 = await p.evaluate(() => ({ c: __game.campaign.career, g: __game.campaign.me().graad, unlocks: __game.profile.unlocks }));
  ok(finalOpp === 'wesley', `WK-finale tegen ${finalOpp}`);
  ok(c3.c.done && c3.g.dan === 1, 'campaign uitgespeeld met de zwarte band (1e dan)');
  ok(c3.c.titles.some(t => t.titel === 'Wereldkampioen'), 'titel Wereldkampioen');
  ok(c3.unlocks.includes('wesley'), 'Sensei Wesley vrijgespeeld als allerlaatste');
  console.log(errs.length ? 'FOUTEN:\n' + errs.join('\n') : 'geen JS-fouten');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
