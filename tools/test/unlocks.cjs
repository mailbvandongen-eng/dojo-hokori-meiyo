// Modus Toernooi: winst speelt de volgende senpai/sensei vrij; als alles vrij is staat Sensei Wesley
// in de finale en speelt een overwinning op hem de eindbaas vrij.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/unlocks.cjs
const { chromium } = require('playwright-core');
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 440 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const URL = process.env.URL || 'http://127.0.0.1:8766/';
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForTimeout(2200);
  await p.click('#splash'); await p.waitForTimeout(500);
  const winTournament = async () => {
    await p.click('[data-go=tournament]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.card[data-id=daan]').classList.contains('locked') || __game.profile.unlocks.includes('daan')), 'senpai/sensei vergrendeld tot ze vrijgespeeld zijn');
    await p.click('.card[data-id=seth]'); await p.click('#selOk'); await p.waitForTimeout(400);
    let finalOpp;
    for (let r = 0; r < 3; r++) {
      finalOpp = await p.evaluate(() => { const t = __game.tourney, m = t.rounds[t.r].find(m => m.a === 'seth' || m.b === 'seth'); return m.a === 'seth' ? m.b : m.a; });
      await p.click('#bracketGo'); await p.waitForTimeout(1700);
      await p.evaluate(() => { __game.pause(true); const G = __game.G; G.match.phase = 'fight'; G.match.award(G.aka, 'ippon'); __game.sim(1 / 60, 60 * 7); __game.pause(false); });
      await p.waitForTimeout(1100);
      if (await p.evaluate(() => __game.tourney.champion)) break;
      await p.click('#resNext'); await p.waitForTimeout(400);
    }
    const res = await p.evaluate(() => document.querySelector('#resText').innerText);
    await p.click('#resMenu'); await p.waitForTimeout(400);
    return { finalOpp, res };
  };
  const r1 = await winTournament();
  ok(/Senpai Daan/.test(r1.res) && (await p.evaluate(() => __game.profile.unlocks.join())) === 'daan', 'eerste toernooizege speelt Senpai Daan vrij');
  ok(r1.finalOpp !== 'wesley', 'nog geen Sensei Wesley in de finale');
  await p.evaluate(() => { __game.profile.unlocks.push('niesje', 'micha', 'anjay', 'dave', 'ferry', 'conchita'); localStorage.setItem('dhm-profile-v1', JSON.stringify(__game.profile)); });
  const r2 = await winTournament();
  ok(r2.finalOpp === 'wesley', 'als alles vrij is: finale tegen Sensei Wesley');
  ok((await p.evaluate(() => __game.profile.unlocks)).includes('wesley'), 'Sensei Wesley vrijgespeeld');
  ok((await p.evaluate(() => __game.profile.tWins)) === 2, 'toernooizeges geteld voor het leaderboard');
  console.log(errs.join('\n') || 'geen JS-fouten'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
