// Computer-tegenstander. Geeft hetzelfde input-object terug als een speler,
// dus de AI kan niets wat een speler niet kan.
// De stijl komt uit roster.ai (lowkick/body/head/spin/aggression/defense).

export const DIFFICULTY = {
  kohai: { label: 'Kohai (makkelijk)', react: 0.42, think: 0.38, skill: 0.45 },
  senpai: { label: 'Senpai (normaal)', react: 0.28, think: 0.26, skill: 0.7 },
  sensei: { label: 'Sensei (moeilijk)', react: 0.18, think: 0.17, skill: 0.88 },
  shihan: { label: 'Shihan (extreem)', react: 0.12, think: 0.11, skill: 1.0 },
};

const pick = (opts) => {
  let s = 0; for (const [, w] of opts) s += w;
  let r = Math.random() * s; for (const [v, w] of opts) { r -= w; if (r <= 0) return v; }
  return opts[0][0];
};

export class AI {
  constructor(fighter, level = 'senpai') {
    this.f = fighter; this.d = DIFFICULTY[level] || DIFFICULTY.senpai; this.w = fighter.data.ai;
    this.t = 0; this.cool = 0; this.plan = { move: 0, dir: 'n', uke: false }; this.press = null; this.seenAttack = null; this.reactT = 0;
    if (fighter.data.eindbaas) this.d = { ...this.d, react: this.d.react * 0.8, skill: Math.min(1, this.d.skill + 0.1) };
  }

  input(dt, opp) {
    const f = this.f, w = this.w, d = this.d;
    const inp = { dir: 'n', move: 0, uke: false, pressed: {} };
    const dist = Math.abs(opp.x - f.x);
    // reageren op een aanval na een reactietijd
    if (opp.state === 'attack' && opp.move && this.seenAttack !== opp.move) { this.seenAttack = opp.move; this.reactT = d.react * (0.7 + Math.random() * 0.6); this.defend = Math.random() < w.defense * d.skill; }
    if (opp.state !== 'attack') this.seenAttack = null;
    if (this.seenAttack && this.defend) {
      this.reactT -= dt;
      if (this.reactT <= 0 && dist < 1.8) {
        inp.uke = true; inp.dir = this.seenAttack.target === 'gedan' ? 'd' : 'n';
        return inp;
      }
    }
    this.t -= dt;
    if (this.t <= 0) {
      this.t = d.think * (0.6 + Math.random() * 0.8);
      const want = 0.75 + (1 - w.aggression) * 0.6 - w.body * 0.1; // gewenste afstand
      this.plan.move = dist > want + 0.25 ? 1 : dist < want - 0.3 ? -1 : (Math.random() < 0.3 ? (Math.random() < w.aggression ? 1 : -1) : 0);
      this.press = null;
      this.cool -= this.d.think;
      if (f.canAct() && this.cool <= 0 && dist < 1.55 && Math.random() < 0.15 + w.aggression * 0.35) {
        this.cool = 0.25 + Math.random() * 0.6 * (1.3 - w.aggression); // ademhalen tussen aanvallen
        if (f.meter >= 100 && Math.random() < 0.5 * d.skill) this.press = { btn: 'kiai', dir: 'n' };
        else if (f.meter >= 33 && Math.random() < 0.18) this.press = { btn: 'kiai', dir: pick([['n', 1], ['f', 1], ['d', 1]]) };
        else {
          const close = dist < 0.95;
          this.press = pick([
            [{ btn: 'geri', dir: 'd' }, w.lowkick * 1.4],
            [{ btn: 'tsuki', dir: 'f' }, w.body * (close ? 1.4 : 0.6)],
            [{ btn: 'tsuki', dir: 'n' }, w.body * 0.6],
            [{ btn: 'tsuki', dir: 'd' }, w.body * (close ? 0.8 : 0.2)],
            [{ btn: 'geri', dir: 'f' }, (close ? w.body : 0.3) * 0.8],
            [{ btn: 'geri', dir: 'n' }, 0.5 + w.body * 0.3],
            [{ btn: 'geri', dir: 'u' }, w.head * (dist > 0.9 ? 1 : 0.4)],
            [{ btn: 'geri', dir: 'b' }, w.spin * 0.8],
            [{ btn: 'geri', dir: 'ub' }, w.spin * w.head * 0.9 * (dist > 0.9 ? 1 : 0.3)],
            [{ btn: 'geri', dir: 'db' }, (w.spin * 0.25 + w.head * 0.15) * (dist > 1.0 ? 1 : 0.2)],
          ]);
        }
      }
    }
    inp.move = this.plan.move;
    if (f.legs > 70 && Math.random() < 0.01) inp.move = -1;
    if (this.press) {
      inp.pressed[this.press.btn] = true; inp.dir = this.press.dir; this.press = null;
      // combinatie doorzetten
    } else if (f.state === 'attack' && f.chainOk && Math.random() < d.skill * 0.5) inp.pressed[Math.random() < 0.5 ? 'tsuki' : 'geri'] = true;
    return inp;
  }
}
