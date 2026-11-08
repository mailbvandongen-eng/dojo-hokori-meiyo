// Geluid: procedurele effecten (treffer, trap-zwiep, taiko, publiek, kiai) en een
// Japans getinte taiko-loop als tijdelijke soundtrack. Scheidsrechterscommando's via de
// spraakstem van het toestel (ja-JP / nl-NL) tot er echte opnames zijn.
// Echte opnames: zet assets/voice/<ja|nl>/<sleutel>.mp3 neer; die gaan dan voor (zie playVoiceFile).
import { CALLS, COUNT } from '../data/terms.js';

let ctx = null, master, sfxBus, musicBus, crowdGain, noiseBuf;
export const settings = { sfx: 0.8, music: 0.45, voice: true, voiceLang: 'ja' };

export function unlockAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = settings.music; musicBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // publiek: gefilterde ruis die aanzwelt bij spektakel
  const crowd = ctx.createBufferSource(); crowd.buffer = noiseBuf; crowd.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
  crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0;
  crowd.connect(bp).connect(crowdGain).connect(sfxBus); crowd.start();
}
export function setVolumes() { if (!ctx) return; sfxBus.gain.value = settings.sfx; musicBus.gain.value = settings.music; }

function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
function noise(t, dur, freq, q, peak, type = 'bandpass', bus = sfxBus) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.003, peak, dur);
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05); return f;
}
function tone(t, f0, f1, dur, peak, type = 'sine', bus = sfxBus) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, 0.004, peak, dur); o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

export const sfx = {
  hit(power = 1, zone = 'body') {
    if (!ctx) return; const t = ctx.currentTime;
    tone(t, zone === 'legs' ? 130 : 95, 40, 0.18 * power, 0.9 * Math.min(1.4, power), 'sine');
    noise(t, 0.08 + 0.05 * power, zone === 'head' ? 2400 : 1500, 0.9, 0.7 * power);
    if (zone === 'legs') noise(t, 0.05, 4000, 2, 0.4); // scheen op dij: kletsend
  },
  block() { if (!ctx) return; const t = ctx.currentTime; tone(t, 220, 90, 0.08, 0.35, 'triangle'); noise(t, 0.05, 900, 1.2, 0.3); },
  whoosh(len = 0.25) { if (!ctx) return; const t = ctx.currentTime; const f = noise(t, len, 500, 1.4, 0.25); f.frequency.exponentialRampToValueAtTime(2200, t + len); },
  thud() { if (!ctx) return; const t = ctx.currentTime; tone(t, 70, 30, 0.5, 1, 'sine'); noise(t, 0.25, 300, 0.8, 0.6, 'lowpass'); },
  taiko(strong = true) { if (!ctx) return; const t = ctx.currentTime; tone(t, strong ? 90 : 120, 45, strong ? 0.7 : 0.35, strong ? 1 : 0.6); noise(t, 0.06, 200, 1, 0.4, 'lowpass'); },
  kiai(pitch = 1) {
    if (!ctx) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(260 * pitch, t); o.frequency.linearRampToValueAtTime(330 * pitch, t + 0.06); o.frequency.exponentialRampToValueAtTime(170 * pitch, t + 0.32);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 800; f1.Q.value = 5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1300; f2.Q.value = 6;
    const g = ctx.createGain(); env(g, t, 0.01, 0.35, 0.33);
    o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.4);
    noise(t, 0.12, 2500, 1, 0.15);
  },
  crowd(level) { if (!ctx) return; crowdGain.gain.setTargetAtTime(0.03 + level * 0.12, ctx.currentTime, 0.3); },
  roar() { if (!ctx) return; crowdGain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.05); crowdGain.gain.setTargetAtTime(0.05, ctx.currentTime + 1.2, 0.8); },
  bell() { if (!ctx) return; const t = ctx.currentTime; for (const [f, p] of [[880, 0.3], [1320, 0.15], [2200, 0.08]]) tone(t, f, f * 0.99, 1.4, p, 'sine'); },
};

// ── Muziek: taiko-ritme + pentatonische pluk (miyako-bushi-toonladder) ──
let musicTimer = null, step = 0;
const SCALE = [0, 1, 5, 7, 8, 12, 13, 17]; // E F A B C ...
export function music(on, intensity = 1) {
  if (!ctx) return;
  clearInterval(musicTimer); musicTimer = null;
  if (!on) return;
  const bpm = 92 + intensity * 20, beat = 60 / bpm / 2;
  musicTimer = setInterval(() => {
    const t = ctx.currentTime + 0.05, s = step++ % 32;
    if (s % 8 === 0 || s % 8 === 5) tone(t, 80, 40, 0.5, 0.7, 'sine', musicBus);
    if (s % 4 === 2) noise(t, 0.05, 3000, 1, 0.08, 'highpass', musicBus);
    if (intensity > 0.5 && s % 16 === 14) tone(t, 120, 60, 0.3, 0.5, 'sine', musicBus);
    if (Math.random() < 0.32) {
      const n = SCALE[(Math.random() * SCALE.length) | 0] + (s < 16 ? 0 : 5);
      const f = 164.8 * Math.pow(2, n / 12);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain(); env(g, t, 0.002, 0.12, 0.5);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      o.connect(lp).connect(g).connect(musicBus); o.start(t); o.stop(t + 0.6);
    }
  }, beat * 1000);
}

// ── Stem ──
const voiceFiles = {};
// assets/voice/index.json somt op welke opnames er zijn, zodat we niet naar ontbrekende bestanden vragen
const voiceIndex = fetch('assets/voice/index.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
async function playVoiceFile(key, lang) {
  if (!ctx) return false;
  if (!((await voiceIndex)[lang] || []).includes(key)) return false;
  const url = `assets/voice/${lang}/${key}.mp3`;
  if (voiceFiles[url] === null) return false;
  try {
    if (!voiceFiles[url]) { const r = await fetch(url); if (!r.ok) throw 0; voiceFiles[url] = await ctx.decodeAudioData(await r.arrayBuffer()); }
    const s = ctx.createBufferSource(); s.buffer = voiceFiles[url]; s.connect(sfxBus); s.start(); return true;
  } catch { voiceFiles[url] = null; return false; }
}
function pickVoice(lang) {
  const vs = speechSynthesis.getVoices();
  return vs.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang)) || null;
}
export async function say(key, { rate = 1.05, pitch = 0.9 } = {}) {
  if (!settings.voice) return;
  const c = CALLS[key]; if (!c) return;
  // scheidsrechterscommando's altijd in het Japans, zoals op een echt toernooi; NL-stem voor uitleg
  const lang = settings.voiceLang === 'nl' && ['aka_kachi', 'shiro_kachi', 'hikiwake', 'encho'].includes(key) ? 'nl' : 'ja';
  if (await playVoiceFile(key, lang)) return;
  speak(lang === 'nl' ? c.nl : c.kana, lang, rate, pitch);
}
export function sayCount(n) { if (settings.voice) speak(COUNT[n - 1], 'ja', 1.1, 0.9); }
function speak(text, lang, rate, pitch) {
  if (!('speechSynthesis' in window)) return;
  const v = pickVoice(lang); if (!v && lang === 'ja') return; // geen Japanse stem: alleen tekst in beeld
  const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'ja' ? 'ja-JP' : 'nl-NL'; if (v) u.voice = v; u.rate = rate; u.pitch = pitch;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
