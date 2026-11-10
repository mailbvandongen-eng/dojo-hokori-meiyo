// Speelt motion capture af op een MakeHuman-vechter, gestuurd door de toestand van de Fighter.
//
// Technieken: de opname wordt in de tijd vervormd zodat de treffer (gemeten in de opname: het
// verste punt van vuist, scheen of knie) precies in het raakvenster van moves.js valt. De opbouw
// gaat lineair van het begin van de beweging naar de treffer; het herstel speelt maximaal 1,6× zo
// snel af. Zo blijft de beweging die van de echte karateka en kloppen de spelregels.
// Overgangen: crossfade tussen anatomische frames (geen sprongen). Treffers: een korte klap van
// hoofd of romp bovenop de lopende opname (additief).
import * as THREE from '../../lib/three.module.js';
import { loadClips, sample, blend, newFrame, BONES } from './mocap.js';

let CLIPS = null;
export const clipsReady = loadClips().then(c => { CLIPS = c; prep(c); return c; }).catch(e => { console.warn('geen motion capture', e); return null; });
export const mocapAvailable = () => !!CLIPS;

// techniek → clip(s)
const MOVE_CLIP = {
  seiken_jab: 'jab', seiken_gyaku: 'gyaku', shita_tsuki: 'shita', jodan_tsuki: 'jodan_tsuki', hiji_ate: 'hiji',
  mae_geri: 'mae', gedan_mawashi: 'gedan', chudan_mawashi: 'chudan_mawashi', jodan_mawashi: 'jodan_mawashi',
  ushiro_geri: 'ushiro_geri', ushiro_mawashi: 'ushiro_mawashi', kakato_otoshi: 'kakato', rol_kick: 'rol',
  hiza_geri: 'hiza', tobi_hiza: 'hiza', double_tap: ['gedan', 'jodan_mawashi'],
};
export const clipOfMove = id => MOVE_CLIP[id];
const IX = Object.fromEntries(BONES.map((b, i) => [b, i]));
// kinderen in de keten (voor additieve klappen: een bot en alles erboven draait mee)
const DESC = {};
const PARENT = { Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Neck: 'Spine2', Head: 'Neck' };
for (const s of ['Left', 'Right']) Object.assign(PARENT, { [s + 'Shoulder']: 'Spine2', [s + 'Arm']: s + 'Shoulder', [s + 'ForeArm']: s + 'Arm', [s + 'Hand']: s + 'ForeArm', [s + 'UpLeg']: 'Hips', [s + 'Leg']: s + 'UpLeg', [s + 'Foot']: s + 'Leg' });
for (const b of BONES) { DESC[b] = []; }
for (const b of BONES) { let p = b; while (p) { DESC[p].push(IX[b]); p = PARENT[p]; } }

function prep(clips) {
  for (const c of Object.values(clips)) {
    const h0 = c.hips[0], h1 = c.hips[c.frames - 1];
    c.speed = Math.abs(h1[2] - h0[2]) / c.dur; // voorwaartse snelheid (heuphoogtes per seconde)
  }
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3(), _v = new THREE.Vector3();
function rotChain(f, root, axis, ang) {
  if (Math.abs(ang) < 1e-4) return;
  _q.setFromAxisAngle(axis, ang);
  for (const i of DESC[root]) { _q2.fromArray(f.q, i * 4).premultiply(_q); _q2.toArray(f.q, i * 4); }
}
const smooth = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerpSeg = (T, Ts, Cs) => { // stuksgewijs lineair
  if (T <= Ts[0]) return Cs[0];
  for (let i = 1; i < Ts.length; i++) if (T <= Ts[i]) return Cs[i - 1] + (Cs[i] - Cs[i - 1]) * (T - Ts[i - 1]) / Math.max(1e-6, Ts[i] - Ts[i - 1]);
  return Cs[Cs.length - 1] + (T - Ts[Ts.length - 1]) * (Cs[Cs.length - 1] - Cs[Cs.length - 2]) / Math.max(1e-6, Ts[Ts.length - 1] - Ts[Ts.length - 2]);
};

export class Animator {
  constructor(fighter) {
    this.f = fighter; this.model = fighter.model;
    this.out = newFrame(); this.a = newFrame(); this.b = newFrame(); this.from = newFrame(); this.tmp = newFrame();
    this.key = null; this.t = 0; this.fadeT = 1; this.fadeDur = 0.0001; this.dir = 1;
    this.react = null; this.lastHipsZ = null;
    sample(CLIPS.idle, 0, this.out); this.from.q.set(this.out.q); this.from.hips = [...this.out.hips];
  }
  // naar een andere lus/houding met crossfade
  go(key, fade = 0.15, t0 = 0) {
    if (this.key === key) return;
    this.snapshot(); this.key = key; this.t = t0; this.fadeT = 0; this.fadeDur = fade; this.dir = 1;
  }
  snapshot() { this.from.q.set(this.out.q); this.from.hips = [...this.out.hips]; }

  // ── technieken ──
  startAttack(id, m, recovery) {
    this.snapshot(); this.key = 'attack:' + id; this.fadeT = 0; this.fadeDur = 0; this.z0 = null; this.lastZ = null; this.rootAcc = 0;
    const names = MOVE_CLIP[id]; const list = Array.isArray(names) ? names : [names];
    const hits = m.hits, E = hits[hits.length - 1].t + hits[hits.length - 1].active + recovery;
    const H = hits.map(h => h.t + h.active * 0.4);
    const segs = [];
    if (list.length === 1) {
      const c = CLIPS[list[0]], ev = c.ev, hit = ev.hits[0];
      const r = Math.min(1.6, Math.max(1, (ev.off - hit) / Math.max(0.05, E - H[0])));
      segs.push({ c, T: [0, H[0], E], C: [ev.on, hit, hit + (E - H[0]) * r] });
    } else { // laag-hoog: eerste trap, halverwege terug in de tweede over
      const c1 = CLIPS[list[0]], c2 = CLIPS[list[1]], e1 = c1.ev, e2 = c2.ev;
      const S = (H[0] + H[1]) / 2;
      segs.push({ c: c1, T: [0, H[0], S], C: [e1.on, e1.hits[0], e1.hits[0] + (S - H[0]) * 0.9] });
      const mid = e2.on + (e2.hits[0] - e2.on) * 0.45;
      segs.push({ c: c2, T: [S, H[1], E], C: [mid, e2.hits[0], e2.hits[0] + (E - H[1]) * 1.3], fadeIn: 0.09 });
    }
    this.segs = segs; this.attackFade = 0.07;
    // netto opstap van de opname (heup aan het eind t.o.v. het begin)
    const zAt = (c, t) => sample(c, t, this.tmp).hips[2];
    const first = segs[0], lastS = segs[segs.length - 1];
    this.residual = zAt(lastS.c, lastS.c.ev.off) - zAt(first.c, first.c.ev.on);
  }
  // pose op aanvalstijd T (deterministisch: ook bruikbaar voor een tussenmeting)
  attack(T, root = false) {
    const segs = this.segs; let i = 0; while (i < segs.length - 1 && T >= segs[i + 1].T[0]) i++;
    const s = segs[i];
    sample(s.c, Math.max(0, lerpSeg(T, s.T, s.C)), this.a);
    if (i > 0 && s.fadeIn && T - s.T[0] < s.fadeIn) {
      const p = segs[i - 1]; sample(p.c, lerpSeg(T, p.T, p.C), this.b);
      blend(this.b, this.a, smooth((T - s.T[0]) / s.fadeIn), this.a);
    }
    this.adapt(T, i, s);
    const w = smooth(T / this.attackFade);
    if (w < 1) blend(this.from, this.a, w, this.out); else { this.out.q.set(this.a.q); this.out.hips = [...this.a.hips]; }
    return this.finish(true);
  }
  // hoogte aanpassen aan de tegenstander: arm of been draait in schouder of heup omhoog/omlaag,
  // zodat het raakpunt op de dij, romp of het hoofd van díe tegenstander uitkomt (kind, lange vechter).
  adapt(T, i, s) {
    const f = this.f, o = f.opp, c = s.c;
    if (!c.hitRel || !o?.model?.human || !f.move) return;
    if (s.ang == null) {
      const h = f.move.hits[Math.min(i, f.move.hits.length - 1)], arm = /Hand|Elbow/.test(c.eff);
      const y = n => o.model.partWorld(n, _v).y;
      const want = h.target === 'gedan' ? y('pelvis') - 0.05 : h.target === 'jodan' ? y('head') + 0.04 : y('spine') + (arm ? 0.2 : 0.26);
      const mine = c.hitRel[0] * this.model.legH, dy = want - mine;
      s.ang = Math.abs(dy) < 0.04 ? 0 : Math.max(-0.45, Math.min(0.45, -Math.atan2(dy, Math.max(0.5, c.reach))));
      s.chain = arm ? (c.eff.startsWith('Left') ? 'LeftArm' : 'RightArm') : (c.eff.startsWith('Left') ? 'LeftUpLeg' : 'RightUpLeg');
    }
    if (!s.ang) return;
    const [T0, H, E] = s.T;
    const w = T < H ? smooth((T - T0) / Math.max(1e-3, H - T0)) : 1 - smooth((T - H) / Math.max(1e-3, E - H));
    rotChain(this.a, s.chain, _ax.set(1, 0, 0), s.ang * w);
  }

  // na een techniek: wat de heup netto naar voren is gegaan (opstap) wordt de nieuwe positie
  settle() {
    if (!this.key?.startsWith('attack:')) return 0;
    const r = this.residual || 0; this.out.hips[2] -= r; this.key = 'na-aanval';
    return r * this.model.hipH;
  }

  // ── per frame buiten technieken ──
  update(dt) {
    const f = this.f, st = f.state;
    let key = 'idle', hold = null, rate = 1, strip = false;
    switch (st) {
      case 'walk': case 'idle': {
        const v = f.vx * f.facing;
        if (Math.abs(v) > 0.35) { key = v > 0 ? 'advance' : 'retreat'; rate = Math.min(1.8, Math.max(0.6, Math.abs(v) / (CLIPS[key].speed * this.model.hipH + 1e-3))); strip = true; }
        break;
      }
      case 'block': case 'parry': key = 'block'; hold = 'hit'; break;
      case 'lowblock': key = 'sune'; break;
      case 'hit': key = 'idle'; break;
      case 'sabaki': key = 'sidestep'; strip = true; rate = CLIPS.sidestep.dur / 0.9; break;
      case 'dash': key = 'dash'; strip = true; rate = 1.6; break;
      case 'down': key = f.downType === 'back' ? 'down_back' : 'down_knees'; break;
      case 'getup': key = f.downType === 'back' ? 'getup_back' : 'getup_knees'; break;
      case 'rei': key = 'bow'; hold = 'bow'; break;
      case 'stand': case 'osu': key = 'stand'; break;
      case 'victory': key = 'victory'; break;
      default: return false; // procedurele pose (trainingen)
    }
    if (this.key !== key) this.go(key, key === 'down_back' || key === 'down_knees' ? 0.12 : 0.16);
    this.t += dt * rate;
    this.fadeT += dt;
    this.pose(key, hold, this.a);
    if (strip) { this.a.hips[0] = 0; this.a.hips[2] = 0; }
    const w = smooth(this.fadeT / this.fadeDur);
    if (w < 1) blend(this.from, this.a, w, this.out); else { this.out.q.set(this.a.q); this.out.hips = [...this.a.hips]; }
    return this.finish(false, dt);
  }
  pose(key, hold, out) {
    const t = this.t;
    switch (key) {
      case 'idle': { // heen en weer door de rustige kamae van de Kyokushin-atleet
        const c = CLIPS.idle, d = c.dur, u = t % (2 * d); sample(c, u < d ? u : 2 * d - u, out);
        out.hips[0] -= c.hips[0][0]; out.hips[2] -= c.hips[0][2];
        return;
      }
      case 'advance': case 'retreat': sample(CLIPS[key], t, out, true); return;
      case 'block': { const c = CLIPS.block; sample(c, Math.min(t + c.ev.on, c.ev.hits[0]), out); return; }
      case 'sune': { // linkerknie omhoog (scheenblok): kamae met het been uit de knie-opname, gespiegeld
        const c = CLIPS.idle; sample(c, 0, out); out.hips[0] = 0; out.hips[2] = 0;
        const k = CLIPS.hiza; sample(k, Math.min(k.ev.on + t * 2.2, k.ev.hits[0]) * 0.92, this.tmp);
        for (const [l, r] of [['LeftUpLeg', 'RightUpLeg'], ['LeftLeg', 'RightLeg'], ['LeftFoot', 'RightFoot']]) {
          // gespiegeld: x → -x (rotatie S·A·D, uitgeschreven in quaternions: (x,y,z,w) → (x,-y,-z,w) · (0,0,1,0)-reflectie)
          const i = IX[r] * 4, j = IX[l] * 4; mirrorQ(this.tmp.q, i, out.q, j);
        }
        return;
      }
      case 'sidestep': sample(CLIPS.sidestep, t, out); return;
      case 'dash': sample(CLIPS.dash, t, out); return;
      case 'down_knees': { const c = CLIPS.crouch; sample(c, Math.min(c.dur, 0.3 + t * 2.4), out); return; }
      case 'down_back': { const c = CLIPS.crouch_lie; sample(c, Math.min(c.dur, 1.2 + t * 1.8), out); return; }
      case 'getup_back': { // omrollen naar hurkzit (1,05 s), dan opstaan (0,7 s)
        const c = CLIPS.lie_crouch, d = CLIPS.crouch_ready, u = 0.9 + t * 2.2;
        if (u < 3.2) { sample(c, u, out); out.hips[0] = 0; } else sample(d, Math.min(2.4, 0.9 + (u - 3.2) / 2.2 * 2), out);
        return;
      }
      case 'getup_knees': { const d = CLIPS.crouch_ready; sample(d, Math.min(2.4, 0.9 + t * 2), out); return; }
      case 'bow': sample(CLIPS.bow, Math.min(1.35, 0.5 + t * 1.4), out); return;
      case 'stand': sample(CLIPS.stand, t, out, true); return;
      case 'victory': { const c = CLIPS.victory; sample(c, Math.min(c.dur, t), out); return; }
    }
  }
  // treffer opvangen: hoofd naar achteren, romp dubbel, been knikt
  hit(zone, strength = 1) { this.react = { zone, t: 0, s: Math.min(1.4, strength) }; }
  finish(attacking, dt = 0) {
    const r = this.react;
    if (r) {
      r.t += dt || 0.016;
      const k = Math.sin(Math.min(1, r.t / 0.07) * Math.PI / 2) * Math.exp(-Math.max(0, r.t - 0.07) * 5.5) * r.s;
      if (r.t > 1.2) this.react = null;
      else if (r.zone === 'head') { rotChain(this.out, 'Neck', _ax.set(1, 0, 0), -0.55 * k); rotChain(this.out, 'Spine2', _ax.set(1, 0, 0), -0.22 * k); rotChain(this.out, 'Neck', _ax.set(0, 1, 0), 0.35 * k); }
      else if (r.zone === 'body') { rotChain(this.out, 'Spine1', _ax.set(1, 0, 0), 0.42 * k); rotChain(this.out, 'Neck', _ax.set(1, 0, 0), 0.2 * k); this.out.hips[2] -= 0.05 * k; this.out.hips[1] -= 0.03 * k; }
      else { rotChain(this.out, 'LeftLeg', _ax.set(1, 0, 0), 0.5 * k); this.out.hips[1] -= 0.06 * k; rotChain(this.out, 'Spine', _ax.set(0, 0, 1), 0.12 * k); }
    }
    this.model.applyMocap(this.out, { ground: !(this.f.state === 'attack' && this.f.moveId === 'tobi_hiza') });
    return true;
  }
}

// spiegel een anatomisch frame (links ↔ rechts): A' = S·A·D met S = diag(-1,1,1), D = diag(1,1,-1)
const _m3 = new THREE.Matrix4(), _S = new THREE.Matrix4().makeScale(-1, 1, 1), _D = new THREE.Matrix4().makeScale(1, 1, -1);
function mirrorQ(src, i, dst, j) {
  _q.fromArray(src, i); _m3.makeRotationFromQuaternion(_q);
  _m3.premultiply(_S).multiply(_D);
  _q.setFromRotationMatrix(_m3); _q.toArray(dst, j);
}
