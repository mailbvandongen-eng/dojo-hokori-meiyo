// AI tegen AI: een reeks beelden uit een echt gevecht (vloeiendheid, afstand, overgangen).
// NODE_PATH=/root/tools/pw/node_modules node tools/test/fight.cjs [uitvoer.png]
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(process.env.URL || 'http://127.0.0.1:8766/'); await p.waitForTimeout(1500);
  const A = process.env.AKA || 'djordy', S = process.env.SHIRO || 'seth';
  await p.evaluate(ids => __game.preload(ids), [A, S]);
  await p.evaluate(([A, S]) => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); __game.startFight({ mode: 'versus', akaId: A, shiroId: S, akaCtrl: 'ai', shiroCtrl: 'ai', diff: 'sensei', roundTime: 999 }); __game.pause(true); const G = __game.G; G.match.script = []; G.match.phase = 'fight'; G.aka.reset(-0.9, 1); G.shiro.reset(0.9, -1); document.getElementById('hud').classList.remove('on'); }, [A, S]);
  const N = Number(process.env.N || 24), DT = Number(process.env.DT || 0.25), files = [], log = [];
  for (let i = 0; i < N; i++) {
    for (let t = 0; t < DT - 1e-6; t += 1 / 60) await p.evaluate(() => __game.step(1 / 60));
    await p.evaluate(() => { const G = __game.G, cx = (G.aka.x + G.shiro.x) / 2; __game.camera([cx, 1.35, 3.3], [cx, 1.0, 0]); });
    const f = `/tmp/dhm/fight-${i}.png`; await p.screenshot({ path: f }); files.push(f);
    log.push(await p.evaluate(() => { const G = __game.G; return `${G.aka.state}${G.aka.moveId && G.aka.state === 'attack' ? ':' + G.aka.moveId : ''} / ${G.shiro.state}${G.shiro.moveId && G.shiro.state === 'attack' ? ':' + G.shiro.moveId : ''} gap ${Math.abs(G.aka.x - G.shiro.x).toFixed(2)}`; }));
  }
  console.log(log.map((l, i) => `${(i * DT + DT).toFixed(2)}s ${l}`).join('\n'));
  const out = process.argv[2] || '/tmp/dhm/fight.png';
  require('child_process').execSync(`python3 -c "
from PIL import Image
fs='${files.join(',')}'.split(',')
W,H=400,300; c=6
s=Image.new('RGB',(W*c,H*((len(fs)+c-1)//c)))
for i,f in enumerate(fs): s.paste(Image.open(f),((i%c)*W,(i//c)*H))
s.save('${out}')"`);
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'geen fouten');
  await b.close();
})();
