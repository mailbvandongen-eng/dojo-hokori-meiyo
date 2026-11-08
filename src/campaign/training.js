// Trainingen in de campaign: bokszak (ritme en timing) en gewichtheffen (timing en kracht).
// Ze draaien in de hal, met de officials en het publiek verborgen (arena.setMode('training')).
// De besturing is dezelfde als in een gevecht: TSUKI, GERI (↓ + GERI = lage trap), UKE en KIAI.
import * as THREE from '../../lib/three.module.js';
import { Fighter } from '../game/fighter.js';
import { Controller } from '../game/input.js';

const $ = s => document.querySelector(s);
const BAG_X = 0.05, BAG_PIVOT_Y = 2.45, BAG_LEN = 1.2;
const NOTE = {
  tsuki: { label: 'TSUKI', jp: '突', color: '#ff8a8a' },
  geri: { label: 'GERI', jp: '蹴', color: '#8ab6ff' },
  gedan: { label: '↓ GERI', jp: '下', color: '#9be39b' },
};

export class TrainingSession {
  // api: { scene, arena, fx, sfx, touch, isTouch, camera(pos, look), done(result) }
  constructor(kind, playerData, api) {
    this.kind = kind; this.api = api; this.t = 0; this.over = false; this.objects = [];
    api.arena.setMode('training');
    this.f = new Fighter(playerData, 'aka', api.scene, {});
    this.f.onEvent = () => {};
    this.ctrl = new Controller('solo', api.isTouch ? api.touch : null);
    this.el = $('#train'); this.el.classList.add('on');
    if (api.isTouch) $('#touch').classList.add('on');
    kind === 'bokszak' ? this.setupBag() : this.setupWeights();
  }

  add(o) { this.api.scene.add(o); this.objects.push(o); return o; }

  // ── Bokszak ──
  setupBag() {
    const f = this.f; f.reset(-0.82, 1); f.state = 'idle';
    const g = new THREE.Group(); g.position.set(BAG_X, BAG_PIVOT_Y, 0);
    const leather = new THREE.MeshStandardMaterial({ color: '#7a1414', roughness: 0.55 });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, BAG_LEN - 0.45, 6), new THREE.MeshStandardMaterial({ color: '#888', metalness: 0.8, roughness: 0.3 }));
    chain.position.y = -(BAG_LEN - 0.45) / 2; g.add(chain);
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 1.0, 20), leather);
    bag.position.y = -BAG_LEN - 0.05; bag.castShadow = true; g.add(bag);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.08, 20), new THREE.MeshStandardMaterial({ color: '#111' }));
    band.position.y = -BAG_LEN + 0.38; g.add(band);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: '#2a2a2e' }));
    beam.position.set(BAG_X, BAG_PIVOT_Y + 0.06, 0); this.add(beam);
    this.bag = { g, mesh: bag, ang: 0, vel: 0 }; this.add(g);
    // ritme: noten met oplopend tempo
    this.notes = []; let tt = 2.0, gap = 0.95;
    const types = ['tsuki', 'tsuki', 'geri', 'gedan', 'tsuki', 'geri'];
    while (tt < 31) { this.notes.push({ t: tt, type: types[(Math.random() * types.length) | 0], state: 'open' }); tt += gap * (Math.random() < 0.2 ? 0.5 : 1); gap = Math.max(0.5, gap - 0.017); }
    this.duration = tt + 1.2; this.score = 0; this.combo = 0; this.maxCombo = 0; this.hits = { perfect: 0, goed: 0, ok: 0, mis: 0 };
    this.jabSide = 0;
    f.resolveHit = () => this.bagImpact();
    this.el.innerHTML = `<div class="trTop"><b>BOKSZAK</b><span id="trTime"></span><span id="trScore">0</span><span id="trCombo"></span></div>
      <div id="trJudge"></div>
      <div class="trLane"><div class="trTarget"></div><div id="trNotes"></div></div>
      <div class="trHelp">Raak de bokszak als de techniek in de cirkel staat · TSUKI = stoot · GERI = trap · ↓ + GERI = lage trap</div>`;
    this.api.camera(new THREE.Vector3(-0.4, 1.45, 3.4), new THREE.Vector3(-0.35, 1.05, 0));
  }

  bagImpact() {
    const m = this.f.move, b = this.bag;
    const power = (m.dmg || 8) / 10;
    b.vel += 1.6 * power;
    const at = new THREE.Vector3(BAG_X - 0.18, m.target === 'gedan' ? 1.1 : m.target === 'jodan' ? 1.65 : 1.35, 0);
    at.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0);
    this.api.fx.impact(at, 1, m.dmg * 1.2, m.zone, false);
    this.api.sfx.hit(power, m.zone);
  }

  bagInput(type) {
    const now = this.t;
    let best = null;
    for (const n of this.notes) if (n.state === 'open' && Math.abs(n.t - now) < 0.32 && (!best || Math.abs(n.t - now) < Math.abs(best.t - now))) best = n;
    // de vechter voert de techniek altijd uit
    const id = type === 'tsuki' ? (this.jabSide++ % 2 ? 'seiken_gyaku' : 'seiken_jab') : type === 'gedan' ? 'gedan_mawashi' : 'chudan_mawashi';
    this.f.state = 'idle'; this.f.startMove(id, { startup: 0.7 });
    if (!best || best.type !== type) { this.judge(best && best.type !== type ? 'Verkeerde techniek' : 'Te vroeg', 'mis'); this.combo = 0; if (best) best.state = 'mis', this.hits.mis++; return; }
    const d = Math.abs(best.t - now);
    const [label, val] = d < 0.08 ? ['PERFECT', 100] : d < 0.17 ? ['GOED', 70] : ['OK', 40];
    best.state = 'hit'; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.hits[label === 'PERFECT' ? 'perfect' : label === 'GOED' ? 'goed' : 'ok']++;
    this.score += val * (1 + Math.min(this.combo, 20) * 0.05);
    this.judge(label + (this.combo >= 5 ? ` · ${this.combo} combo` : ''), label === 'PERFECT' ? 'top' : '');
    if (this.combo % 10 === 0) { this.api.sfx.kiai(1.05); this.api.fx.flash(0.15, '#ffe7a8'); }
  }

  judge(text, cls) { const j = $('#trJudge'); j.textContent = text; j.className = 'on ' + (cls || ''); clearTimeout(this.jt); this.jt = setTimeout(() => (j.className = ''), 450); }

  updateBag(dt) {
    const b = this.bag;
    b.vel += -9.8 / BAG_LEN * Math.sin(b.ang) * dt; b.vel *= Math.exp(-dt * 1.6); b.ang += b.vel * dt;
    b.g.rotation.z = b.ang; // zwaait weg van de vechter (naar +x)
    for (const n of this.notes) if (n.state === 'open' && this.t - n.t > 0.32) { n.state = 'mis'; this.hits.mis++; this.combo = 0; this.judge('Gemist', 'mis'); }
    // noten tekenen
    const lane = $('#trNotes'); if (!lane) return;
    const W = lane.clientWidth || 600, speed = W * 0.28;
    lane.innerHTML = this.notes.filter(n => n.state === 'open' && n.t - this.t < 3.6 && n.t - this.t > -0.35).map(n => {
      const x = W * 0.12 + (n.t - this.t) * speed, c = NOTE[n.type];
      return `<div class="trNote" style="left:${x}px;border-color:${c.color}"><span class="jp">${c.jp}</span>${c.label}</div>`;
    }).join('');
    $('#trScore').textContent = Math.round(this.score);
    $('#trCombo').textContent = this.combo >= 2 ? `${this.combo}× combo` : '';
    $('#trTime').textContent = `${Math.max(0, Math.ceil(this.duration - this.t))} s`;
    if (this.t > this.duration) this.finish();
  }

  // ── Gewichtheffen ──
  setupWeights() {
    const f = this.f; f.reset(0, 1); f.state = 'pose'; f.poseName = 'pressDown';
    const steel = new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 0.9, roughness: 0.25 });
    const plate = new THREE.MeshStandardMaterial({ color: '#1b1b1f', roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: '#b1101f', roughness: 0.5 });
    const bar = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 10), steel); rod.rotation.z = Math.PI / 2; bar.add(rod);
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(i ? 0.17 : 0.22, i ? 0.17 : 0.22, 0.05, 24), i ? red : plate);
      p.rotation.z = Math.PI / 2; p.position.x = sx * (0.58 + i * 0.06); p.castShadow = true; bar.add(p);
    }
    this.bar = this.add(bar);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.5), plate); rack.position.set(0, 0.03, -1.2); this.add(rack);
    this.reps = 0; this.maxReps = 8; this.fails = 0; this.score = 0; this.phase = 'aim'; this.needle = 0; this.dirN = 1; this.hits = { perfect: 0, goed: 0, mis: 0 };
    this.newRep();
    this.el.innerHTML = `<div class="trTop"><b>GEWICHTHEFFEN</b><span id="trReps"></span><span id="trScore">0</span><span id="trKg"></span></div>
      <div id="trJudge"></div>
      <div class="trGauge"><div id="trZone"></div><div id="trGold"></div><div id="trNeedle"></div></div>
      <div class="trHelp">Druk op een knop (TSUKI, GERI, UKE of KIAI) als de naald in het groen staat. In het goud is perfect.</div>`;
    this.api.camera(new THREE.Vector3(1.9, 1.4, 2.6), new THREE.Vector3(0, 1.15, 0));
  }
  newRep() {
    const k = this.reps / this.maxReps;
    this.zoneW = 0.3 - k * 0.17; this.zoneC = 0.25 + Math.random() * 0.5; this.speed = 0.7 + k * 1.1; this.kg = 30 + this.reps * 7.5;
  }
  weightInput() {
    if (this.phase !== 'aim') return;
    const d = Math.abs(this.needle - this.zoneC);
    let label, val;
    if (d < 0.025) [label, val] = ['PERFECT', 100]; else if (d < this.zoneW / 2) [label, val] = ['GOED', 70]; else [label, val] = ['TE ZWAAR', 0];
    this.score += val; this.reps++;
    this.hits[val === 100 ? 'perfect' : val ? 'goed' : 'mis']++;
    const f = this.f;
    if (val) { f.poseName = 'pressUp'; f.poseRate = val === 100 ? 9 : 5; this.api.sfx.kiai(1.1); this.judge(label, val === 100 ? 'top' : ''); }
    else { f.poseName = 'pressStrain'; f.poseRate = 4; this.fails++; this.api.sfx.block(); this.judge(label, 'mis'); }
    this.phase = 'lift'; this.liftT = 0;
  }
  updateWeights(dt) {
    const f = this.f;
    if (this.phase === 'aim') {
      this.needle += this.dirN * this.speed * dt;
      if (this.needle > 1) { this.needle = 1; this.dirN = -1; } if (this.needle < 0) { this.needle = 0; this.dirN = 1; }
    } else {
      this.liftT += dt;
      if (this.liftT > 0.9 && f.poseName !== 'pressDown') { f.poseName = 'pressDown'; f.poseRate = 4; }
      if (this.liftT > 1.5) { if (this.reps >= this.maxReps || this.fails >= 3) return this.finish(); this.phase = 'aim'; this.newRep(); }
    }
    // halter tussen de vuisten
    const a = f.model.partWorld('lFist'), b = f.model.partWorld('rFist');
    this.bar.position.copy(a).add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    this.bar.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    const z = $('#trZone'), g = $('#trGold'), n = $('#trNeedle'); if (!z) return;
    z.style.left = `${(this.zoneC - this.zoneW / 2) * 100}%`; z.style.width = `${this.zoneW * 100}%`;
    g.style.left = `${(this.zoneC - 0.025) * 100}%`; n.style.left = `${this.needle * 100}%`;
    $('#trReps').textContent = `Herhaling ${Math.min(this.reps + 1, this.maxReps)}/${this.maxReps}`;
    $('#trKg').textContent = `${this.kg} kg`; $('#trScore').textContent = Math.round(this.score);
  }

  // ── Per frame ──
  update(dt) {
    if (this.over) return;
    this.t += dt;
    const raw = this.ctrl.read(dt), inp = this.ctrl.toFighter(raw, 1), p = inp.pressed;
    if (this.kind === 'bokszak') {
      if (p.tsuki) { this.bagInput('tsuki'); this.ctrl.consume(); }
      else if (p.geri) { this.bagInput(raw.down ? 'gedan' : 'geri'); this.ctrl.consume(); }
      this.f.update(dt, { x: BAG_X + 0.2, state: 'idle' }, { rules: 'toernooi', foul() {}, knockdown() {} });
      this.f.x = -0.82; this.f.place();
      this.updateBag(dt);
    } else {
      if (p.tsuki || p.geri || p.kiai || (raw.uke && !this.ukeHeld)) { this.weightInput(); this.ctrl.consume(); }
      this.ukeHeld = raw.uke;
      this.f.update(dt, { x: 1, state: 'idle' }, {});
      this.f.model.group.rotation.y = 0.55; // half naar de camera
      this.updateWeights(dt);
    }
  }

  // score 0-100
  result() {
    if (this.kind === 'bokszak') {
      const n = this.notes.length, v = this.hits.perfect + this.hits.goed * 0.7 + this.hits.ok * 0.4;
      return { kind: 'bokszak', score: Math.round(100 * v / n), detail: `${this.hits.perfect} perfect · ${this.hits.goed} goed · ${this.hits.ok} ok · ${this.hits.mis} gemist · beste combo ${this.maxCombo}` };
    }
    return { kind: 'gewicht', score: Math.round(this.score / this.maxReps), detail: `${this.reps - this.fails}/${this.maxReps} herhalingen · ${this.hits.perfect} perfect · zwaarste lift ${this.kg} kg` };
  }
  finish() {
    if (this.over) return; this.over = true;
    this.api.sfx.bell();
    setTimeout(() => this.api.done(this.result()), 700);
  }
  destroy() {
    for (const o of this.objects) this.api.scene.remove(o);
    this.api.scene.remove(this.f.model.group);
    this.el.classList.remove('on'); this.el.innerHTML = '';
    $('#touch').classList.remove('on');
    this.api.arena.setMode('match');
  }
}
