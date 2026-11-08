// Test van het gevechtssysteem: raakdetectie (alle technieken, Ushiro Mawashi Geri), combolimiet,
// blok/perfect blok/kaeshi, kiai-uitbraak, rand van de mat, tai sabaki, double tap en axe kick.
// NODE_PATH=/root/tools/pw/node_modules node tools/test/mechanics.cjs
const { chromium } = require('playwright-core');
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 320, height: 200 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => {
    const F = await import('./src/game/fighter.js'); const { MOVES } = await import('./src/data/moves.js');
    const NONE = { dir: 'n', move: 0, uke: false, pressed: {} };
    window.T = {
      MOVES, F,
      setup(a = 'amir', b = 'yassin') {
        __game.pause(true);
        __game.startFight({ mode: 'versus', akaId: a, shiroId: b, akaCtrl: 'dummy', shiroCtrl: 'dummy', roundTime: 999 });
        const G = __game.G; G.match.script = []; G.match.phase = 'fight';
        this.G = G; this.log = [];
        for (const f of [G.aka, G.shiro]) { f.state = 'idle'; f.onEvent = (type, d) => this.log.push({ type, by: d.fighter === G.aka ? 'aka' : 'shiro', perfect: d.perfect, low: d.low, target: d.hit?.target, combo: d.combo }); }
        return G;
      },
      place(ax, sx) { const G = this.G; G.aka.reset(ax, 1); G.shiro.reset(sx, -1); for (const f of [G.aka, G.shiro]) { f.ki = f.kiMax; f.legs = f.body = 0; f.state = 'idle'; f.cur = JSON.parse(JSON.stringify(f.tmp)); } G.match.phase = 'fight'; this.log = []; },
      // stap de simulatie; inA/inB: functies (t) → input
      run(sec, inA = () => NONE, inB = () => NONE, dt = 1 / 120, each) {
        const G = this.G, a = G.aka, s = G.shiro;
        for (let t = 0; t < sec; t += dt) {
          if (G.match.phase === 'fight') { a.handleInput(inA(t), s, G.match); s.handleInput(inB(t), a, G.match); }
          a.update(dt, s, G.match); s.update(dt, a, G.match); F.separate(a, s, __game.G === G ? 4.6 : 4.6); G.match.update(dt);
          if (each) each(t);
        }
      },
      once(input) { let used = false; return () => { if (used) return { dir: input.dir || 'n', move: 0, uke: !!input.holdUke, pressed: {} }; used = true; return { dir: 'n', move: 0, uke: false, pressed: {}, ...input }; }; },
      hits(by = 'aka') { return this.log.filter(e => e.type === 'hit' && e.by === by).length; },
    };
  });

  // 1. Raakdetectie per techniek: raakt op het zichtbare bereik, mist ruim daarbuiten
  const reachRes = await p.evaluate(() => {
    const out = []; T.setup();
    for (const [id, m] of Object.entries(T.MOVES)) {
      if (!m.hits) continue;
      const res = {};
      for (const [label, gap] of [['dichtbij', 0.75], ['bereik', m.reach - 0.08], ['te ver', m.reach + (m.travel || 0) + 0.75]]) {
        T.place(-gap / 2, gap / 2); T.G.aka.startMove(id, {});
        T.run(m.end * 1.2 + 0.1);
        res[label] = T.hits('aka');
      }
      out.push({ id, n: m.hits.length, ...res });
    }
    return out;
  });
  const okDichtbij = reachRes.filter(r => r.dichtbij >= 1).length, okBereik = reachRes.filter(r => r.bereik >= 1).length, okVer = reachRes.filter(r => r['te ver'] === 0).length;
  for (const r of reachRes) if (!(r.bereik >= 1 && r['te ver'] === 0)) console.log('   ', JSON.stringify(r));
  ok(okBereik === reachRes.length, `alle ${reachRes.length} technieken raken op hun zichtbare bereik (${okBereik}/${reachRes.length})`);
  ok(okVer === reachRes.length, `geen enkele techniek raakt ver buiten bereik (${okVer}/${reachRes.length})`);
  ok(okDichtbij >= reachRes.length - 2, `technieken raken ook van dichtbij (${okDichtbij}/${reachRes.length})`);

  // 2. Ushiro Mawashi Geri op verschillende afstanden
  const um = await p.evaluate(() => {
    const out = []; T.setup('yassin', 'amir');
    for (const gap of [0.8, 0.95, 1.05, 1.15, 1.3]) { T.place(-gap / 2, gap / 2); T.G.aka.startMove('ushiro_mawashi', {}); T.run(1.2); out.push([gap, T.hits('aka')]); }
    return out;
  });
  ok(um.filter(([g, h]) => g <= 1.15 && h === 1).length === 4, `Ushiro Mawashi Geri raakt op 0,8-1,15 m: ${um.map(([g, h]) => `${g}m→${h ? 'raak' : 'mis'}`).join(', ')}`);

  // 3. Combolimiet: aanvaller blijft drukken, verdediger houdt UKE vast zodra hij kan
  const combo = await p.evaluate(() => {
    T.setup('anjay', 'leo'); T.place(-0.45, 0.45);
    let maxRun = 0, run = 0;
    const spam = t => ({ dir: (Math.floor(t * 7) % 2) ? 'f' : 'n', move: 0, uke: false, pressed: { tsuki: true, geri: Math.floor(t * 5) % 3 === 0 } });
    const def = () => ({ dir: 'n', move: 0, uke: T.hits('aka') > 0, pressed: {} });
    let lastLen = 0;
    T.run(5, spam, def, 1 / 120, () => {
      for (const e of T.log.slice(lastLen)) { if (e.type === 'hit' && e.by === 'aka') { run++; maxRun = Math.max(maxRun, run); } if (e.type === 'block' && e.by === 'aka') run = 0; }
      lastLen = T.log.length;
    });
    return { maxRun, hits: T.hits('aka'), blocks: T.log.filter(e => e.type === 'block' && e.by === 'aka').length };
  });
  ok(combo.maxRun <= 3, `maximaal ${combo.maxRun} treffers achter elkaar (limiet 3), daarna kan de verdediger blokken`);
  ok(combo.blocks >= 5, `verdediger blokt de rest van de aanvallen (${combo.blocks} blokken, ${combo.hits} treffers in 5 s)`);

  // 4. Blok geeft voordeel en een counter-venster
  const adv = await p.evaluate(() => {
    T.setup('amir', 'yassin'); T.place(-0.45, 0.45);
    T.G.aka.startMove('seiken_gyaku', {});
    let shiroFree = null, akaFree = null, t0 = null;
    const holdBlock = () => ({ dir: 'n', move: 0, uke: true, pressed: {} });
    T.G.shiro.ukeAt = -9; T.G.shiro.state = 'block';
    T.run(1.2, () => ({ dir: 'n', move: 0, uke: false, pressed: {} }), holdBlock, 1 / 240, t => {
      const blk = T.log.find(e => e.type === 'block'); if (blk && t0 === null) t0 = t;
      if (t0 !== null && shiroFree === null && T.G.shiro.stun <= 0) shiroFree = t - t0;
      if (t0 !== null && akaFree === null && T.G.aka.canAct()) akaFree = t - t0;
    });
    return { shiroFree, akaFree, counterT: T.G.shiro.stats.blocked };
  });
  ok(adv.shiroFree !== null && adv.akaFree !== null && adv.shiroFree < adv.akaFree, `na een blok is de verdediger eerder vrij (${(adv.shiroFree * 1000) | 0} ms) dan de aanvaller (${(adv.akaFree * 1000) | 0} ms)`);

  // 5. Perfect blok → aanvaller wankelt → kaeshi raakt
  const perf = await p.evaluate(() => {
    T.setup('amir', 'yassin'); T.place(-0.45, 0.45);
    const a = T.G.aka; a.startMove('seiken_gyaku', {});
    const hitAt = a.move.hits[0].t * a.scale;
    let pressedCounter = false;
    const def = t => {
      if (t > hitAt - 0.1 && t < hitAt + 0.2) return { dir: 'n', move: 0, uke: true, pressed: {} };
      if (t >= hitAt + 0.2 && !pressedCounter) { pressedCounter = true; return { dir: 'f', move: 0, uke: false, pressed: { tsuki: true } }; }
      return { dir: 'n', move: 0, uke: false, pressed: {} };
    };
    T.run(1.4, () => ({ dir: 'n', move: 0, uke: false, pressed: {} }), def);
    return { perfect: T.log.some(e => e.type === 'block' && e.perfect), kaeshi: T.log.some(e => e.type === 'kaeshi' && e.by === 'shiro'), counterHit: T.hits('shiro') };
  });
  ok(perf.perfect, 'UKE net voor de treffer = PERFECT UKE');
  ok(perf.kaeshi && perf.counterHit >= 1, 'na het perfecte blok raakt de kaeshi (counter)');

  // 6. Kiai-uitbraak uit een combo
  const burst = await p.evaluate(() => {
    T.setup('anjay', 'leo'); T.place(-0.45, 0.45); T.G.shiro.meter = 60;
    const spam = () => ({ dir: 'n', move: 0, uke: false, pressed: { tsuki: true } });
    const def = () => ({ dir: 'n', move: 0, uke: false, pressed: { kiai: T.hits('aka') >= 1 } });
    T.run(1.5, spam, def);
    return { burst: T.log.some(e => e.type === 'burst'), meter: T.G.shiro.meter };
  });
  ok(burst.burst && burst.meter < 60, 'KIAI tijdens een combo breekt uit (kost 1/3 meter)');

  // 7. Rand van de mat: verdediger met de rug naar de rand wordt er niet af geslagen; aanvaller krijgt de terugslag
  const edge = await p.evaluate(() => {
    T.setup('dave', 'leo'); T.place(3.7, 4.4); // shiro met de rug naar de rand (rand 4,6)
    let maxX = 0;
    const spam = t => ({ dir: ['n', 'f', 'd', 'df'][Math.floor(t * 3) % 4], move: 1, uke: false, pressed: { tsuki: Math.floor(t * 6) % 2 === 0, geri: Math.floor(t * 6) % 2 === 1 } });
    T.run(5, spam, () => ({ dir: 'n', move: 0, uke: false, pressed: {} }), 1 / 120, () => { maxX = Math.max(maxX, T.G.shiro.x); });
    return { maxX, jogai: T.G.shiro.score.jogai, phase: T.G.match.phase, hits: T.hits('aka') };
  });
  ok(edge.maxX <= 4.6 - 0.12 + 0.001 && edge.jogai === 0, `geen jogai door terugslag: shiro bleef binnen ${edge.maxX.toFixed(2)} m na ${edge.hits} treffers`);

  // 8. Tai sabaki: uit de hoek om de tegenstander heen
  const sab = await p.evaluate(() => {
    T.setup('dave', 'leo'); T.place(3.8, 4.45);
    T.run(0.7, () => ({ dir: 'n', move: 0, uke: false, pressed: {} }), T.once({ uke: true, dir: 'u' }));
    return { shiro: T.G.shiro.x, aka: T.G.aka.x, facing: T.G.shiro.facing };
  });
  ok(sab.shiro < sab.aka && sab.facing === 1, `tai sabaki: shiro staat nu aan de binnenkant (${sab.shiro.toFixed(2)} < ${sab.aka.toFixed(2)}) en kijkt de goede kant op`);
  const dodge = await p.evaluate(() => {
    T.setup('yassin', 'leo'); T.place(-0.5, 0.5);
    T.G.aka.startMove('jodan_mawashi', {});
    T.run(1.0, () => ({ dir: 'n', move: 0, uke: false, pressed: {} }), T.once({ uke: true, dir: 'u' }));
    return { dodged: T.log.some(e => e.type === 'dodge') || T.hits('aka') === 0 };
  });
  ok(dodge.dodged, 'tai sabaki ontwijkt een hoge trap');

  // 9. Double tap: laag én hoog; tegen sune uke wordt laag geblokt maar raakt hoog
  const dt = await p.evaluate(() => {
    const r = {};
    T.setup('djordy', 'leo'); T.place(-0.5, 0.5); T.G.aka.startMove('double_tap', {}); T.run(1.2); r.idle = T.log.filter(e => e.type === 'hit').map(e => e.target);
    T.place(-0.5, 0.5); T.G.aka.startMove('double_tap', {}); T.G.shiro.state = 'lowblock'; T.G.shiro.ukeAt = -9;
    T.run(1.2, undefined, () => ({ dir: 'd', move: 0, uke: true, pressed: {} }));
    r.low = { blocked: T.log.filter(e => e.type === 'block').length, hit: T.log.filter(e => e.type === 'hit').map(e => e.target) };
    return r;
  });
  ok(dt.idle.join() === 'gedan,jodan', `double tap raakt laag en hoog (${dt.idle.join(' → ')})`);
  ok(dt.low.blocked === 1 && dt.low.hit.join() === 'jodan', 'tegen sune uke: laag geblokt, hoog raak');

  // 10. Axe kick
  const axe = await p.evaluate(() => {
    T.setup('roshni', 'leo'); const out = [];
    for (const gap of [0.8, 1.0, 1.1]) { T.place(-gap / 2, gap / 2); T.G.aka.startMove('kakato_otoshi', {}); T.run(1.0); out.push(T.hits('aka')); }
    return out;
  });
  ok(axe.every(h => h === 1), `axe kick raakt op 0,8 / 1,0 / 1,1 m (${axe.join(', ')})`);

  console.log(errs.length ? 'FOUTEN:\n' + errs.join('\n') : 'geen JS-fouten'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
