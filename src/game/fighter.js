// Vechter: toestandsmachine, technieken, treffers en schade volgens Kyokushin-logica.
// Drie schadetellers naast ki (uithouding): benen (lage trappen), romp en hoofd.
import { MOVES, INPUT_MAP, CHAINS } from '../data/moves.js';
import { POSES, GUARD, blendPose, clonePose, ease } from './poses.js';
import { buildFighter } from './model.js';
import { graadNiveau } from '../data/roster.js';

const TAU = Math.PI * 2;
const MIN_GAP = 0.62;
export const LEG_KD = 130, BODY_KD = 170; // drempels voor knock-down door opgestapelde schade

export class Fighter {
  constructor(data, corner, scene, opts = {}) {
    this.data = data; this.corner = corner;
    this.model = buildFighter(data, corner, opts.costume || {});
    scene.add(this.model.group);
    const st = data.stats;
    // graad: een 10e kyu vecht op 88%, een 1e dan op 100%, een 4e dan op 104%
    // opts.scale: sterkte van de tegenstander (campaign: vroege toernooien zijn milder)
    const lvl = (0.88 + Math.min(13, graadNiveau(data.graad)) * 0.012) * (opts.scale || 1);
    this.kiMax = (210 + st.conditie * 14) * lvl;
    this.dmgMul = (0.5 + st.kracht * 0.045) * lvl;
    // techniek (campaign-upgrade; roster-vechters 7): kiai-meter en knock-downkans met hoofdtrappen
    this.tech = st.techniek ?? 7;
    this.meterMul = 0.7 + this.tech * 0.045;
    this.kdMul = 0.75 + this.tech * 0.04;
    this.speed = 1.18 - st.snelheid * 0.03;       // < 1 = sneller
    this.reachAdd = (st.bereik - 7) * 0.035 + ((data.uiterlijk?.lengte || 1) - 1) * 0.5;
    this.legDef = 1.35 - st.benen * 0.065;
    this.cur = clonePose(GUARD); this.tmp = clonePose(GUARD);
    this.reset(0, 1);
    this.score = { wazaari: 0, chui: 0, genten: 0, jogai: 0 };
    this.stats = { dealt: 0, clean: 0, forward: 0, attacks: 0 };
    this.meter = 0;
    this.ki = this.kiMax;
    this.legs = 0; this.body = 0;
  }

  reset(x, facing) {
    this.x = x; this.facing = facing; this.state = 'idle'; this.t = 0; this.stun = 0;
    this.move = null; this.queue = []; this.mod = {}; this.hitDone = false; this.chainOk = false; this.walkPh = 0; this.vx = 0;
    this.downType = null; this.armor = false; this.isSuper = false;
  }

  get alive() { return this.state !== 'down'; }
  get busy() { return this.state === 'attack' || this.state === 'hit' || this.state === 'down' || this.state === 'getup'; }
  canAct() { return this.state === 'idle' || this.state === 'walk' || this.state === 'block' || this.state === 'lowblock'; }

  // ── Input → techniek ──
  handleInput(inp, opp, match) {
    if (this.state === 'attack' && this.chainOk && !this.queue.length) {
      const ch = CHAINS[this.moveId];
      const btn = inp.pressed.tsuki ? 'tsuki' : inp.pressed.geri ? 'geri' : null;
      if (btn && ch && ch[btn]) { this.queue.push({ id: ch[btn], mod: {} }); this.chainOk = false; }
      return;
    }
    if (!this.canAct()) return;
    if (inp.pressed.kiai) {
      if (this.meter >= 100 && inp.dir === 'n' && this.data.super) return this.startSuper(match);
      if (this.meter >= 33) {
        const i = inp.dir === 'f' ? 1 : (inp.dir[0] === 'd' || inp.dir === 'b') ? 2 : 0;
        return this.startSignature(this.data.signatures[i], match);
      }
    }
    for (const btn of ['tsuki', 'geri']) {
      if (!inp.pressed[btn]) continue;
      let id = INPUT_MAP[`${btn}.${inp.dir}`] || INPUT_MAP[`${btn}.${inp.dir[0]}`] || INPUT_MAP[`${btn}.n`];
      if (id === 'hiza_geri' && Math.abs(opp.x - this.x) > 1.0) id = 'mae_geri';
      if (match.rules === 'dojo' && btn === 'tsuki' && inp.dir[0] === 'u') id = 'jodan_tsuki';
      return this.startMove(id, {});
    }
    if (inp.uke) { this.state = inp.dir[0] === 'd' ? 'lowblock' : 'block'; this.vx = 0; return; }
    if (this.state === 'block' || this.state === 'lowblock') this.state = 'idle';
    // lopen; beenschade maakt je trager
    const legPen = 1 - Math.min(0.45, this.legs / (LEG_KD * 2.2));
    const sp = 1.7 / this.speed * legPen;
    this.vx = inp.move * sp * this.facing;
    this.state = inp.move ? 'walk' : 'idle';
    if (inp.move > 0) this.stats.forward += 0.016;
  }

  startMove(id, mod, extra = {}) {
    const m = MOVES[id]; if (!m) return;
    this.state = 'attack'; this.move = m; this.moveId = id; this.mod = mod || {}; this.t = 0; this.hitDone = false; this.chainOk = false;
    this.scale = this.speed * (this.mod.startup || 1);
    this.armor = !!this.mod.armor; this.isSuper = !!extra.super; this.finalHit = !!extra.final;
    this.startPose = clonePose(this.cur); this.vx = 0;
    this.stats.attacks++;
    this.onEvent?.('swing', { fighter: this, move: m });
  }
  startSignature(sig, match) {
    if (!sig) return;
    this.meter -= 33; this.onEvent?.('special', { fighter: this, name: sig.naam, jp: sig.jp });
    if (sig.mod.counter) { this.state = 'parry'; this.t = 0; this.parrySig = sig; this.vx = 0; return; } // wachten op de aanval
    const seq = sig.mod.sequence || [sig.base];
    this.queue = seq.slice(1).map(id => ({ id, mod: { ...sig.mod, sequence: null } }));
    this.startMove(seq[0], { ...sig.mod });
  }
  startSuper(match) {
    const sup = this.data.super; this.meter = 0;
    this.onEvent?.('super', { fighter: this, name: sup.naam, jp: sup.jp });
    const seq = sup.sequence;
    this.queue = seq.slice(1).map((id, i) => ({ id, mod: { dmg: 1.15, startup: 0.85 }, extra: { super: true, final: i === seq.length - 2 } }));
    this.startMove(seq[0], { dmg: 1.15, startup: 0.85 }, { super: true });
  }

  // ── Treffer verwerken ──
  resolveHit(opp, match) {
    const m = this.move, mod = this.mod;
    const dist = Math.abs(opp.x - this.x);
    const reach = m.reach * (mod.reach || 1) + this.reachAdd;
    if (dist > reach + 0.05 || opp.state === 'down' || opp.state === 'getup') { this.onEvent?.('whiff', { fighter: this, move: m }); return; }
    if (m.foul && match.rules === 'toernooi') match.foul(this, m.foul);
    if (opp.state === 'parry') { // counter-signature: blok en direct terug
      this.queue = []; this.chainOk = false;
      opp.startMove(opp.parrySig.base, { ...opp.parrySig.mod, startup: 0.5, counter: false });
      this.onEvent?.('block', { fighter: this, target: opp, move: m, parry: true });
      return;
    }
    const blockedHigh = opp.state === 'block' && m.target !== 'gedan';
    const blockedLow = opp.state === 'lowblock' && m.target === 'gedan';
    if ((blockedHigh || blockedLow) && !this.isSuper) {
      opp.ki -= m.dmg * 0.12; opp.stun = 0.18; opp.x += this.facing * m.push * 0.5;
      if (blockedLow) this.legs += 6 * this.legDef; // sune uke doet de trapper pijn
      this.meter = Math.min(100, this.meter + m.meter * 0.3); opp.meter = Math.min(100, opp.meter + m.meter * 0.4);
      this.chainOk = true;
      this.onEvent?.('block', { fighter: this, target: opp, move: m, low: blockedLow });
      return;
    }
    const counter = opp.state === 'attack' && opp.t < opp.move.startup * opp.scale;
    let dmg = m.dmg * this.dmgMul * (mod.dmg || 1) * (counter ? 1.25 : 1);
    if (opp.state === 'lowblock' && m.target === 'chudan') dmg *= 0.6;
    opp.ki -= dmg;
    this.stats.dealt += dmg; this.stats.clean++;
    if (m.zone === 'legs') opp.legs += (m.legDmg || 0) * (mod.legDmg || 1) * opp.legDef;
    if (m.zone === 'body') opp.body += dmg * (mod.bodyBonus || m.bodyBonus || 1) * 1.15;
    this.meter = Math.min(100, this.meter + m.meter * 0.6 * this.meterMul); opp.meter = Math.min(100, opp.meter + m.meter * 0.3 * opp.meterMul);
    this.chainOk = true;

    // Knock-down volgens Kyokushin-logica: ki op, been geeft het op, romp klapt dicht of schone hoofdtrap.
    let kd = null;
    const kiFrac = Math.max(0, opp.ki / opp.kiMax);
    if (this.finalHit && kiFrac < 0.25) kd = { type: m.zone === 'head' ? 'back' : 'knees', finisher: true };
    else if (opp.ki <= 0) kd = { type: m.zone === 'head' ? 'back' : 'knees' };
    else if (m.zone === 'legs' && opp.legs >= LEG_KD) kd = { type: 'knees', cause: 'legs' };
    else if (m.zone === 'body' && opp.body >= BODY_KD && dmg >= 8) kd = { type: 'knees', cause: 'body' };
    else if (m.zone === 'head' && Math.random() < (mod.kdChance || m.kdChance || 0) * this.kdMul * (0.08 + (1 - kiFrac) ** 2) * (counter ? 1.5 : 1)) kd = { type: 'back', cause: 'head' };
    if (opp.armor && !kd) { this.onEvent?.('hit', { fighter: this, target: opp, move: m, dmg, counter, armor: true }); return; }

    if (kd) { opp.knockdown(kd); match.knockdown(opp, this, kd); }
    else {
      opp.state = 'hit'; opp.t = 0; opp.queue = []; opp.move = null;
      opp.stun = (m.zone === 'head' ? 0.42 : m.zone === 'legs' ? 0.3 : 0.32) * (counter ? 1.3 : 1);
      opp.hitPose = m.zone === 'head' ? 'hitHead' : m.zone === 'legs' ? 'hitLeg' : 'hitBody';
      opp.vx = this.facing * m.push * 2.2 * (mod.push || 1);
    }
    this.onEvent?.('hit', { fighter: this, target: opp, move: m, dmg, counter, kd });
  }

  knockdown(kd) {
    this.state = 'down'; this.downType = kd.type; this.t = 0; this.queue = []; this.move = null; this.vx = 0;
  }
  getUp() { this.state = 'getup'; this.t = 0; }

  // ── Per frame ──
  update(dt, opp, match) {
    this.t += dt;
    this.facing = opp.x >= this.x ? 1 : -1;
    let target = GUARD, rate = 14;
    switch (this.state) {
      case 'attack': {
        const m = this.move, T = this.t / this.scale;
        if (!this.hitDone && T >= m.startup) { this.hitDone = true; this.resolveHit(opp, match); }
        // stap in als de tegenstander net buiten bereik staat
        const reach = m.reach * (this.mod.reach || 1) + this.reachAdd;
        const gap = Math.abs(opp.x - this.x);
        if (m.travel && T < m.startup) this.x += this.facing * Math.min(m.travel / m.startup * dt / this.scale, Math.max(0, gap - 0.7));
        else if (T < m.startup && gap > reach - 0.1) this.x += this.facing * Math.min(gap - reach + 0.1, (this.isSuper ? 3 : 1.2) * dt);
        if (T >= m.startup + m.active + m.recovery * (this.queue.length ? 0.35 : 1)) {
          if (this.queue.length && this.state === 'attack') { const n = this.queue.shift(); this.startMove(n.id, n.mod, n.extra); }
          else { this.state = 'idle'; this.move = null; this.isSuper = false; this.armor = false; }
        }
        if (this.state === 'attack') { this.attackPose(T); this.model.setPose(this.cur); this.place(); return; }
        break;
      }
      case 'hit': target = POSES[this.hitPose] || POSES.hitBody; rate = 22; this.stun -= dt; if (this.stun <= 0) this.state = 'idle'; break;
      case 'block': target = POSES.block; rate = 24; if (this.stun > 0) this.stun -= dt; break;
      case 'parry': target = POSES.block; rate = 24; if (this.t > 0.7) this.state = 'idle'; break;
      case 'lowblock': target = POSES.suneUke; rate = 24; if (this.stun > 0) this.stun -= dt; break;
      case 'down': target = this.downType === 'back' ? POSES.downBack : POSES.downKnees; rate = this.downType === 'back' ? 7 : 9; break;
      case 'getup': target = GUARD; rate = 4; if (this.t > 0.8) this.state = 'idle'; break;
      case 'rei': target = POSES.rei; rate = 5; break;
      case 'pose': target = POSES[this.poseName] || GUARD; rate = this.poseRate || 6; break; // vrije pose (trainingen)
      case 'stand': target = POSES.stand; rate = 6; break;
      case 'osu': target = POSES.osu; rate = 8; break;
      case 'victory': target = POSES.victory; rate = 5; break;
    }
    const k = 1 - Math.exp(-dt * rate);
    blendPose(this.cur, target, k, this.cur);
    this.wrapYaw();
    // ademhaling/veren in kamae en loopcyclus
    if (this.state === 'idle' || this.state === 'walk' || this.state === 'block') {
      this.walkPh += dt * (this.state === 'walk' ? 9 : 5.5);
      const b = Math.sin(this.walkPh), tmp = this.tmp;
      for (const j in this.cur) { const s = this.cur[j], d = tmp[j]; for (let i = 0; i < s.length; i++) d[i] = s[i]; }
      tmp.root[0] += Math.abs(b) * (this.state === 'walk' ? 0.025 : 0.012) - 0.01;
      if (this.state === 'walk') { tmp.lHip[0] += b * 0.22; tmp.rHip[0] -= b * 0.22; tmp.lKnee[0] += Math.max(0, b) * 0.3; tmp.rKnee[0] += Math.max(0, -b) * 0.3; }
      if (this.legs > LEG_KD * 0.6) tmp.lKnee[0] += 0.15 + Math.sin(this.walkPh * 0.5) * 0.05; // hinkt
      this.model.setPose(tmp);
    } else this.model.setPose(this.cur);
    // beweging en terugslag
    if (this.state === 'hit' || this.state === 'down') this.vx *= Math.exp(-dt * 6);
    this.x += this.vx * dt;
    this.place();
  }

  attackPose(T) {
    const fr = this.move.frames;
    let i = 0; while (i < fr.length - 2 && T >= fr[i + 1][1]) i++;
    const [na, ta] = fr[i], [nb, tb] = fr[Math.min(i + 1, fr.length - 1)];
    const a = i === 0 ? this.startPose : POSES[na], b = POSES[nb];
    const u = tb > ta ? Math.min(1, Math.max(0, (T - ta) / (tb - ta))) : 1;
    // terugdraaien na een draaitrap of rol via 2π, niet terug langs dezelfde kant
    let yb = b.root[2]; if (a.root[2] > Math.PI && yb === 0) yb = TAU;
    let pb = b.root[3]; if (a.root[3] > Math.PI && pb <= 0.4) pb += TAU;
    blendPose(a, b, ease(u), this.cur);
    this.cur.root[2] = a.root[2] + (yb - a.root[2]) * ease(u);
    this.cur.root[3] = a.root[3] + (pb - a.root[3]) * ease(u);
  }
  wrapYaw() {
    if (this.state === 'attack') return;
    if (this.cur.root[2] > Math.PI * 1.9) this.cur.root[2] -= TAU;
    if (this.cur.root[3] > Math.PI * 1.9) this.cur.root[3] -= TAU;
  }

  place() {
    const g = this.model.group;
    g.position.x = this.x;
    g.rotation.y = this.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

export function separate(a, b, bounds) {
  const d = b.x - a.x, gap = Math.abs(d);
  if (gap < MIN_GAP && a.state !== 'down' && b.state !== 'down') {
    const push = (MIN_GAP - gap) / 2, s = Math.sign(d) || 1;
    a.x -= push * s; b.x += push * s;
  }
  for (const f of [a, b]) f.x = Math.max(-bounds, Math.min(bounds, f.x));
}
