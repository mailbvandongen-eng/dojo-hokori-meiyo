// Regeltest: AI tegen AI, complete wedstrijden zonder renderen. Controleert dat elke
// wedstrijd eindigt (ippon/awasete/hantei/waza-ari/hansoku) en logt scheidsrechterscommando's.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/rules.cjs [aantal]
const { chromium } = require('playwright-core');
const N = +(process.argv[2] || 6);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 320, height: 200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(1200);
  const results = [];
  for (let i = 0; i < N; i++) {
    const r = await p.evaluate(async ([i, RT]) => {
      const ids = ['wesley', 'skylar', 'djordy', 'daan', 'roshni', 'yassin', 'anjay', 'conchita', 'nino', 'seth'];
      const a = ids[i % ids.length], b = ids[(i * 3 + 1) % ids.length] === a ? 'dave' : ids[(i * 3 + 1) % ids.length];
      __game.pause(true);
      let ended = null; const calls = [];
      __game.startFight({ mode: 'versus', akaId: a, shiroId: b, akaCtrl: 'ai', shiroCtrl: 'ai', diff: 'sensei', roundTime: RT });
      const G = __game.G, h = G.match.h;
      const oc = h.call; h.call = (k, o) => { calls.push(k); };
      h.end = (w, how) => { ended = { w: w.data.naam, how }; };
      h.knockdown = (v, a, kd) => calls.push('KD(' + (kd.finisher ? 'fin' : kd.cause || 'ki') + ')'); h.count = () => {}; h.votes = v => calls.push('votes:' + v.join('/'));
      let t = 0;
      while (!ended && t < 1500) { __game.sim(1 / 60, 60); t += 1; }
      return { a, b, ended, t, rounds: G.match.round, hits: [G.aka.stats.clean, G.shiro.stats.clean], ki: [Math.round(G.aka.ki), Math.round(G.shiro.ki)], score: { aka: G.aka.score, shiro: G.shiro.score }, calls: calls.filter(c => !['kamaete', 'shomen_ni_rei', 'otagai_ni_rei'].includes(c)).join(' ') };
    }, [i, +(process.env.RT || 120)]);
    results.push(r); console.log(JSON.stringify(r));
  }
  const stuck = results.filter(r => !r.ended);
  console.log(`${results.length - stuck.length}/${results.length} beëindigd`, errs.length ? 'FOUTEN: ' + errs.join('; ') : 'geen fouten');
  await b.close();
  process.exit(stuck.length || errs.length ? 1 : 0);
})();
