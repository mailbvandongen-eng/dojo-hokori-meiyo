// Vechter: toestandsmachine, technieken, treffers en schade volgens Kyokushin-logica.
// Drie schadetellers naast ki (uithouding): benen (lage trappen), romp en hoofd.
//
// Gevechtssysteem (zie docs/GDD.md §2):
//  - Raakdetectie op contact: tijdens het raakvenster van een techniek wordt het echte raakvlak
//    (scheen, vuist, knie, elleboog) per frame gemeten tegen het lichaam van de tegenstander.
//  - Renzoku: maximaal 3 technieken per reeks; elke volgende treffer doet minder schade en
//    geeft minder stun, zodat de verdediger na 2 treffers weer kan blokken.
//  - Blok geeft voordeel: de aanvaller herstelt langer, de verdediger krijgt een counter-venster
//    (kaeshi: snellere, hardere techniek). Perfect blok (net op tijd) laat de aanvaller wankelen.
//  - Kiai-uitbraak: met 1/3 meter breek je uit een combo (KIAI tijdens treffers).
//  - Tai sabaki (UKE + ↑): uitwijken om de tegenstander heen, ook uit de hoek. Dubbel tikken
//    naar achteren = snelle stap terug. Terugslag tegen de rand gaat naar de aanvaller.
import { MOVES, INPUT_MAP, CHAINS } from '../data/moves.js';
import { POSES, GUARD, blendPose, clonePose, ease } from './poses.js';
import { buildFighter } from './model.js';
import { Animator, mocapAvailable, clipOfMove } from './animator.js';
import { graadNiveau } from '../data/roster.js';
import * as THREE from '../../lib/three.module.js';

const TAU = Math.PI * 2;
const MIN_GAP = 0.8;  // heup tot heup: dichter staan lichamen in elkaar
export const LEG_KD = 130, BODY_KD = 170; // drempels voor knock-down door opgestapelde schade

// Tuning van het gevechtssysteem (op één plek)
export const TUNE = {
  maxChain: 2,            // extra technieken na de eerste in een renzoku-reeks (dus 3 totaal)
  comboDmg: 0.14,         // schade-afbouw per opeenvolgende treffer
  comboStun: 0.2,         // stun-afbouw per opeenvolgende treffer
  blockRecovery: 0.1,     // extra herstel voor de aanvaller als hij geblokt wordt
  whiffRecovery: 0.1,     // extra herstel bij een misser
  perfectWindow: 0.2,     // perfect blok: UKE zo kort voor de treffer ingedrukt
  counterWindow: 0.42,    // counter-venster na een blok (perfect: 0.6)
  counterStartup: 0.7,    // kaeshi: snellere opbouw
  counterDmg: 1.2,
  sabakiTime: 0.44, sabakiCool: 1.0, sabakiDodge: [0.06, 0.34],
  dashTime: 0.26, dashSpeed: 3.4, dashCool: 0.45,
  edge: 0.12,             // afstand tot de rand waar terugslag naar de aanvaller gaat
};

// Raakvlakken: [van, naar] gewrichten; er wordt langs de lijn gemeten.
const LIMBS = {
  lArm: ['lEl', 'lFist'], rArm: ['rEl', 'rFist'], rElbow: ['rSh', 'rEl'],
  rShin: ['rKnee', 'rFoot'], rThigh: ['rHip', 'rKnee'], lShin: ['lKnee', 'lFoot'],
};
const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vP = new THREE.Vector3(), vH = new THREE.Vector3(), vS = new THREE.Vector3();

export class Fighter {
  constructor(data, corner, scene, opts = {}) {
    this.data = data; this.corner = corner;
    this.model = buildFighter(data, corner, opts.costume || {});
    scene.add(this.model.group);
    // echte bewegingen (motion capture) op de MakeHuman-modellen; anders de procedurele poses
    this.anim = this.model.human && mocapAvailable() && !opts.procedural ? new Animator(this) : null;
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
    this.bodyR = 0.15 * (data.uiterlijk?.bouw || 1); // halve diepte van de romp (borst tot rug ~30 cm)
    this.cur = clonePose(GUARD); this.tmp = clonePose(GUARD);
    this.clock = 0; this.cool = { sabaki: 0, dash: 0 };
    this.reset(0, 1);
    this.score = { wazaari: 0, chui: 0, genten: 0, jogai: 0 };
    this.stats = { dealt: 0, clean: 0, forward: 0, attacks: 0, blocked: 0, counters: 0 };
    this.meter = 0;
    this.ki = this.kiMax;
    this.legs = 0; this.body = 0;
  }

  reset(x, facing) {
    this.x = x; this.z = 0; this.facing = facing; this.yaw = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.state = 'idle'; this.t = 0; this.stun = 0;
    this.move = null; this.queue = []; this.mod = {}; this.hitIndex = 0; this.chainOk = false; this.chainCount = 0; this.walkPh = 0; this.vx = 0;
    this.downType = null; this.armor = false; this.isSuper = false; this.comboTaken = 0; this.counterT = 0; this.recExtra = 0;
    this.prevMove = 0; this.lastBackTap = -9; this.ukeAt = -9;
  }

  get alive() { return this.state !== 'down'; }
  get busy() { return this.state === 'attack' || this.state === 'hit' || this.state === 'down' || this.state === 'getup'; }
  canAct() { return this.state === 'idle' || this.state === 'walk' || this.state === 'block' || this.state === 'lowblock'; }
  // doel van de volgende treffer van de lopende techniek (voor AI en blokken)
  nextHit() { return this.state === 'attack' && this.move ? this.move.hits[this.hitIndex] || null : null; }
  get lastHitEnd() { const h = this.move.hits[this.move.hits.length - 1]; return h.t + h.active; }

  // ── Input → techniek ──
  handleInput(inp, opp, match) {
    // in een combo: kiai-uitbraak met 1/3 meter
    if (this.state === 'hit') {
      if (inp.pressed.kiai && this.meter >= 33 && this.comboTaken >= 1) this.burst(opp);
      return;
    }
    if (this.state === 'attack') {
      const T = this.t / this.scale;
      if (this.chainOk && !this.queue.length && this.chainCount < TUNE.maxChain) {
        const ch = CHAINS[this.moveId];
        const btn = inp.pressed.tsuki ? 'tsuki' : inp.pressed.geri ? 'geri' : null;
        if (btn && ch && ch[btn]) { this.queue.push({ id: ch[btn], mod: {}, extra: { chain: true } }); this.chainOk = false; return; }
      }
      // laat herstel: blok mag al (verdedigen voelt direct)
      if (inp.uke && this.hitIndex >= this.move.hits.length && !this.queue.length && !this.isSuper && T > this.lastHitEnd + this.move.recovery * 0.45) {
        this.endAttack(); this.enterBlock(inp);
      }
      return;
    }
    if (!this.canAct()) return;
    // dubbel tikken naar achteren = snelle stap terug
    if (inp.move < 0 && this.prevMove >= 0 && !inp.uke) {
      if (this.clock - this.lastBackTap < 0.28 && this.cool.dash <= 0) { this.prevMove = inp.move; return this.startDash(); }
      this.lastBackTap = this.clock;
    }
    this.prevMove = inp.move;
    // tai sabaki: UKE + omhoog
    if (inp.uke && inp.dir[0] === 'u' && this.cool.sabaki <= 0) return this.startSabaki(opp);
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
    if (inp.uke) return this.enterBlock(inp);
    if (this.state === 'block' || this.state === 'lowblock') { if (this.stun > 0) return; this.state = 'idle'; }
    // lopen met versnelling; beenschade maakt je trager
    const legPen = 1 - Math.min(0.45, this.legs / (LEG_KD * 2.2));
    const sp = (inp.move < 0 ? 1.55 : 1.75) / this.speed * legPen;
    this.walkTarget = inp.move * sp * this.facing;
    this.state = inp.move ? 'walk' : 'idle';
    if (inp.move > 0) this.stats.forward += 0.016;
  }

  enterBlock(inp) {
    const st = inp.dir[0] === 'd' ? 'lowblock' : 'block';
    if (this.state !== 'block' && this.state !== 'lowblock') this.ukeAt = this.clock;
    else if (this.state !== st) this.ukeAt = this.clock - TUNE.perfectWindow * 0.5; // wisselen telt half
    this.state = st; this.walkTarget = 0;
  }

  startMove(id, mod, extra = {}) {
    const m = MOVES[id]; if (!m) return;
    mod = { ...(mod || {}) };
    // counter (kaeshi) na een blok: sneller en harder
    this.kaeshi = this.counterT > 0 && !extra.chain && !extra.super;
    if (this.kaeshi) { mod.startup = (mod.startup || 1) * TUNE.counterStartup; mod.dmg = (mod.dmg || 1) * TUNE.counterDmg; this.counterT = 0; this.onEvent?.('kaeshi', { fighter: this }); }
    this.chainCount = extra.chain ? this.chainCount + 1 : extra.seq ? this.chainCount : 0;
    this.state = 'attack'; this.move = m; this.moveId = id; this.mod = mod; this.t = 0; this.hitIndex = 0; this.chainOk = false; this.recExtra = 0;
    this.scale = this.speed * (mod.startup || 1);
    this.armor = !!mod.armor; this.isSuper = !!extra.super; this.finalHit = !!extra.final;
    this.startPose = clonePose(this.cur); this.walkTarget = 0; this.vx *= 0.3; this.lastT = 0;
    if (this.anim && clipOfMove(id)) this.anim.startAttack(id, m, m.recovery); else if (this.anim) this.anim.segs = null;
    this.stats.attacks++;
    this.onEvent?.('swing', { fighter: this, move: m });
  }
  endAttack() { this.state = 'idle'; this.move = null; this.isSuper = false; this.armor = false; this.queue = []; this.kaeshi = false; }
  startSignature(sig, match) {
    if (!sig) return;
    this.meter -= 33; this.onEvent?.('special', { fighter: this, name: sig.naam, jp: sig.jp });
    if (sig.mod.counter) { this.state = 'parry'; this.t = 0; this.parrySig = sig; this.walkTarget = 0; this.vx = 0; return; } // wachten op de aanval
    const seq = sig.mod.sequence || [sig.base];
    this.queue = seq.slice(1).map(id => ({ id, mod: { ...sig.mod, sequence: null }, extra: { seq: true } }));
    this.startMove(seq[0], { ...sig.mod });
  }
  startSuper(match) {
    const sup = this.data.super; this.meter = 0;
    this.onEvent?.('super', { fighter: this, name: sup.naam, jp: sup.jp });
    const seq = sup.sequence;
    this.queue = seq.slice(1).map((id, i) => ({ id, mod: { dmg: 1.15, startup: 0.85 }, extra: { super: true, seq: true, final: i === seq.length - 2 } }));
    this.startMove(seq[0], { dmg: 1.15, startup: 0.85 }, { super: true });
  }
  startSabaki(opp) {
    const gap = Math.abs(opp.x - this.x);
    // dichtbij: om de tegenstander heen naar de andere kant; verder weg: zijstap op de plek
    this.sab = { x0: this.x, x1: gap < 1.35 ? opp.x + this.facing * Math.max(0.75, 1.3 - gap * 0.4) : this.x, side: this.corner === 'aka' ? 1 : -1, cross: gap < 1.35 };
    this.state = 'sabaki'; this.t = 0; this.vx = 0; this.walkTarget = 0; this.cool.sabaki = TUNE.sabakiCool;
    this.onEvent?.('sabaki', { fighter: this });
  }
  startDash() { this.state = 'dash'; this.t = 0; this.vx = -this.facing * TUNE.dashSpeed; this.cool.dash = TUNE.dashCool; this.onEvent?.('dash', { fighter: this }); }
  burst(opp) {
    this.meter -= 33; this.state = 'idle'; this.stun = 0; this.comboTaken = 0; this.counterT = TUNE.counterWindow;
    opp.queue = []; opp.chainOk = false;
    if (opp.state === 'attack') opp.endAttack();
    opp.state = 'hit'; opp.stun = 0.32; opp.hitPose = 'hitBody'; opp.t = 0; opp.vx = opp.facing * -2.6; this.vx = this.facing * -1.2;
    this.onEvent?.('burst', { fighter: this, target: opp });
  }

  // ── Contact: raakt het raakvlak de juiste zone van de tegenstander? ──
  // jodan = hoofd (bol rond het echte hoofd) en bovenkant schouders, chudan = romp, gedan = benen.
  hurtbox() {
    const L = this.model.scale;
    return { x: this.x + this.facing * this.cur.root[1], z: this.z, y0: 0.08, y1: (1.86 + this.cur.root[0]) * L + 0.1, r: this.bodyR };
  }
  hurtVolumes(target) {
    const L = this.model.scale, hb = this.hurtbox(), head = this.model.partWorld('head', vH);
    const chestX = (this.model.partWorld('spine', vS).x + head.x) / 2;
    const vols = [];
    if (target === 'jodan') {
      vols.push({ sph: true, x: head.x, y: head.y + 0.11 * L, z: head.z, r: 0.14 * L });
      vols.push({ x: chestX, z: hb.z, y0: head.y - 0.22 * L, y1: head.y, r: hb.r });             // schouders/nek
    } else if (target === 'chudan') {
      vols.push({ x: chestX, z: hb.z, y0: head.y - 0.78 * L, y1: head.y - 0.05 * L, r: hb.r });  // romp
    } else {
      vols.push({ x: hb.x, z: hb.z, y0: 0.06, y1: Math.max(0.3, head.y - 0.62 * L), r: 0.24 });  // benen (voorste been inbegrepen)
    }
    return vols;
  }
  contact(opp, extra = 0, target = 'chudan') {
    const limb = LIMBS[this.move.limb] || LIMBS.rShin;
    this.model.partWorld(limb[0], vA); this.model.partWorld(limb[1], vB);
    const LR = 0.055 + extra; // dikte van het raakvlak (vuist, scheen)
    // 2,5D: afstand langs de vechtlijn telt; in de diepte een ruime marge (alleen tai sabaki ontwijkt zo)
    const vols = opp.hurtVolumes ? opp.hurtVolumes(target) : (hb => [{ x: hb.x, z: hb.z, y0: hb.y0, y1: hb.y1, r: hb.r }])(opp.hurtbox ? opp.hurtbox() : { x: opp.x, z: 0, y0: 0.1, y1: 1.9, r: 0.22 });
    for (let i = 0; i <= 10; i++) {
      vP.lerpVectors(vA, vB, i / 10);
      for (const v of vols) {
        if (Math.abs(vP.z - v.z) > 0.5) continue;
        if (v.sph) { if (Math.hypot(vP.x - v.x, vP.y - v.y) < v.r + LR) return true; }
        else if (vP.y >= v.y0 && vP.y <= v.y1 && Math.abs(vP.x - v.x) < v.r + LR) return true;
      }
    }
    return false;
  }
  // meet het voorste punt van het raakvlak (voor kalibratie en de AI)
  limbExtent() {
    const limb = LIMBS[this.move.limb] || LIMBS.rShin;
    this.model.partWorld(limb[0], vA); this.model.partWorld(limb[1], vB);
    return Math.max((vA.x - this.x) * this.facing, (vB.x - this.x) * this.facing);
  }

  // ── Treffer verwerken ──
  resolveHit(opp, match, h = this.move.hits[0]) {
    const m = this.move, mod = this.mod;
    if (opp.state === 'down' || opp.state === 'getup') return;
    if (m.foul && match.rules === 'toernooi') match.foul(this, m.foul);
    if (opp.state === 'sabaki' && opp.t >= TUNE.sabakiDodge[0] && opp.t <= TUNE.sabakiDodge[1]) {
      this.recExtra += TUNE.whiffRecovery; this.onEvent?.('dodge', { fighter: this, target: opp, move: m }); return;
    }
    if (opp.state === 'parry') { // counter-signature: blok en direct terug
      this.queue = []; this.chainOk = false;
      opp.startMove(opp.parrySig.base, { ...opp.parrySig.mod, startup: 0.5, counter: false });
      this.onEvent?.('block', { fighter: this, target: opp, move: m, parry: true });
      return;
    }
    const blockedHigh = opp.state === 'block' && h.target !== 'gedan';
    const blockedLow = opp.state === 'lowblock' && h.target === 'gedan';
    if ((blockedHigh || blockedLow) && !this.isSuper) {
      const perfect = opp.clock - opp.ukeAt < TUNE.perfectWindow;
      opp.ki -= h.dmg * 0.08; opp.stun = perfect ? 0.04 : 0.14; opp.stats.blocked++;
      opp.vx = this.facing * h.push * (perfect ? 0.6 : 1.4); this.vx = -this.facing * 0.7;
      if (blockedLow) this.legs += 6 * this.legDef; // sune uke doet de trapper pijn
      this.meter = Math.min(100, this.meter + h.meter * 0.25); opp.meter = Math.min(100, opp.meter + h.meter * (perfect ? 0.8 : 0.45));
      opp.counterT = perfect ? 0.6 : TUNE.counterWindow;
      this.recExtra += TUNE.blockRecovery;
      this.chainOk = !perfect && this.chainCount < TUNE.maxChain;
      if (perfect) { // perfect uke: de aanvaller wankelt
        this.queue = []; this.state = 'hit'; this.stun = 0.36; this.hitPose = 'hitBody'; this.t = 0; this.move = null; this.isSuper = false;
        this.vx = -this.facing * 1.4;
      }
      this.onEvent?.('block', { fighter: this, target: opp, move: m, low: blockedLow, perfect });
      return;
    }
    const counter = opp.state === 'attack' && opp.hitIndex === 0 && opp.t < opp.move.hits[0].t * opp.scale;
    const n = opp.state === 'hit' ? opp.comboTaken : 0; // hoeveelste treffer in deze combo
    const dmgScale = Math.max(0.5, 1 - TUNE.comboDmg * n), stunScale = Math.max(0.45, 1 - TUNE.comboStun * n);
    let dmg = h.dmg * this.dmgMul * (mod.dmg || 1) * (counter ? 1.25 : 1) * dmgScale;
    if (opp.state === 'lowblock' && h.target === 'chudan') dmg *= 0.6;
    opp.ki -= dmg;
    this.stats.dealt += dmg; this.stats.clean++; if (this.kaeshi || counter) this.stats.counters++;
    if (h.zone === 'legs') opp.legs += (h.legDmg || 0) * (mod.legDmg || 1) * opp.legDef * dmgScale;
    if (h.zone === 'body') opp.body += dmg * (mod.bodyBonus || h.bodyBonus || 1) * 1.15;
    this.meter = Math.min(100, this.meter + h.meter * 0.6 * this.meterMul); opp.meter = Math.min(100, opp.meter + h.meter * 0.3 * opp.meterMul);
    this.chainOk = this.chainCount < TUNE.maxChain;

    // Knock-down volgens Kyokushin-logica: ki op, been geeft het op, romp klapt dicht of schone hoofdtrap.
    let kd = null;
    const kiFrac = Math.max(0, opp.ki / opp.kiMax);
    const lastOfMove = this.hitIndex >= m.hits.length - 1;
    if (this.finalHit && lastOfMove && kiFrac < 0.25) kd = { type: h.zone === 'head' ? 'back' : 'knees', finisher: true };
    else if (opp.ki <= 0) kd = { type: h.zone === 'head' ? 'back' : 'knees' };
    else if (h.zone === 'legs' && opp.legs >= LEG_KD) kd = { type: 'knees', cause: 'legs' };
    else if (h.zone === 'body' && opp.body >= BODY_KD && dmg >= 8) kd = { type: 'knees', cause: 'body' };
    else if (h.zone === 'head' && Math.random() < (mod.kdChance || h.kdChance || 0) * this.kdMul * (0.08 + (1 - kiFrac) ** 2) * (counter || this.kaeshi ? 1.5 : 1)) kd = { type: 'back', cause: 'head' };
    opp.model.hitFlash?.(counter || this.kaeshi ? '#ff9a3c' : '#ffffff');
    if (opp.armor && !kd) { this.onEvent?.('hit', { fighter: this, target: opp, move: m, hit: h, dmg, counter, armor: true }); return; }

    if (kd) { opp.knockdown(kd); match.knockdown(opp, this, kd); }
    else {
      if (opp.state === 'attack') opp.endAttack();
      opp.state = 'hit'; opp.t = 0; opp.queue = []; opp.move = null; opp.comboTaken = n + 1;
      opp.stun = (h.zone === 'head' ? 0.42 : h.zone === 'legs' ? 0.3 : 0.32) * (counter ? 1.3 : 1) * stunScale + (this.kaeshi ? 0.08 : 0);
      opp.hitPose = h.zone === 'head' ? 'hitHead' : h.zone === 'legs' ? 'hitLeg' : 'hitBody';
      opp.anim?.hit(h.zone, 0.7 + dmg / 25);
      opp.vx = this.facing * h.push * 2.2 * (mod.push || 1) * (1 + 0.3 * n);
    }
    this.onEvent?.('hit', { fighter: this, target: opp, move: m, hit: h, dmg, counter: counter || this.kaeshi, kd, combo: n + 1 });
  }

  knockdown(kd) {
    this.state = 'down'; this.downType = kd.type; this.t = 0; this.queue = []; this.move = null; this.vx = 0; this.comboTaken = 0;
  }
  getUp() { this.state = 'getup'; this.t = 0; }

  // ── Per frame ──
  update(dt, opp, match) {
    this.opp = opp; this.t += dt; this.clock += dt;
    this.cool.sabaki -= dt; this.cool.dash -= dt; this.counterT -= dt;
    // kijkrichting volgt de tegenstander, behalve midden in een techniek of tai sabaki
    if (this.state !== 'sabaki' && this.state !== 'attack') this.facing = opp.x >= this.x ? 1 : -1;
    let target = GUARD, rate = 14;
    switch (this.state) {
      case 'attack': {
        const m = this.move, T = this.t / this.scale, first = m.hits[0];
        const reach = m.reach * (this.mod.reach || 1) + this.reachAdd, gap = Math.abs(opp.x - this.x);
        // stap in als de tegenstander net buiten bereik staat (rol kick: voorwaartse rol)
        if (m.travel && T < first.t) this.x += this.facing * Math.min(m.travel / first.t * dt / this.scale, Math.max(0, gap - 0.6));
        else if (T < first.t && gap > reach - 0.1) this.x += this.facing * Math.min(gap - reach + 0.1, (this.isSuper ? 3 : 1.3) * dt);
        this.poseAt(T, true); this.place(dt);
        // treffers in hun raakvenster
        while (this.state === 'attack' && this.hitIndex < m.hits.length) {
          const h = m.hits[this.hitIndex], end = h.t + h.active;
          if (T < h.t) break;
          let hit = false;
          if (this.lastT < h.t && T > end) { // frame sloeg het venster over: meet in het midden
            this.poseAt(h.t + h.active / 2);
            hit = this.contact(opp, 0.04, h.target);
            this.poseAt(T);
          } else hit = this.contact(opp, T >= end ? 0.04 : 0, h.target);
          if (hit) { this.resolveHit(opp, match, h); this.hitIndex++; continue; }
          if (T >= end) { this.hitIndex++; this.recExtra += TUNE.whiffRecovery; this.onEvent?.('whiff', { fighter: this, move: m }); continue; }
          break;
        }
        this.lastT = T;
        if (this.state !== 'attack') break; // perfect geblokt of geraakt tijdens de eigen aanval
        const endT = this.lastHitEnd + m.recovery * (this.queue.length ? 0.35 : 1) + this.recExtra;
        if (T >= endT) {
          if (this.queue.length) { const nq = this.queue.shift(); this.startMove(nq.id, nq.mod, nq.extra || { seq: true }); }
          else this.endAttack();
        }
        if (this.state === 'attack') return;
        break;
      }
      case 'hit': target = POSES[this.hitPose] || POSES.hitBody; rate = 22; this.stun -= dt; if (this.stun <= 0) { this.state = 'idle'; this.comboTaken = 0; } break;
      case 'block': target = POSES.block; rate = 26; if (this.stun > 0) this.stun -= dt; break;
      case 'parry': target = POSES.block; rate = 24; if (this.t > 0.7) this.state = 'idle'; break;
      case 'lowblock': target = POSES.suneUke; rate = 26; if (this.stun > 0) this.stun -= dt; break;
      case 'sabaki': {
        const s = this.sab, u = Math.min(1, this.t / TUNE.sabakiTime);
        this.x = s.x0 + (s.x1 - s.x0) * ease(u);
        this.z = Math.sin(Math.PI * u) * 0.62 * s.side;
        target = POSES.sabaki || GUARD; rate = 16;
        if (s.cross && u > 0.5) this.facing = opp.x >= this.x ? 1 : -1;
        if (u >= 1) { this.state = 'idle'; this.z = 0; this.facing = opp.x >= this.x ? 1 : -1; this.counterT = Math.max(this.counterT, 0.3); }
        break;
      }
      case 'dash': target = POSES.dash || GUARD; rate = 18; this.vx *= Math.exp(-dt * 7); if (this.t > TUNE.dashTime) { this.state = 'idle'; } break;
      case 'down': target = this.downType === 'back' ? POSES.downBack : POSES.downKnees; rate = this.downType === 'back' ? 7 : 9; break;
      case 'getup': target = GUARD; rate = 4; if (this.t > (this.anim ? (this.downType === 'back' ? 1.75 : 0.95) : 0.8)) this.state = 'idle'; break;
      case 'rei': target = POSES.rei; rate = 5; break;
      case 'pose': target = POSES[this.poseName] || GUARD; rate = this.poseRate || 6; break; // vrije pose (trainingen)
      case 'stand': target = POSES.stand; rate = 6; break;
      case 'osu': target = POSES.osu; rate = 8; break;
      case 'victory': target = POSES.victory; rate = 5; break;
    }
    if (this.anim && this.state !== 'attack') this.x += this.facing * this.anim.settle();
    if (this.anim && this.anim.update(dt)) { // motion capture
      this.wrapYaw(); blendPose(this.cur, target, 1 - Math.exp(-dt * rate), this.cur);
      this.moveBody(dt); return;
    }
    this.wrapYaw(); // eerst normaliseren, anders draait hij na een draaitrap een hele slag terug
    const k = 1 - Math.exp(-dt * rate);
    blendPose(this.cur, target, k, this.cur);
    // ademhaling/veren in kamae en loopcyclus
    if (this.state === 'idle' || this.state === 'walk' || this.state === 'block') {
      this.walkPh += dt * (this.state === 'walk' ? 9 + Math.abs(this.vx) * 2 : 5.5);
      const b = Math.sin(this.walkPh), tmp = this.tmp;
      for (const j in this.cur) { const s = this.cur[j], d = tmp[j]; for (let i = 0; i < s.length; i++) d[i] = s[i]; }
      const moving = Math.min(1, Math.abs(this.vx) / 1.5);
      tmp.root[0] += Math.abs(b) * (0.012 + 0.016 * moving) - 0.01;
      tmp.lHip[0] += b * 0.22 * moving; tmp.rHip[0] -= b * 0.22 * moving; tmp.lKnee[0] += Math.max(0, b) * 0.3 * moving; tmp.rKnee[0] += Math.max(0, -b) * 0.3 * moving;
      tmp.spine[0] += this.vx * this.facing * 0.03; // iets voorover bij naar voren gaan
      if (this.legs > LEG_KD * 0.6) tmp.lKnee[0] += 0.15 + Math.sin(this.walkPh * 0.5) * 0.05; // hinkt
      this.model.setPose(tmp);
    } else this.model.setPose(this.cur);
    this.moveBody(dt);
  }

  // beweging: lopen met versnelling, terugslag en dash met uitlopen
  moveBody(dt) {
    if (this.state === 'walk' || this.state === 'idle') this.vx += ((this.state === 'walk' ? this.walkTarget || 0 : 0) - this.vx) * Math.min(1, dt * 14);
    else if (this.state === 'hit' || this.state === 'down' || this.state === 'block' || this.state === 'lowblock') this.vx *= Math.exp(-dt * 6);
    else if (this.state !== 'dash') this.vx *= Math.exp(-dt * 10);
    if (this.state !== 'sabaki') this.x += this.vx * dt;
    this.model.tickFlash?.(dt);
    this.place(dt);
  }

  // pose op aanvalstijd T; root: de voorwaartse beweging van de opname gaat naar de positie
  poseAt(T, root = false) {
    if (this.anim && this.anim.segs) {
      this.anim.attack(T);
      return;
    }
    this.attackPose(T); this.model.setPose(this.cur);
  }

  attackPose(T) {
    const fr = this.move.frames;
    let i = 0; while (i < fr.length - 2 && T >= fr[i + 1][1]) i++;
    const [na, ta] = fr[i], [nb, tb] = fr[Math.min(i + 1, fr.length - 1)];
    const a = i === 0 ? this.startPose : POSES[na], b = POSES[nb];
    const u = tb > ta ? Math.min(1, Math.max(0, (T - ta) / (tb - ta))) : 1;
    // terugdraaien na een draaitrap of rol via ±2π, niet terug langs dezelfde kant
    let yb = b.root[2];
    if (a.root[2] > Math.PI && yb === 0) yb = TAU;
    if (a.root[2] < -Math.PI && yb === 0) yb = -TAU;
    let pb = b.root[3]; if (a.root[3] > Math.PI && pb <= 0.4) pb += TAU;
    const e = ease(u);
    blendPose(a, b, e, this.cur);
    this.cur.root[2] = a.root[2] + (yb - a.root[2]) * e;
    this.cur.root[3] = a.root[3] + (pb - a.root[3]) * e;
  }
  wrapYaw() {
    if (this.state === 'attack') return;
    const r = this.cur.root;
    r[2] = Math.atan2(Math.sin(r[2]), Math.cos(r[2])); // naar (-π, π]
    r[3] = Math.atan2(Math.sin(r[3]), Math.cos(r[3]));
  }

  // draait vloeiend naar de tegenstander (geen sprong bij wisselen van kant)
  place(dt = 1) {
    const g = this.model.group, want = this.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 18);
    g.position.x = this.x; g.position.z = this.z;
    g.rotation.y = this.yaw;
  }
}

// Houdt de vechters uit elkaar en op de mat. Wie wordt teruggeslagen of blokt, blijft net binnen
// de rand: de rest van de terugslag gaat naar de aanvaller (zo kun je niemand tegen de rand vastzetten).
// Alleen wie zelf naar buiten loopt, kan jogai krijgen.
export function separate(a, b, bounds) {
  const crossing = a.state === 'sabaki' || b.state === 'sabaki';
  const d = b.x - a.x, gap = Math.abs(d);
  if (!crossing && gap < MIN_GAP && a.state !== 'down' && b.state !== 'down') {
    const push = (MIN_GAP - gap) / 2, s = Math.sign(d) || (a.facing > 0 ? 1 : -1);
    a.x -= push * s; b.x += push * s;
  }
  const soft = bounds - TUNE.edge;
  for (const [f, o] of [[a, b], [b, a]]) {
    const side = Math.sign(f.x), out = Math.abs(f.x) - soft;
    if (out <= 0) continue;
    const walkingOut = f.state === 'walk' && f.vx * side > 0;
    if (walkingOut || f.state === 'sabaki' || f.state === 'down') continue;
    f.x = side * soft;
    if (f.vx * side > 0) f.vx = 0;
    if (o.state !== 'down' && o.state !== 'sabaki' && Math.abs(o.x - f.x) < 1.6) o.x -= side * out;
  }
  for (const f of [a, b]) f.x = Math.max(-(bounds + 0.3), Math.min(bounds + 0.3, f.x));
}
