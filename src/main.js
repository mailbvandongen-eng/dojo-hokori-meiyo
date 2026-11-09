// Dojo Hokori Meiyo Fight Game: schermen, spelmodi, camera en hoofdlus.
import * as THREE from '../lib/three.module.js';
import { ROSTER, byId, beltOf, graadNiveau } from './data/roster.js';
import { MOVES, INPUT_MAP } from './data/moves.js';
import { CALLS, COUNT_ROMAJI, TIPS } from './data/terms.js';
import { profile, save as saveProfile, rankInfo, addResult, addBonus, COSTUMES, costumeUnlocked } from './data/profile.js';
import { isLocked, nextUnlock, bossFinalDue, unlockAfterTournament, FINAL_BOSS, UNLOCK_ORDER } from './data/unlocks.js';
import { buildFighter } from './game/model.js';
import { headReady } from './game/head.js';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, RoomEnvironment } from '../lib/three-addons.js';
import { POSES } from './game/poses.js';
import { initCampaign } from './campaign/campaign.js';
import { online } from './data/online.js';
import { createArena } from './game/arena.js';
import { Fighter, separate, LEG_KD, BODY_KD } from './game/fighter.js';
import { Match } from './game/match.js';
import { AI, DIFFICULTY } from './game/ai.js';
import { Controller, TouchPad } from './game/input.js';
import { FX } from './game/fx.js';
import { getLogo } from './game/textures.js';
import { unlockAudio, sfx, music, say, sayCount, settings as audioSettings, setVolumes } from './audio/audio.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ── Instellingen ──
const cfg = Object.assign({ roundTime: 120, rules: 'toernooi', diff: 'senpai', voice: 'ja', sfx: 0.8, music: 0.45, gfx: 'hoog' }, JSON.parse(localStorage.getItem('dhm-settings') || '{}'));
function applySettings() {
  audioSettings.sfx = cfg.sfx; audioSettings.music = cfg.music; audioSettings.voice = cfg.voice !== 'off'; audioSettings.voiceLang = cfg.voice === 'nl' ? 'nl' : 'ja';
  setVolumes();
  renderer.setPixelRatio(Math.min(devicePixelRatio, cfg.gfx === 'hoog' ? 2 : 1));
  renderer.shadowMap.enabled = cfg.gfx === 'hoog';
  setupPost();
  localStorage.setItem('dhm-settings', JSON.stringify(cfg));
}

// ── Renderer en scène ──
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.98;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
const arena = createArena(scene, renderer);
const fx = new FX(scene);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer?.setSize(w, h); camera.aspect = w / h; camera.fov = w / h < 1.5 ? 48 : 40; camera.updateProjectionMatrix(); }

// ── Belichting en nabewerking ──
// Omgevingslicht (reflecties op huid en stof) en op "Hoog": gloed, filmkorrel en vignet.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;
const GrainVignette = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 0.035 }, vig: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, amount, vig; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 7.13) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - vig * smoothstep(0.35, 0.85, d);
      c.rgb += (rnd(vUv * 900.0) - 0.5) * amount; gl_FragColor = c; }`,
};
let composer = null, grainPass = null;
function setupPost() {
  composer?.dispose?.(); composer = null;
  if (cfg.gfx !== 'hoog') return;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.18, 0.4, 0.96));
  composer.addPass(new OutputPass());
  grainPass = new ShaderPass(GrainVignette); composer.addPass(grainPass);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
}
function renderFrame() {
  if (composer) { grainPass.uniforms.time.value = performance.now() / 1000 % 100; composer.render(); }
  else renderFrame();
}
addEventListener('resize', resize); resize(); applySettings();

// ── Schermen ──
const OVERLAYS = ['pause', 'options', 'moves', 'photo', 'leaders'];
function show(id) { $$('.screen').forEach(s => { if (!OVERLAYS.includes(s.id)) s.classList.toggle('on', s.id === id); }); }
function overlay(id, on) { $('#' + id).classList.toggle('on', on); }

// ── Spelstatus ──
let G = null;            // lopend gevecht
let paused = false, elapsed = 0;
let camMode = 'menu', camFocus = null, camT = 0;
const camPos = new THREE.Vector3(0, 3, 9), camLook = new THREE.Vector3(0, 1, 0);
let tourney = null, story = null;
const touch = new TouchPad($('#touch'));

// 'me' = de campaign-vechter van de speler
let meData = null;
const fighterById = id => (id === 'me' ? meData : byId[id]);

function clearFight() {
  if (!G) return;
  for (const f of [G.aka, G.shiro]) scene.remove(f.model.group);
  G = null;
  $('#hud').classList.remove('on'); $('#touch').classList.remove('on');
  $('#trainBar').classList.remove('on'); $('#trainInfo').classList.remove('on');
}

// opts: { mode, akaId, shiroId, akaCtrl: 'solo'|'p1'|'ai', shiroCtrl, diff, training, demo, costume }
function startFight(opts) {
  clearFight();
  const aData = opts.akaData || fighterById(opts.akaId), bData = opts.shiroData || fighterById(opts.shiroId);
  const aka = new Fighter(aData, 'aka', scene, { costume: opts.akaCostume || {}, scale: opts.akaScale });
  const shiro = new Fighter(bData, 'shiro', scene, { costume: opts.shiroCostume || {}, scale: opts.shiroScale });
  const match = new Match({ aka, shiro, arena, hooks, config: { roundTime: opts.roundTime || cfg.roundTime, rules: cfg.rules, training: !!(opts.training || opts.demo) } });
  G = { ...opts, aka, shiro, match, ctrl: {}, ai: {} };
  for (const [f, c] of [[aka, opts.akaCtrl], [shiro, opts.shiroCtrl]]) {
    if (c === 'ai') G.ai[f.corner] = new AI(f, opts.diff || cfg.diff);
    else if (c && c !== 'dummy') G.ctrl[f.corner] = new Controller(c, f.corner === 'aka' && isTouch ? touch : null);
    f.onEvent = (type, d) => onFighterEvent(type, d);
  }
  match.start();
  elapsed = 0; paused = false;
  if (opts.demo) { camMode = 'menu'; return; }
  buildHUD(); $('#hud').classList.add('on');
  if (isTouch && G.ctrl.aka) $('#touch').classList.add('on');
  camMode = opts.training ? 'fight' : 'intro'; camT = 0;
  music(true, 0.6);
  sfx.crowd(0.4);
}

// ── Match-hooks: scheidsrechter, publiek, camera ──
const hooks = {
  call(key, o = {}) {
    if (!G || G.demo) return;
    const c = CALLS[key];
    callout(c.romaji, o.sub || c.nl, o.side, o.big !== false);
    say(key);
    if (key === 'hajime' || key === 'tsuzukete') { sfx.taiko(true); camMode = 'fight'; }
    if (key === 'ippon' || key === 'awasete') { sfx.roar(); sfx.taiko(true); }
  },
  shout(f) { if (G && !G.demo) sfx.kiai(f.data.uiterlijk?.lengte > 1 ? 0.85 : 1.1); },
  knockdown(v, a, kd) {
    if (G.demo) return;
    fx.slowmo(kd.finisher ? 0.15 : 0.3, kd.finisher ? 1.6 : 0.8);
    const p = v.model.partWorld('pelvis'); p.y = 0.1; fx.dust(p);
    sfx.thud(); sfx.roar(); arena.cheer(1.3);
    camMode = 'kd'; camFocus = v; camT = 0;
    if (kd.finisher) { showSpecial(a.data.finisher.naam, 'FINISHER', 2.2); fx.flash(0.6, '#ffe7a8'); }
  },
  count(n) { callout(COUNT_ROMAJI[n - 1], '', null, false); sayCount(n); },
  score() { updateScore(); },
  timeUp() { sfx.taiko(true); setTimeout(() => sfx.taiko(false), 260); camMode = 'hantei'; camT = 0; },
  // beslissing: scheidsrechter (hand) + hoekscheidsrechters (vlaggen), groot in beeld en in de HUD
  votes(v) {
    camMode = 'hantei'; camT = 0;
    const who = ['Scheidsrechter', ...arena.judges.map((_, i) => `Hoekrechter ${i + 1}`)];
    const el = $('#votes');
    el.innerHTML = v.map((x, i) => `<div class="vote ${x}"><i></i><b>${x === 'aka' ? 'AKA' : x === 'shiro' ? 'SHIRO' : 'HIKIWAKE'}</b><small>${who[i]}</small></div>`).join('');
    el.classList.add('on'); clearTimeout(votesTimer); votesTimer = setTimeout(() => el.classList.remove('on'), 3600);
    sfx.block();
  },
  end(winner, how) { onFightEnd(winner, how); },
};

let votesTimer = 0;
function onFighterEvent(type, d) {
  if (!G) return;
  const demo = G.demo;
  switch (type) {
    case 'swing': if (!demo) { sfx.whoosh(d.move.type === 'geri' ? 0.3 : 0.16); if (d.move.dmg >= 12 && Math.random() < 0.5) sfx.kiai(1 + Math.random() * 0.2); } break;
    case 'hit': {
      const t = d.target, z = (d.hit || d.move).zone;
      const at = t.model.partWorld(z === 'head' ? 'head' : z === 'legs' ? 'lKnee' : 'spine');
      if (z === 'head') at.y += 0.12; if (z === 'body') at.y += 0.25; if (z === 'legs') at.y += 0.18;
      at.x -= d.fighter.facing * 0.12;
      fx.impact(at, d.fighter.facing, d.dmg, z, d.counter);
      if (!demo) {
        sfx.hit(Math.min(1.6, d.dmg / 9), z); arena.cheer(d.dmg / 40);
        if (d.counter) showSpecial('COUNTER', '', 0.6);
        else if (d.combo >= 2) showSpecial(`${d.combo} HIT RENZOKU`, '', 0.5);
      }
      if (G.mode === 'training' && d.fighter === G.aka) trainInfo(d.move, d.dmg, d.counter);
      break;
    }
    case 'block':
      if (!demo) sfx.block();
      fx.burst(d.target.model.partWorld(d.low ? 'lKnee' : 'lEl'), { n: 8, color: [0.7, 0.85, 1], speed: 1.5, size: 0.05 });
      if (!demo && (d.parry || d.perfect)) { showSpecial(d.perfect ? 'PERFECT UKE' : 'KAESHI', d.perfect ? 'Counter nu!' : 'Counter', 0.8); fx.flash(0.15, '#bfe0ff'); }
      if (G.mode === 'training' && d.fighter === G.aka) trainInfo(d.move, 0, false, d.low ? 'Geblokt met sune uke' : 'Geblokt');
      if (G.mode === 'training' && d.target === G.aka) trainInfo(d.move, 0, false, d.perfect ? 'Perfect uke! Val nu aan voor een kaeshi (counter).' : 'Geblokt. Je hebt nu even een counter-venster.');
      break;
    case 'kaeshi': if (!demo) { showSpecial('KAESHI', 'Counter', 0.6); sfx.kiai(1.1); } break;
    case 'dodge': if (!demo) showSpecial('TAI SABAKI', 'Ontweken', 0.6); break;
    case 'sabaki': if (!demo) sfx.whoosh(0.35); break;
    case 'dash': if (!demo) sfx.whoosh(0.2); break;
    case 'burst':
      if (demo) break;
      showSpecial('KIAI!', 'Uitbraak uit de combo', 0.8); sfx.kiai(0.9); fx.flash(0.3, '#ffd76a');
      fx.ring(d.fighter.model.partWorld('spine').add(new THREE.Vector3(0, 0.3, 0)), d.fighter.facing, '#ffd76a', 2.2);
      break;
    case 'special': if (!demo) { showSpecial(d.name, d.jp, 1.1); sfx.kiai(1.05); } break;
    case 'super':
      if (demo) break;
      showSpecial(d.name, d.jp, 1.8); fx.slowmo(0.45, 0.6); fx.flash(0.45, '#ffd76a'); sfx.kiai(0.95); sfx.taiko(true);
      camMode = 'super'; camFocus = d.fighter; camT = 0;
      break;
  }
}

// ── HUD ──
let calloutTimer = 0, specialTimer = 0;
function callout(big, sub, side, isBig = true) {
  const el = $('#callout');
  el.innerHTML = `<div class="big ${side || ''}" style="font-size:${isBig ? '' : 'clamp(26px,7vh,60px)'}">${big}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
  el.classList.add('on'); clearTimeout(calloutTimer); calloutTimer = setTimeout(() => el.classList.remove('on'), isBig ? 1400 : 800);
}
function showSpecial(name, jp, dur = 1.2) {
  const el = $('#special'); el.innerHTML = `${jp ? `<span class="jp">${jp}</span>` : ''}${name}`;
  el.classList.add('on'); clearTimeout(specialTimer); specialTimer = setTimeout(() => el.classList.remove('on'), dur * 1000);
}
function sideHTML(f) {
  return `<div class="nm">${f.corner === 'aka' ? '<span class="corner">AKA</span>' : ''}${f.data.naam}${f.corner === 'shiro' ? '<span class="corner">SHIRO</span>' : ''}</div>
    <div class="ki"><u></u><i></i></div>
    <div class="marks"></div>
    <div class="dmg"><span>Benen <i><b class="lg"></b></i></span><span>Romp <i><b class="bd"></b></i></span></div>`;
}
function buildHUD() {
  $('#hudA').innerHTML = sideHTML(G.aka); $('#hudB').innerHTML = sideHTML(G.shiro);
  for (const [id, f] of [['#meterA', G.aka], ['#meterB', G.shiro]]) $(id).innerHTML = `<div class="lbl">KIAI · ${f.data.naam.toUpperCase()}</div><div class="seg"><i><b></b></i><i><b></b></i><i><b></b></i></div>`;
  G.hud = {};
  for (const [k, sel] of [['aka', '#hudA'], ['shiro', '#hudB']]) {
    const r = $(sel); G.hud[k] = { ki: r.querySelector('.ki i'), lag: r.querySelector('.ki u'), lg: r.querySelector('.lg'), bd: r.querySelector('.bd'), marks: r.querySelector('.marks'), meter: $(k === 'aka' ? '#meterA' : '#meterB') };
  }
  updateScore();
}
function updateScore() {
  if (!G || !G.hud) return;
  for (const f of [G.aka, G.shiro]) {
    const s = f.score, m = G.hud[f.corner].marks;
    m.innerHTML = `<span class="wz ${s.wazaari >= 1 ? 'on' : ''}"></span><span class="wz ${s.wazaari >= 2 ? 'on' : ''}"></span>
      ${s.wazaari ? '<span>WAZA-ARI</span>' : ''}${s.chui ? `<span class="pen">CHUI ${s.chui}</span>` : ''}${s.genten ? `<span class="pen">GENTEN ${s.genten}</span>` : ''}`;
  }
}
function updateHUD() {
  if (!G || !G.hud) return;
  for (const f of [G.aka, G.shiro]) {
    const h = G.hud[f.corner], k = Math.max(0, f.ki / f.kiMax);
    h.ki.style.transform = `scaleX(${k})`; h.lag.style.transform = `scaleX(${k})`;
    h.lg.style.width = Math.min(100, f.legs / LEG_KD * 100) + '%'; h.bd.style.width = Math.min(100, f.body / BODY_KD * 100) + '%';
    const segs = h.meter.querySelectorAll('.seg b');
    segs.forEach((b, i) => { b.style.transform = `scaleX(${Math.max(0, Math.min(1, (f.meter - i * 33.34) / 33.33))})`; });
    h.meter.classList.toggle('full', f.meter >= 100);
  }
  const btn = $('[data-btn=kiai]'); btn.classList.toggle('ready', G.aka.meter >= 33);
  const m = G.match, t = m.timer;
  $('#hudTime').textContent = t === Infinity ? '∞' : `${Math.floor(Math.ceil(t) / 60)}:${String(Math.ceil(t) % 60).padStart(2, '0')}`;
  $('#hudRound').textContent = G.mode === 'training' ? 'KEIKO' : m.round === 0 ? 'HON-SEN' : `ENCHO-SEN ${m.round}`;
}

// ── Hoofdlus ──
let last = performance.now();
let ticker = null;                 // trainingen (campaign) draaien buiten een gevecht
let previewModel = null;           // vechter in beeld bij het maken van je karateka en in de hub
const camCustom = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
function preview(data, pose = 'stand', place = 'right') {
  if (previewModel) scene.remove(previewModel.group);
  previewModel = null; if (!data) return;
  previewModel = buildFighter(data, 'aka', {});
  previewModel.setPose(POSES[pose] || POSES.stand); previewModel.group.rotation.y = 0.5;
  scene.add(previewModel.group);
  // 'right': vechter rechts van een paneel links (vechter maken); 'center': tussen twee panelen (hub)
  if (place === 'center') { camCustom.pos.set(0, 1.05, 4.0); camCustom.look.set(0, 0.95, 0); }
  else { camCustom.pos.set(-1.0, 1.25, 3.1); camCustom.look.set(-0.95, 1.0, 0); }
  camMode = 'custom';
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(0.05, (now - last) / 1000); last = now;
  if (G && !paused) {
    const dt = fx.step(raw); elapsed += dt;
    simulate(dt); fx.update(dt); arena.update(dt, elapsed);
    updateHUD();
  } else if (!G) {
    arena.update(raw, (elapsed += raw));
    if (ticker) { const dt = fx.step(raw); ticker(dt); fx.update(dt); }
    if (previewModel) previewModel.group.rotation.y += raw * 0.35;
  }
  updateCamera(raw);
  renderFrame();
}

function simulate(dt) {
  const { aka, shiro, match } = G;
  match.update(dt);
  for (const [f, o] of [[aka, shiro], [shiro, aka]]) {
    const c = G.ctrl[f.corner], ai = G.ai[f.corner];
    if (c) {
      const raw = c.read(dt);
      if (match.fighting) {
        const q0 = f.queue.length;
        f.handleInput(c.toFighter(raw, f.facing), o, match);
        if ((f.state === 'attack' && f.t === 0) || f.queue.length > q0 || f.state === 'parry') c.consume();
      } else c.consume();
    } else if (ai && match.fighting) f.handleInput(ai.input(dt, o, arena.bounds), o, match);
    else if (G.mode === 'training' && f === shiro && match.fighting) f.handleInput(dummyInput(), o, match);
  }
  aka.update(dt, shiro, match); shiro.update(dt, aka, match);
  separate(aka, shiro, arena.bounds);
  // herstel tijdens het gevecht: ki en romp herstellen langzaam, benen nauwelijks (zoals echt)
  for (const f of [aka, shiro]) if (f.state !== 'down' && match.fighting) { f.ki = Math.min(f.kiMax, f.ki + dt * 1.2); f.body = Math.max(0, f.body - dt * 0.8); f.legs = Math.max(0, f.legs - dt * 0.15); }
  if (G.training || G.demo) for (const f of [aka, shiro]) if (f.ki < f.kiMax * 0.15) { f.ki = f.kiMax; f.legs = f.body = 0; }
  if (G.demo) for (const f of [aka, shiro]) if (Math.abs(f.x) > 3.5) f.x *= 0.98;
  if ((camMode === 'kd' && match.fighting) || (camMode === 'super' && !(camFocus?.isSuper))) camMode = 'fight';
}

const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
const photo = { theta: 0.4, phi: 1.25, r: 4.2 };
function updateCamera(dt) {
  camT += dt;
  let k = 4;
  if (G && camMode !== 'menu') {
    const a = G.aka, b = G.shiro, mid = (a.x + b.x) / 2, gap = Math.abs(a.x - b.x);
    switch (camMode) {
      case 'intro': { const ang = -1.0 + camT * 0.14; tmpV.set(Math.sin(ang) * 6.5, 2.8 - Math.min(1, camT * 0.12), Math.cos(ang) * 6.5); tmpL.set(0, 1.1, -0.4); k = 2; break; }
      // vaste afstand; de camera zoomt alleen uit als de vechters ver uit elkaar staan, nooit in
      case 'fight': tmpV.set(mid * 0.85, 1.5, Math.min(6.2, 3.9 + Math.max(0, gap - 1.6) * 0.9)); tmpL.set(mid, 1.0, 0); k = 2.5; break;
      case 'kd': { const v = camFocus; tmpV.set(v.x - v.facing * 1.6, 1.1, 3.6); tmpL.set(v.x, 0.7, 0); k = 2; break; }
      case 'super': { const f = camFocus, ang = 0.6 + camT * 0.9 * f.facing; tmpV.set(f.x + Math.sin(ang) * 3.8, 1.35, Math.cos(ang) * 3.8 + 0.4); tmpL.set(mid, 1.0, 0); k = 2; break; }
      case 'result': { const w = G.match.winner || a, ang = camT * 0.3; tmpV.set(w.x + Math.sin(ang) * 3.2, 1.6, Math.cos(ang) * 3.2); tmpL.set(w.x, 1.1, 0); k = 2; break; }
      case 'custom': tmpV.copy(camCustom.pos); tmpL.copy(camCustom.look); k = 3; break;
      // hantei: breed beeld met de scheidsrechter en beide hoekscheidsrechters met hun vlaggen
      case 'hantei': tmpV.set(0, 3.4, 6.2); tmpL.set(0, 1.3, -2.6); k = 2.5; break;
      case 'photo': tmpL.set(mid, 1.0, 0); tmpV.set(mid + Math.sin(photo.theta) * Math.sin(photo.phi) * photo.r, Math.max(0.2, Math.cos(photo.phi) * photo.r + 1.0), Math.cos(photo.theta) * Math.sin(photo.phi) * photo.r); k = 12; break;
    }
  } else if (camMode === 'custom') { tmpV.copy(camCustom.pos); tmpL.copy(camCustom.look); k = 3; }
  else { const ang = elapsed * 0.08; tmpV.set(Math.sin(ang) * 7.5 + 1.5, 2.6, Math.cos(ang) * 7.5); tmpL.set(0, 1.2, 0); k = 2; }
  const a = 1 - Math.exp(-dt * k);
  camPos.lerp(tmpV, a); camLook.lerp(tmpL, a);
  camera.position.copy(camPos);
  if (fx.shake > 0) camera.position.add(tmpV.set((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake, 0));
  camera.lookAt(camLook);
}

// ── Geen browser-zoom tijdens het spelen ──
// iOS negeert user-scalable=no; snel dubbel tikken of knijpen zoomt dan de hele pagina in.
{
  const block = e => e.preventDefault();
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(ev, block, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  let lastEnd = 0;
  document.addEventListener('touchend', e => {
    const now = performance.now();
    if (now - lastEnd < 350 && !e.target.closest('select,input')) e.preventDefault(); // tweede snelle tik: geen dubbeltik-zoom
    lastEnd = now;
  }, { passive: false });
  // is er toch ingezoomd (bijvoorbeeld door de toegankelijkheidsinstelling), zet de viewport dan terug
  const meta = document.querySelector('meta[name=viewport]'), base = meta.content;
  window.visualViewport?.addEventListener('resize', () => {
    if (visualViewport.scale > 1.01) { meta.content = base + ',minimum-scale=1'; requestAnimationFrame(() => (meta.content = base)); }
  });
}

// ── Splash → menu ──
$('#splash').addEventListener('pointerup', async () => {
  unlockAudio(); sfx.taiko(true); setTimeout(() => sfx.kiai(1), 150); say('osu');
  await Promise.race([headReady, new Promise(r => setTimeout(r, 4000))]); // de hoofdscan is meestal al binnen
  openMenu();
}, { once: true });

function openMenu() {
  clearFight(); tourney = null; story = null; ticker = null; preview(null); arena.setMode('match'); camMode = 'menu';
  show('menu'); renderRank();
  const pool = ROSTER.filter(f => !f.eindbaas);
  const a = pool[(Math.random() * pool.length) | 0], b = pool[(Math.random() * pool.length) | 0];
  startFight({ mode: 'demo', demo: true, akaId: a.id, shiroId: b.id === a.id ? 'wesley' : b.id, akaCtrl: 'ai', shiroCtrl: 'ai', diff: 'sensei' });
  music(true, 0.3);
}
function renderRank() {
  const c = campaign.career, nu = nextUnlock();
  const unl = nu ? `Volgende om vrij te spelen: <b>${byId[nu].naam}</b>${nu === FINAL_BOSS ? ' (versla hem in een finale)' : ' (win een toernooi)'}` : 'Alle senpai en sensei zijn vrijgespeeld!';
  if (c) {
    const r = campaign.me().graad, t = campaign.titles()[0];
    $('#rankBox').innerHTML = `<b>${c.naam}</b> · ${beltOf(r).naam}${t ? ` · 🏆 ${t.label}` : ''}<br>${profile.fights} gevechten · ${profile.tWins} toernooizeges<br>${unl}`;
  } else {
    $('#rankBox').innerHTML = `Begin een <b>Campaign</b>: van witte band tot Wereldkampioen.<br>${profile.fights} gevechten · ${profile.tWins} toernooizeges<br>${unl}`;
  }
}

$$('#menu [data-go]').forEach(b => b.addEventListener('click', () => {
  sfx.block();
  const go = b.dataset.go;
  if (go === 'campaign') campaign.open();
  if (go === 'leaders') openLeaders();
  if (go === 'tournament') openSelect({ title: 'Toernooi · kies je vechter', onPick: id => startTournament(id) });
  if (go === 'story') openSelect({ title: 'Story · kies je vechter', onPick: id => startStory(id) });
  if (go === 'versus') openSelect({ title: 'Versus · speler 1 (aka)', onPick: id => openSelect({ title: 'Versus · tegenstander (shiro)', p2: true, onPick: id2 => loadingThen(() => startFight({ mode: 'versus', akaId: id, shiroId: id2, akaCtrl: vsP2 === 'cpu' ? 'solo' : 'p1', shiroCtrl: vsP2 === 'cpu' ? 'ai' : 'p2', akaCostume: playerCostume() })) }) });
  if (go === 'training') openSelect({ title: 'Training · kies je vechter', onPick: id => loadingThen(() => startTraining(id)) });
  if (go === 'options') openOptions();
}));

function playerCostume() { return { dogi: profile.costume }; }

// ── Vechterkeuze ──
let selCb = null, selId = null, vsP2 = 'cpu';
function openSelect({ title, onPick, p2 = false }) {
  clearFight(); show('select'); $('#selTitle').textContent = title; selCb = onPick;
  const grid = $('#grid'); grid.innerHTML = '';
  // op graad gesorteerd: sensei, senpai, dan de kyu-graden (zoals de rij bij het groeten in de dojo)
  const order = ROSTER.slice().sort((a, b) => graadNiveau(b.graad) - graadNiveau(a.graad));
  meData = campaign.me();
  if (meData) order.unshift(meData);
  for (const f of order) {
    const locked = isLocked(f.id);
    const belt = beltOf(f.graad);
    const c = document.createElement('div'); c.className = 'card' + (locked ? ' locked' : ''); c.dataset.id = f.id;
    const tt = f.speler ? campaign.titles()[0] : null;
    if (f.speler) c.classList.add('me');
    c.innerHTML = `${f.eindbaas && !locked ? '<span class="boss">EINDBAAS</span>' : f.eindbaas ? '<span class="boss">🔒 EINDBAAS</span>' : f.speler ? '<span class="boss">JIJ</span>' : locked ? '<span class="boss">🔒</span>' : ''}${tt ? `<span class="ttl">🏆 ${tt.titel}</span>` : ''}<b>${f.naam}</b><small>${f.stijl}<br>${belt.kort} · ${f.geslacht === 'v' ? '♀' : '♂'}</small><span class="belt" style="background:${belt.kleur};${belt.streep ? `box-shadow:inset ${f.graad.dan ? -6 * belt.strepen : -12}px 0 0 ${belt.streep}` : ''}"></span>`;
    c.addEventListener('click', () => { sfx.block(); pickCard(f.id); });
    c.addEventListener('dblclick', () => confirmPick());
    grid.appendChild(c);
  }
  const nu = nextUnlock();
  $('#selInfo').innerHTML = p2 ? `Speler 2: <button class="btn ghost" id="p2toggle" style="padding:6px 10px">${vsP2 === 'cpu' ? 'Computer' : 'Toetsenbord (pijltjes + J K L I)'}</button>`
    : nu ? `🔒 Senpai en sensei speel je vrij door toernooien te winnen. Volgende: <b>${byId[nu].naam}</b>${nu === FINAL_BOSS ? ' (versla hem in de finale)' : ''}.` : '';
  $('#p2toggle')?.addEventListener('click', e => { vsP2 = vsP2 === 'cpu' ? 'kb' : 'cpu'; e.target.textContent = vsP2 === 'cpu' ? 'Computer' : 'Toetsenbord (pijltjes + J K L I)'; });
  pickCard(selId && fighterById(selId) && !isLocked(selId) ? selId : meData ? 'me' : 'skylar');
}
function pickCard(id) {
  selId = id; const f = fighterById(id);
  $$('#grid .card').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
  const belt = beltOf(f.graad), st = f.stats;
  const bars = Object.entries({ Kracht: st.kracht, Snelheid: st.snelheid, Bereik: st.bereik, Conditie: st.conditie, Benen: st.benen }).map(([k, v]) => `<div class="stat">${k}<div class="bar"><i style="width:${v * 10}%"></i></div></div>`).join('');
  const dirs = ['', '→ + ', '↓ + '];
  const lockTxt = isLocked(id) ? `<div class="lockNote">🔒 Nog niet speelbaar. ${id === FINAL_BOSS ? 'Versla Sensei Wesley in een toernooifinale om hem vrij te spelen.' : `Win toernooien om vrij te spelen (plek ${UNLOCK_ORDER.indexOf(id) + 1} van ${UNLOCK_ORDER.length + 1}).`}</div>` : '';
  const titles = f.speler ? campaign.titles().map(t => `<span class="badge">🏆 ${t.label}</span>`).join('') : '';
  $('#detail').innerHTML = `${lockTxt}<div class="sub">${f.titel ? f.titel + ' · ' : ''}${belt.naam} · ${f.geslacht === 'v' ? 'vrouw' : 'man'}</div><h3>${f.naam}</h3>${titles ? `<div class="badges">${titles}</div>` : ''}
    <div class="sub" style="color:#fff9">${f.stijl}</div><div class="quote">“${f.quote}”</div><div>${f.persoonlijkheid}</div><div style="margin:8px 0">${bars}</div>
    ${f.signatures.map((s, i) => s ? `<div class="tech"><b>${s.naam}</b><em>${dirs[i]}KIAI</em><span>${s.jp}: ${s.uitleg}</span></div>` : `<div class="tech" style="opacity:.5"><b>🔒 Nog geen techniek</b><em>${dirs[i]}KIAI</em><span>Komt vrij met een hogere graad.</span></div>`).join('')}
    ${f.super ? `<div class="tech" style="box-shadow:inset 0 0 0 1px #d9a44166"><b>${f.super.naam}</b> <span class="jp" style="display:inline;color:var(--gold)">${f.super.jp}</span><em>KIAI (vol)</em><span>${f.super.uitleg}</span></div>` : '<div class="tech" style="opacity:.5"><b>🔒 Super</b><em>KIAI (vol)</em><span>Komt vrij vanaf de 5e kyu.</span></div>'}
    <div class="tech"><b>Finisher: ${f.finisher.naam}</b><span>${f.finisher.uitleg}</span></div>`;
}
function confirmPick() {
  const f = fighterById(selId); if (!f || isLocked(selId)) { sfx.block(); return; }
  sfx.kiai(1); say('osu');
  const cb = selCb; selCb = null; cb && cb(selId);
}
$('#selOk').addEventListener('click', confirmPick);
$('#selBack').addEventListener('click', openMenu);

function loadingThen(fn) {
  show('loading'); $('#tip').textContent = TIPS[(Math.random() * TIPS.length) | 0];
  const bar = $('#loading .bar2 i'); bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(() => { bar.style.transition = ''; bar.style.width = '100%'; });
  setTimeout(() => { show('none'); fn(); }, 1300);
}

// ── Toernooi (single elimination) ──
// Gebruikt door de modus Toernooi en door de campaign (NK/EK/WK).
const ROUND_SETS = { 1: ['Finale'], 2: ['Halve finale', 'Finale'], 3: ['Kwartfinale', 'Halve finale', 'Finale'] };
function startTournament(playerId) {
  // De eindbaas staat pas in de finale als alle senpai en sensei vrijgespeeld zijn.
  const boss = bossFinalDue() && playerId !== FINAL_BOSS ? FINAL_BOSS : null;
  const field = ROSTER.filter(f => f.id !== playerId && !f.eindbaas).sort(() => Math.random() - 0.5).map(f => f.id);
  startBracket({ player: playerId, field, size: 8, boss, meta: { naam: 'Hokori Meiyo Cup' } });
}
// boss: staat in de andere helft van het schema en wint tot de finale
function startBracket({ player, playerData = null, field, size = 8, boss = null, meta = {} }) {
  const half = size / 2, others = field.filter(id => id !== player && id !== boss).slice(0, size - 1 - (boss ? 1 : 0));
  const top = [player, ...others.slice(0, half - 1)].sort(() => Math.random() - 0.5);
  const bottom = [...others.slice(half - 1), ...(boss ? [boss] : [])].sort(() => Math.random() - 0.5);
  if (playerData) meData = playerData;
  tourney = { player, rounds: [pairUp([...top, ...bottom])], r: 0, out: false, size, names: ROUND_SETS[Math.log2(size)], boss, meta };
  openBracket();
}
function pairUp(ids) { const out = []; for (let i = 0; i < ids.length; i += 2) out.push({ a: ids[i], b: ids[i + 1], w: null }); return out; }
function simulateBout(m) {
  const t = tourney;
  if (t.boss && (m.a === t.boss || m.b === t.boss)) { m.w = t.boss; m.how = 'ippon'; return; }
  const pw = id => { const f = fighterById(id), s = f.stats; return s.kracht + s.snelheid + s.bereik + s.conditie + s.benen + graadNiveau(f.graad) * 1.5 + Math.random() * 14; };
  m.w = pw(m.a) >= pw(m.b) ? m.a : m.b; m.how = ['ippon', 'hantei', 'waza-ari', 'hantei'][(Math.random() * 4) | 0];
}
function openBracket() {
  show('bracket');
  const t = tourney, final = t.r === t.names.length - 1;
  $('#bracketTitle').innerHTML = `${t.meta.naam ? `<small>${t.meta.naam.toUpperCase()}</small><br>` : ''}${t.out ? 'UITGESCHAKELD' : t.champion ? 'KAMPIOEN!' : t.names[t.r].toUpperCase()}`;
  $('#bracketView').innerHTML = t.rounds.map((round, ri) => `<div class="round"><div style="font-size:10px;letter-spacing:.15em;color:var(--gold)">${t.names[ri].toUpperCase()}</div>${round.map(m => `<div class="bm">${[m.a, m.b].map(id => `<div class="${m.w === id ? 'w' : ''} ${id === t.player ? 'me' : ''}">${fighterById(id).naam}${id === t.boss ? ' 👑' : ''}</div>`).join('')}</div>`).join('')}</div>`).join('');
  $('#bracketGo').textContent = t.out || t.champion ? (t.meta.campaign ? 'Naar de hub' : 'Naar het menu') : final && t.boss ? 'Finale tegen Sensei Wesley' : 'Naar de mat';
}
$('#bracketGo').addEventListener('click', () => {
  const t = tourney; if (!t) return;
  if (t.out || t.champion) return t.meta.campaign ? campaign.tournamentOver() : openMenu();
  const round = t.rounds[t.r];
  const mine = round.find(m => m.a === t.player || m.b === t.player);
  const opp = mine.a === t.player ? mine.b : mine.a;
  t.current = mine;
  const final = t.r === t.names.length - 1;
  const diff = t.meta.diff ? t.meta.diff[Math.min(t.r, t.meta.diff.length - 1)] : final ? bump(cfg.diff, 1) : cfg.diff;
  loadingThen(() => startFight({ mode: t.meta.campaign ? 'campaign' : 'tournament', akaId: t.player, shiroId: opp, akaCtrl: 'solo', shiroCtrl: 'ai', diff, shiroScale: opp === FINAL_BOSS ? Math.max(1, t.meta.scale || 1) : t.meta.scale, akaCostume: t.meta.campaign ? {} : playerCostume() }));
});
$('#bracketQuit').addEventListener('click', () => (tourney?.meta.campaign ? campaign.tournamentOver() : openMenu()));
function advanceTournament(won, how) {
  const t = tourney, round = t.rounds[t.r];
  const opp = t.current.a === t.player ? t.current.b : t.current.a;
  t.current.w = won ? t.player : opp; t.current.how = how;
  round.filter(m => !m.w).forEach(simulateBout);
  if (!won) { t.out = true; return; }
  if (t.r === t.names.length - 1) { t.champion = true; t.finalOpp = opp; return; }
  t.r++; t.rounds.push(pairUp(round.map(m => m.w)));
}
function bump(level, n) { const ks = Object.keys(DIFFICULTY); return ks[Math.max(0, Math.min(ks.length - 1, ks.indexOf(level) + n))]; }

// ── Story: klim door de dojo naar Sensei Wesley ──
function startStory(playerId) {
  // Ladder: vier kyu-graden en Skylar (op graad), dan twee senpai, Sensei Conchita en als laatste Sensei Wesley.
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  const kyu = shuffle(ROSTER.filter(f => f.graad.kyu && f.id !== playerId && f.id !== 'skylar')).slice(0, 4);
  if (playerId !== 'skylar') kyu.push(byId.skylar);
  kyu.sort((a, b) => graadNiveau(a.graad) - graadNiveau(b.graad));
  const senpai = shuffle(ROSTER.filter(f => f.titel === 'Senpai' && f.id !== playerId)).slice(0, 2).sort((a, b) => graadNiveau(a.graad) - graadNiveau(b.graad));
  const top = ['conchita', 'wesley'].filter(id => id !== playerId);
  if (top.length < 2) top.unshift(ROSTER.find(f => f.titel === 'Senpai' && f.id !== playerId && !senpai.includes(f)).id);
  story = { player: playerId, ladder: [...kyu.map(f => f.id), ...senpai.map(f => f.id), ...top], i: 0 };
  openStory();
}
const STORY_LINES = [
  'De dojo in Zoetermeer is vol. Vandaag laat je zien wat je waard bent.',
  'Elke tegenstander is een les. Osu!',
  'Je benen branden van de lage trappen. Doorzetten: Osu no seishin.',
  'De senpai kijken mee vanaf de kant.',
  'Het publiek begint je naam te kennen.',
  'Nog een paar gevechten tot de top.',
];
function openStory() {
  const s = story, opp = byId[s.ladder[s.i]], me = byId[s.player];
  show('story');
  $('#ladder').innerHTML = s.ladder.map((id, i) => `<span class="${i < s.i ? 'done' : i === s.i ? 'now' : ''}">${byId[id].naam}</span>`).join('');
  $('#stA').textContent = me.naam; $('#stB').textContent = opp.naam;
  const last = s.i === s.ladder.length - 1;
  const line = last ? 'De eindbaas wacht op de mat. Iedereen in de dojo is stil.'
    : opp.id === 'skylar' ? 'De dochter van de sensei staat tegenover je. Dit is persoonlijk.'
    : opp.id === 'conchita' ? 'Sensei Conchita, 4e dan. Wie hier wint, mag tegen Sensei Wesley.'
    : opp.titel === 'Senpai' ? `${opp.naam}, ${beltOf(opp.graad).kort}. Nu wordt het echt zwaar.`
    : STORY_LINES[s.i % STORY_LINES.length];
  $('#stLine').innerHTML = `${line}<br><b>${opp.naam}</b> <span style="opacity:.7">(${beltOf(opp.graad).naam})</span>: “${opp.quote}”`;
}
$('#storyGo').addEventListener('click', () => {
  const s = story, opp = s.ladder[s.i], last = s.i >= s.ladder.length - 3;
  const diff = s.i < 3 ? bump(cfg.diff, -1) : last ? bump(cfg.diff, 1) : cfg.diff;
  loadingThen(() => startFight({ mode: 'story', akaId: s.player, shiroId: opp, akaCtrl: 'solo', shiroCtrl: 'ai', diff, akaCostume: playerCostume(), shiroCostume: byId[opp].eindbaas ? { dogi: 'wit' } : {} }));
});
$('#storyQuit').addEventListener('click', openMenu);

// ── Training ──
const DUMMY = [['stil', 'Pop: stil'], ['hoog', 'Pop: blokt hoog'], ['laag', 'Pop: blokt laag'], ['aanval', 'Pop: valt aan']];
let dummyMode = 0;
function startTraining(id) {
  const partner = id === 'conchita' ? 'anjay' : 'conchita';
  startFight({ mode: 'training', training: true, akaId: id, shiroId: partner, akaCtrl: 'solo', shiroCtrl: 'dummy', akaCostume: playerCostume() });
  $('#trainBar').classList.add('on'); $('#trainInfo').classList.add('on');
  $('#trainInfo').innerHTML = `<b>Sensei Conchita:</b> Osu! Probeer de technieken uit. Lage trap: <b>↓ + GERI</b>. Axe kick: <b>↗ + GERI</b>. Laag-hoog: <b>↘ + GERI</b>. Ushiro mawashi geri: <b>↖ + GERI</b>. Rol kick: <b>↙ + GERI</b>. Blokken: houd <b>UKE</b> vast (↓ = sune uke); net op tijd is een perfect uke. Uitwijken: <b>UKE + ↑</b>.`;
  dummyMode = 0; $('#trDummy').textContent = DUMMY[0][1];
}
function dummyInput() {
  const m = DUMMY[dummyMode][0];
  if (m === 'aanval') { G.ai.shiro = G.ai.shiro || new AI(G.shiro, 'kohai'); return G.ai.shiro.input(1 / 60, G.aka); }
  return { dir: m === 'laag' ? 'd' : 'n', move: 0, uke: m === 'hoog' || m === 'laag', pressed: {} };
}
function trainInfo(move, dmg, counter, note) {
  $('#trainInfo').innerHTML = `<b>${move.jp}</b><br>${move.nl}<br>${note || `Schade ${dmg.toFixed(1)}${counter ? ' · <b>counter</b>' : ''}`}<br><span style="opacity:.75">${move.uitleg}</span>`;
}
$('#trDummy').addEventListener('click', () => { dummyMode = (dummyMode + 1) % DUMMY.length; $('#trDummy').textContent = DUMMY[dummyMode][1]; if (G) delete G.ai.shiro; });
$('#trMoves').addEventListener('click', () => openMoves());
$('#trReset').addEventListener('click', () => { if (!G) return; for (const f of [G.aka, G.shiro]) { f.ki = f.kiMax; f.legs = f.body = 0; f.meter = 100; } G.aka.reset(-1.5, 1); G.shiro.reset(1.5, -1); });
$('#trQuit').addEventListener('click', openMenu);

// ── Technieken-overzicht ──
const DIRSYM = { n: '', f: '→ + ', b: '← + ', d: '↓ + ', u: '↑ + ', ub: '↖ + ', db: '↙ + ', uf: '↗ + ', df: '↘ + ' };
function openMoves() {
  paused = true;
  const f = G ? G.aka.data : byId[selId] || ROSTER[0];
  const rows = Object.entries(INPUT_MAP).filter(([k]) => k !== 'tsuki.u').map(([k, id]) => { const [btn, d] = k.split('.'), m = MOVES[id]; return `<tr><td class="k">${DIRSYM[d]}${btn.toUpperCase()}</td><td class="n"><b>${m.jp}</b>${m.nl}</td><td>${m.uitleg}</td></tr>`; });
  rows.splice(9, 0, `<tr><td class="k">→ + GERI (veraf)</td><td class="n"><b>${MOVES.mae_geri.jp}</b>${MOVES.mae_geri.nl}</td><td>${MOVES.mae_geri.uitleg}</td></tr>`);
  rows.push(`<tr><td class="k">UKE</td><td class="n"><b>${MOVES.uke.jp}</b>${MOVES.uke.nl}</td><td>${MOVES.uke.uitleg}</td></tr>`);
  rows.push(`<tr><td class="k">↓ + UKE</td><td class="n"><b>${MOVES.sune_uke.jp}</b>${MOVES.sune_uke.nl}</td><td>${MOVES.sune_uke.uitleg}</td></tr>`);
  rows.push(`<tr><td class="k">UKE net op tijd</td><td class="n"><b>Perfect uke</b>Perfect blok</td><td>Blok vlak voor de treffer: de aanvaller wankelt. Val meteen aan voor een kaeshi.</td></tr>`);
  rows.push(`<tr><td class="k">na een blok: aanval</td><td class="n"><b>Kaeshi</b>Counter</td><td>Na een blok heb je even een counter-venster: je volgende techniek is sneller en harder.</td></tr>`);
  rows.push(`<tr><td class="k">UKE + ↑</td><td class="n"><b>Tai sabaki</b>Uitwijken</td><td>Stap om de tegenstander heen (ook uit de hoek) en ontwijk een aanval.</td></tr>`);
  rows.push(`<tr><td class="k">← ← (dubbel)</td><td class="n"><b>Hiki ashi</b>Snelle stap terug</td><td>Maak in één beweging afstand.</td></tr>`);
  rows.push(`<tr><td class="k">KIAI tijdens treffers</td><td class="n"><b>Kiai-uitbraak</b>Uit de combo breken</td><td>Kost 1/3 kiai-meter: duwt de aanvaller weg en geeft jou het initiatief.</td></tr>`);
  f.signatures.forEach((s, i) => rows.push(`<tr><td class="k">${['', '→ + ', '↓ + '][i]}KIAI</td><td class="n"><b>${s.naam}</b>${s.jp}</td><td>${s.uitleg} <i>(1/3 kiai-meter)</i></td></tr>`));
  rows.push(`<tr><td class="k">KIAI (vol)</td><td class="n"><b>${f.super.naam}</b>${f.super.jp}</td><td>${f.super.uitleg} Raakt de laatste techniek bij een uitgeputte tegenstander: <b>${f.finisher.naam}</b>.</td></tr>`);
  $('#moveList').innerHTML = `<p style="font-size:12px;opacity:.8;margin:6px 0">Toetsenbord: A/D lopen, W/S omhoog/omlaag, diagonalen met W/S + A/D (↖ ↙ ↗ ↘), J tsuki, K geri, L uke, I kiai. Touch: joystick schuin. Renzoku: maximaal 3 technieken per reeks; daarna kan de tegenstander blokken. Combinaties: druk opnieuw tijdens een treffer (renzoku waza).</p><table>${rows.join('')}</table>`;
  overlay('moves', true);
}
$('#movesClose').addEventListener('click', () => { overlay('moves', false); if (!$('#pause').classList.contains('on')) paused = false; });

// ── Pauze ──
function pause(on) { if (!G || G.demo) return; paused = on; overlay('pause', on); if (on) speechSynthesis?.cancel?.(); }
$('#pauseBtn').addEventListener('click', () => pause(true));
addEventListener('keydown', e => { if ((e.code === 'Escape' || e.code === 'KeyP') && G && !G.demo) { if ($('#photo').classList.contains('on')) return exitPhoto(); pause(!paused); } });
$('#pResume').addEventListener('click', () => pause(false));
$('#pQuit').addEventListener('click', () => { overlay('pause', false); paused = false; openMenu(); });
$('#pMoves').addEventListener('click', () => openMoves());
$('#pOptions').addEventListener('click', () => openOptions());
document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.demo && !paused) pause(true); });

// ── Fotomodus ──
let prevCam = 'fight';
$('#pPhoto').addEventListener('click', () => { overlay('pause', false); overlay('photo', true); $('#hud').classList.remove('on'); $('#touch').classList.remove('on'); prevCam = camMode; camMode = 'photo'; });
function exitPhoto() { overlay('photo', false); overlay('pause', true); $('#hud').classList.add('on'); if (isTouch && G?.ctrl.aka) $('#touch').classList.add('on'); camMode = prevCam; }
$('#phBack').addEventListener('click', exitPhoto);
{
  const pts = new Map(); let pinch = 0;
  canvas.addEventListener('pointerdown', e => { if (camMode === 'photo') { pts.set(e.pointerId, [e.clientX, e.clientY]); canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => {
    if (camMode !== 'photo' || !pts.has(e.pointerId)) return;
    const [px, py] = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { photo.theta -= (e.clientX - px) * 0.008; photo.phi = Math.max(0.35, Math.min(1.65, photo.phi - (e.clientY - py) * 0.006)); }
    else { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) photo.r = Math.max(1.4, Math.min(9, photo.r * pinch / d)); pinch = d; }
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { if (camMode === 'photo') photo.r = Math.max(1.4, Math.min(9, photo.r * (1 + e.deltaY * 0.001))); }, { passive: true });
}
$('#phShot').addEventListener('click', async () => {
  renderFrame();
  const w = canvas.width, h = canvas.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.filter = $('#phFilter').value; g.drawImage(canvas, 0, 0); g.filter = 'none';
  const logo = getLogo(), s = Math.round(h * 0.16);
  if (logo) g.drawImage(logo, w - s - h * 0.03, h - s - h * 0.03, s, s);
  g.fillStyle = '#fbf7ee'; g.font = `900 ${Math.round(h * 0.03)}px Arial`; g.textAlign = 'right'; g.fillText('DOJO HOKORI MEIYO · EER & TROTS', w - s - h * 0.05, h - h * 0.05);
  fx.flash(0.8); sfx.bell();
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
  const file = new File([blob], `hokori-meiyo-${Date.now()}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Dojo Hokori Meiyo' }); return; } catch { } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

// ── Opties ──
function openOptions() {
  overlay('options', true);
  $('#oTime').value = cfg.roundTime; $('#oRules').value = cfg.rules; $('#oVoice').value = cfg.voice; $('#oSfx').value = cfg.sfx; $('#oMusic').value = cfg.music; $('#oGfx').value = cfg.gfx;
  $('#oDiff').innerHTML = Object.entries(DIFFICULTY).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join(''); $('#oDiff').value = cfg.diff;
  $('#oCostume').innerHTML = COSTUMES.map(c => `<option value="${c.id}" ${costumeUnlocked(c) ? '' : 'disabled'}>${c.naam}${costumeUnlocked(c) ? '' : ' (vanaf ' + beltOf({ kyu: 10 - c.rank }).naam + ')'}</option>`).join('');
  $('#oCostume').value = profile.costume;
}
$('#oClose').addEventListener('click', () => {
  cfg.roundTime = +$('#oTime').value; cfg.rules = $('#oRules').value; cfg.voice = $('#oVoice').value; cfg.sfx = +$('#oSfx').value; cfg.music = +$('#oMusic').value; cfg.gfx = $('#oGfx').value; cfg.diff = $('#oDiff').value;
  profile.costume = $('#oCostume').value; saveProfile();
  applySettings(); overlay('options', false); sfx.block();
});

// ── Einde van een gevecht ──
const HOW = { ippon: 'IPPON', awasete: 'AWASETE IPPON', hantei: 'HANTEI · beslissing', 'wazaari-yusei': 'WAZA-ARI · beslissing', hansoku: 'HANSOKU' };
let lastFight = null;
function onFightEnd(winner, how) {
  camMode = 'result'; camT = 0;
  const g = G; lastFight = { ...g, aka: undefined, shiro: undefined, match: undefined, ctrl: undefined, ai: undefined, hud: undefined };
  const twoP = g.mode === 'versus' && vsP2 !== 'cpu';
  const won = winner.corner === 'aka';
  let rankLine = '', titleWon = null, extra = [];
  if (g.mode === 'tournament' || g.mode === 'campaign') advanceTournament(won, how);
  if (g.mode === 'campaign') {
    const r = campaign.fightEnded({ won, how, tourney });
    rankLine = campaign.rankLine(r.rw); titleWon = r.titleWon; extra = r.extra;
  } else if (!twoP) {
    const r = addResult({ won, how, mode: g.mode });
    let bonus = null;
    if (g.mode === 'tournament' && tourney.champion) {
      profile.titles++; profile.tWins++; saveProfile(); bonus = addBonus(200);
      const un = unlockAfterTournament({ beatBossInFinal: tourney.finalOpp === FINAL_BOSS });
      if (un) extra.push(`Vrijgespeeld: <b>${un.naam}</b> (${beltOf(un.graad).naam})${un.id === FINAL_BOSS ? ' · de eindbaas!' : ''}`);
    }
    if (g.mode === 'story' && won) {
      story.i++;
      if (story.i >= story.ladder.length) { profile.storyBest = Math.max(profile.storyBest, story.i); saveProfile(); bonus = addBonus(300); story.done = true; }
    }
    const ri = rankInfo();
    rankLine = `+${r.pts + (bonus?.pts || 0)} keiko-punten · ${ri.belt.naam}<div class="prog"><i style="width:${Math.round(ri.progress * 100)}%"></i></div>` + ((r.promoted || bonus?.promoted) ? `<div class="promo">PROMOTIE! Je bent nu ${ri.belt.naam}. Osu!</div>` : '');
  }
  if (!twoP) submitStats();
  const title = twoP ? `${winner.data.naam.toUpperCase()} WINT` : won ? 'OVERWINNING' : 'NEDERLAAG';
  let text = twoP ? '' : won ? `${winner.data.naam} wint van ${g.shiro.data.naam}.` : `${g.shiro.data.naam} was vandaag sterker. Osu: buigen, leren, terugkomen.`;
  if (tourney?.champion) text = `${fighterById(tourney.player).naam} wint het ${tourney.meta.naam || 'toernooi'}!`;
  else if (tourney?.out) text += ` Uitgeschakeld in de ${tourney.names[tourney.r].toLowerCase()}.`;
  if (g.mode === 'story' && story?.done) text = 'Je hebt de hele dojo verslagen, tot en met Sensei Wesley. Eer &amp; Trots!';
  if (extra.length) text += '<br>' + extra.join('<br>');
  setTimeout(() => {
    show('result'); $('#hud').classList.remove('on'); $('#touch').classList.remove('on');
    const h = $('#resTitle'); h.textContent = title; h.className = won || twoP ? 'win' : 'lose';
    $('#resHow').textContent = HOW[how] || how; $('#resText').innerHTML = text; $('#resRank').innerHTML = rankLine;
    $('#resTitle2').innerHTML = titleWon ? `<span class="jp">🏆</span> ${titleWon.toUpperCase()}` : '';
    if (titleWon) { sfx.roar(); fx.flash(0.4, '#ffe7a8'); }
    resultNext = null;
    const inBracket = g.mode === 'tournament' || g.mode === 'campaign';
    $('#resNext').style.display = g.mode === 'versus' || (g.mode === 'story' && (!won || story?.done)) ? 'none' : '';
    $('#resNext').textContent = inBracket ? (tourney.out || tourney.champion ? (g.mode === 'campaign' ? 'Naar de hub' : 'Naar het schema') : 'Naar het schema') : 'Volgende tegenstander';
    $('#resAgain').style.display = inBracket ? 'none' : '';
    music(true, 0.3);
  }, 600);
}
let resultNext = null; // eigen vervolg (campaign-training)
$('#resMenu').addEventListener('click', () => { resultNext = null; openMenu(); });
$('#resAgain').addEventListener('click', () => {
  if (!lastFight) return;
  if (lastFight.mode === 'story') return openStory();
  const lf = lastFight; loadingThen(() => startFight({ ...lf }));
});
$('#resNext').addEventListener('click', () => {
  if (resultNext) { const f = resultNext; resultNext = null; return f(); }
  if (!lastFight) return;
  if (lastFight.mode === 'campaign') { clearFight(); return tourney.out || tourney.champion ? campaign.tournamentOver() : openBracket(); }
  if (lastFight.mode === 'tournament') { clearFight(); return openBracket(); }
  if (lastFight.mode === 'story') { clearFight(); return openStory(); }
});

// ── Online leaderboard ──
function playerName() { return campaign.career?.naam || profile.naam || ''; }
function submitStats() {
  const naam = playerName(); if (!naam) return;
  const c = campaign.career;
  online.submit({ naam, fights: profile.fights, twins: profile.tWins, graad: c ? beltOf(campaign.me().graad).kort : '', titels: c ? c.titles.length : profile.titles });
}
let leadersBy = 'fights';
async function openLeaders() {
  overlay('leaders', true);
  $('#ldName').value = playerName();
  $$('#leaders [data-by]').forEach(b => b.classList.toggle('ghost', b.dataset.by !== leadersBy));
  $('#ldList').innerHTML = '<div class="muted">Laden…</div>';
  const res = await online.top(leadersBy, 25);
  $('#ldStatus').innerHTML = res.online ? `🟢 Online · bijgewerkt ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` : `🟠 ${res.reason || 'Offline'}: alleen jouw eigen stand`;
  $('#ldList').innerHTML = res.rows.length ? `<table><tr><th>#</th><th>Naam</th><th>Graad</th><th>${leadersBy === 'fights' ? 'Gevechten' : 'Toernooizeges'}</th><th>${leadersBy === 'fights' ? 'Toernooizeges' : 'Gevechten'}</th></tr>${res.rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.naam)}${r.titels ? ` <small>🏆${r.titels}</small>` : ''}</td><td>${esc(r.graad || '')}</td><td><b>${leadersBy === 'fights' ? r.fights : r.twins}</b></td><td>${leadersBy === 'fights' ? r.twins : r.fights}</td></tr>`).join('')}</table>` : '<div class="muted">Nog niemand op het bord. Speel een gevecht!</div>';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
$$('#leaders [data-by]').forEach(b => b.addEventListener('click', () => { leadersBy = b.dataset.by; openLeaders(); }));
$('#ldSave').addEventListener('click', () => {
  const n = $('#ldName').value.trim().slice(0, 16); if (!n) return;
  profile.naam = n; saveProfile(); submitStats(); setTimeout(openLeaders, 600);
});
$('#ldClose').addEventListener('click', () => overlay('leaders', false));

// ── Campaign ──
const campaign = initCampaign({
  show, overlay, scene, arena, fx, sfx, say, touch, isTouch, music, preview, openMenu, openLeaders, startBracket,
  clearFight: () => { clearFight(); tourney = null; },
  camera: (pos, look) => { camCustom.pos.copy(pos); camCustom.look.copy(look); camMode = 'custom'; },
  setTicker: fn => (ticker = fn),
  setMe: d => (meData = d),
  setResultNext: fn => (resultNext = fn),
  onName: n => { if (!profile.naam) { profile.naam = n; saveProfile(); } },
  onStats: () => submitStats(),
});

// Testhaak voor de Playwright-tests (tools/test)
window.__game = {
  get G() { return G; }, startFight, openMenu, cfg, profile, fx, photo, campaign, get tourney() { return tourney; }, openLeaders,
  setCam: m => (camMode = m), pause: v => (paused = v),
  camera: (pos, look) => { camCustom.pos.set(...pos); camCustom.look.set(...look); camMode = 'custom'; },
  step(dt) { simulate(dt); fx.update(dt); updateCamera(dt); renderFrame(); },
  sim(dt, n = 1) { for (let i = 0; i < n && G; i++) { simulate(dt); fx.update(dt); } },
};

requestAnimationFrame(frame);
