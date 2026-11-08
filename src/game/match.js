// Wedstrijdverloop volgens Kyokushin-knockdownregels (vereenvoudigd, zie docs/GDD.md §4):
//  rei-ceremonie → Hajime → hon-sen (2 of 3 min) → hantei → encho-sen (max. 2) → beslissing.
//  Knock-down < 3 s = waza-ari, ≥ 3 s of niet meer kunnen = ippon. 2× waza-ari = awasete ippon.
//  2× chui = genten; 2× genten = hansoku (diskwalificatie).
//  Hantei: scheidsrechter + hoekscheidsrechters stemmen; meerderheid wint, anders hikiwake.

export class Match {
  constructor({ aka, shiro, arena, hooks, config }) {
    this.aka = aka; this.shiro = shiro; this.arena = arena; this.h = hooks;
    this.cfg = { roundTime: 120, enchoTime: 120, maxEncho: 2, rules: 'toernooi', training: false, ...config };
    this.rules = this.cfg.rules;
    this.round = 0; // 0 = hon-sen, 1..n = encho-sen
    this.timer = this.cfg.roundTime;
    this.phase = 'intro'; this.script = []; this.scriptT = 0; this.winner = null; this.result = null;
    this.kd = null; this.timers = [];
  }
  // vertraagde actie in speltijd (stopt mee bij pauze en slow motion)
  later(t, fn) { this.timers.push({ t, fn }); }

  get fighting() { return this.phase === 'fight'; }
  other(f) { return f === this.aka ? this.shiro : this.aka; }

  // tijdlijn van korte stappen (ceremonie, scheidsrechtersgebaren)
  run(steps) { this.script = steps.slice(); this.scriptT = 0; }
  call(key, opts) { this.h.call(key, opts); }

  start() {
    const { aka, shiro, arena } = this;
    aka.reset(-1.5, 1); shiro.reset(1.5, -1);
    for (const f of [aka, shiro]) f.state = 'stand';
    arena.ref.pose('refStand'); arena.flags(null);
    if (this.cfg.training) { this.phase = 'fight'; this.timer = Infinity; for (const f of [aka, shiro]) f.state = 'idle'; return; }
    this.phase = 'intro';
    this.run([
      [0.6, () => this.call('shomen_ni_rei')],
      [0.5, () => { aka.state = shiro.state = 'rei'; }],
      [1.1, () => { aka.state = shiro.state = 'stand'; this.call('otagai_ni_rei'); }],
      [0.5, () => { aka.state = shiro.state = 'rei'; }],
      [1.1, () => { aka.state = shiro.state = 'osu'; this.h.shout(aka, 'osu'); this.h.shout(shiro, 'osu'); }],
      [0.9, () => { aka.state = shiro.state = 'idle'; this.call('kamaete'); }],
      [0.8, () => this.hajime()],
    ]);
  }

  hajime(cont = false) {
    this.arena.ref.pose('refHajime', 9);
    this.call(cont ? 'tsuzukete' : 'hajime', { big: true });
    this.phase = 'fight';
    this.later(0.7, () => this.arena.ref.pose('refStand', 4));
  }

  yame(then) {
    this.phase = 'yame';
    this.arena.ref.pose('refYame', 9);
    this.call('yame');
    for (const f of [this.aka, this.shiro]) if (f.state !== 'down') { f.state = 'idle'; f.vx = 0; f.queue = []; }
    this.run(then);
  }

  resetPositions() {
    const { aka, shiro } = this;
    aka.reset(-1.5, 1); shiro.reset(1.5, -1);
  }

  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    if (this.script.length) {
      this.scriptT += dt;
      while (this.script.length && this.scriptT >= this.script[0][0]) { this.scriptT -= this.script[0][0]; this.script.shift()[1](); }
    }
    if (this.phase === 'fight') {
      this.timer -= dt;
      if (this.timer <= 0) { this.timer = 0; this.timeUp(); return; }
      // jogai: buiten het wedstrijdvlak
      for (const f of [this.aka, this.shiro]) {
        if (Math.abs(f.x) > this.arena.bounds - 0.05 && !this.cfg.training) {
          f.score.jogai++;
          this.yame([[0.5, () => this.call('jogai')], [0.6, () => { if (f.score.jogai % 3 === 0) this.foul(f, 'jogai'); this.resetPositions(); }], [0.8, () => this.hajime(true)]]);
          return;
        }
      }
    }
    if (this.phase === 'knockdown') this.updateKnockdown(dt);
  }

  // ── Knock-down en telling ──
  knockdown(victim, attacker, kd) {
    if (this.phase !== 'fight') return;
    if (this.cfg.training) { this.later(1.2, () => { victim.getUp(); victim.ki = victim.kiMax; victim.legs = victim.body = 0; }); return; }
    this.phase = 'knockdown';
    const finished = kd.finisher || victim.ki <= 0;
    // hersteltijd: hoe minder ki, hoe langer
    const kiFrac = Math.max(0, victim.ki / victim.kiMax);
    const upAt = finished ? Infinity : 1.3 + Math.random() * 1.2 + (1 - kiFrac) * 1.4 + (kd.cause === 'legs' ? 0.4 : 0);
    this.kd = { victim, attacker, t: 0, upAt, counted: 0, kd };
    attacker.queue = []; attacker.chainOk = false; // de aanvaller maakt de techniek af (geen sprong naar rust)
    this.arena.ref.pose('refYame', 9);
    this.h.knockdown(victim, attacker, kd);
  }

  updateKnockdown(dt) {
    const k = this.kd; k.t += dt;
    const n = Math.floor(k.t - 0.4);
    if (n >= 1 && n > k.counted && n <= 5) { k.counted = n; this.h.count(n); }
    if (k.t >= k.upAt && k.victim.state === 'down') {
      k.victim.getUp();
      const ippon = k.upAt > 3.0;
      this.phase = 'scoring';
      const scorer = k.attacker;
      if (ippon) return this.award(scorer, 'ippon');
      scorer.score.wazaari++;
      const side = scorer.corner === 'aka' ? 'Aka' : 'Shiro';
      this.arena.ref.pose('refWaza' + side, 7);
      if (scorer.score.wazaari >= 2) return this.award(scorer, 'awasete');
      this.call('waza_ari', { big: true, side: scorer.corner });
      this.h.score();
      this.run([[1.6, () => { k.victim.legs *= 0.5; k.victim.body *= 0.5; k.victim.ki = Math.max(k.victim.ki, k.victim.kiMax * 0.25); this.resetPositions(); this.arena.ref.pose('refStand'); }], [0.9, () => this.hajime(true)]]);
    } else if (k.upAt === Infinity && k.t > 3.4) {
      this.phase = 'scoring';
      this.award(k.attacker, 'ippon');
    }
  }

  // ── Overtredingen ──
  foul(f, kind) {
    f.score.chui++;
    this.call('chui', { side: f.corner, sub: kind === 'kao' ? 'Stoot naar het gezicht' : kind === 'jogai' ? 'Herhaald buiten de mat' : '' });
    if (f.score.chui >= 2) {
      f.score.chui = 0; f.score.genten++;
      this.later(0.9, () => this.call('genten', { side: f.corner }));
      if (f.score.genten >= 2) this.later(1.8, () => this.award(this.other(f), 'hansoku'));
    }
    this.h.score();
  }

  // ── Tijd om → hantei ──
  timeUp() {
    this.phase = 'hantei';
    this.h.timeUp();
    for (const f of [this.aka, this.shiro]) { f.state = 'idle'; f.vx = 0; f.queue = []; }
    // waza-ari beslist direct
    const wa = this.aka.score.wazaari - this.shiro.score.wazaari;
    this.run([
      [0.8, () => { this.call('yame'); this.arena.ref.pose('refYame'); this.resetPositions(); for (const f of [this.aka, this.shiro]) f.state = 'stand'; }],
      [1.4, () => { this.call('hantei', { big: true }); this.arena.ref.pose('refHantei'); }],
      [1.0, () => {
        if (wa !== 0) { const w = wa > 0 ? this.aka : this.shiro; this.showVotes(Array(this.voters).fill(w.corner)); return this.after(0.9, () => this.award(w, 'wazaari-yusei')); }
        const final = this.round >= this.cfg.maxEncho;
        const votes = this.judgeVotes(final);
        this.showVotes(votes);
        const ak = votes.filter(v => v === 'aka').length, sh = votes.filter(v => v === 'shiro').length;
        const need = Math.floor(votes.length / 2) + 1;
        if (ak >= need) this.after(1.2, () => this.award(this.aka, 'hantei'));
        else if (sh >= need) this.after(1.2, () => this.award(this.shiro, 'hantei'));
        else this.after(1.2, () => this.encho());
      }],
    ]);
  }
  get voters() { return 1 + this.arena.judges.length; }
  after(t, fn) { this.script.push([t, fn]); }

  // Elke scheidsrechter weegt schade, schone treffers, initiatief en strafpunten, met eigen ruis.
  judgeVotes(final) {
    const val = f => f.stats.dealt * 1 + f.stats.clean * 1.5 + f.stats.forward * 0.6 + (f.kiMax - f.ki) * -0.2 - f.score.genten * 40 - f.score.chui * 6;
    const base = val(this.aka) - val(this.shiro);
    const votes = [];
    for (let i = 0; i < this.voters; i++) {
      const d = base + (Math.random() - 0.5) * 18;
      if (!final && Math.abs(d) < 8) votes.push('draw');
      else votes.push(d >= 0 ? 'aka' : 'shiro');
    }
    return votes;
  }
  showVotes(votes) {
    // stem 0 = scheidsrechter (handgebaar), de rest = vlaggen van de hoekscheidsrechters
    const r = votes[0];
    this.arena.ref.pose(r === 'aka' ? 'refWazaAka' : r === 'shiro' ? 'refWazaShiro' : 'refHikiwake', 7);
    this.arena.flags(votes.slice(1));
    this.h.votes(votes);
  }

  encho() {
    this.round++;
    this.call('hikiwake');
    this.run([
      [1.3, () => { this.call('encho', { big: true, sub: `Verlenging ${this.round}` }); this.arena.flags(null); this.arena.ref.pose('refStand'); }],
      [1.2, () => { this.timer = this.cfg.enchoTime; for (const f of [this.aka, this.shiro]) { f.stats = { dealt: 0, clean: 0, forward: 0, attacks: 0 }; f.state = 'idle'; } this.resetPositions(); this.call('kamaete'); }],
      [0.9, () => this.hajime()],
    ]);
  }

  award(winner, how) {
    if (this.phase === 'ended') return;
    this.phase = 'ended'; this.winner = winner; this.result = how;
    const side = winner.corner === 'aka' ? 'Aka' : 'Shiro';
    const loser = this.other(winner);
    if (how === 'ippon' || how === 'awasete' || how === 'hansoku') {
      this.arena.ref.pose('refIppon' + side, 6);
      this.call(how === 'awasete' ? 'awasete' : how === 'hansoku' ? 'hansoku' : 'ippon', { big: true, side: winner.corner });
    }
    this.h.score();
    this.run([
      [1.6, () => { this.call(winner.corner === 'aka' ? 'aka_kachi' : 'shiro_kachi', { big: true, side: winner.corner }); winner.state = 'victory'; if (loser.state !== 'down') loser.state = 'stand'; this.arena.ref.pose('refIppon' + side, 6); this.arena.flags(Array(this.arena.judges.length).fill(winner.corner)); this.arena.cheer(1.5); }],
      [1.6, () => { winner.state = 'osu'; if (loser.state === 'down') loser.getUp(); }],
      [0.6, () => { loser.state = 'osu'; }],
      [1.4, () => this.h.end(winner, how)],
    ]);
  }
}
