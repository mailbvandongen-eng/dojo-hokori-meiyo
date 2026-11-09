// Procedurele textures: dogi met kanji, logo-banners, tatami, vlaggen.
// De kanji komen uit penseelpaden (glyphs.js), dus ze hangen niet af van fonts op het toestel.
import * as THREE from '../../lib/three.module.js';
import { GLYPHS } from '../data/glyphs.js';

const glyphCache = {};
export function drawGlyph(ctx, ch, x, y, size, color) {
  const p = glyphCache[ch] || (glyphCache[ch] = new Path2D(GLYPHS[ch]));
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, size / 100); ctx.fillStyle = color; ctx.fill(p); ctx.restore();
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function noise(ctx, w, h, amount, alpha) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; d[i + 3] = d[i + 3] * alpha + 255 * (1 - alpha); }
  ctx.putImageData(img, 0, 0);
}

// ── Logo ──
// Het officiële logo (aangevuld en opgeschoond met tools/logo/complete-logo.py).
// logo-officieel.png heeft een wit plaatje; logo-officieel-vrij.png is transparant.
let logoImg = null, logoFree = null;
const load = src => { const img = new Image(); img.decoding = 'async'; img.src = src; return img.decode().then(() => img).catch(() => null); };
export const logoReady = Promise.all([load('assets/logo-officieel.png'), load('assets/logo-officieel-vrij.png')]).then(([a, b]) => { logoImg = a; logoFree = b; return !!a; });
export function getLogoFree() { return logoFree || logoImg; }
export function getLogo() { return logoImg; }

// ── Dogi-jas ──
// Gewikkeld om een cilinder met thetaStart = π: u=0.5 is de voorkant, u≈0.6-0.7 de linkerborst.
export function dogiTexture({ variant = 'wit' } = {}) {
  const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d');
  const base = variant === 'zwart' ? '#1b1b1d' : '#f4f1ea';
  const line = variant === 'zwart' ? '#38383c' : '#d9d3c6';
  const ink = variant === 'zwart' ? '#f4f1ea' : '#111';
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // stofplooien
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * W; g.strokeStyle = `rgba(0,0,0,${0.025 + Math.random() * 0.03})`; g.lineWidth = 2 + Math.random() * 6;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20, H * 0.3, x - 20, H * 0.6, x + 10, H); g.stroke();
  }
  // revers: linkerpand over rechterpand. Kraag als brede band.
  const cx = W * 0.5;
  g.strokeStyle = line; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 70, 0); g.lineTo(cx + 95, H * 0.98); g.stroke();
  g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.moveTo(cx - 52, 0); g.lineTo(cx + 112, H * 0.98); g.stroke();
  g.beginPath(); g.moveTo(cx + 70, 0); g.lineTo(cx - 10, H * 0.35); g.stroke();
  // stiksels langs de zoom
  g.setLineDash([6, 8]); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.moveTo(cx - 92, 0); g.lineTo(cx + 74, H * 0.98); g.stroke(); g.setLineDash([]);
  // Kyokushin-kanji op de linkerborst (verticaal, zoals op een echte dogi)
  const kx = W * 0.63, ky = H * 0.12, ks = 74;
  drawGlyph(g, '極', kx, ky, ks, ink); drawGlyph(g, '真', kx, ky + ks * 0.98, ks, ink);
  // Hokori Meiyo-logo onder de kanji (zolang het logo laadt: tekstbadge)
  const bx = kx - 6, by = ky + ks * 2.05, bs = ks + 12;
  const badge = () => {
    const lg = getLogoFree();
    if (lg) { g.fillStyle = base; g.fillRect(bx - 2, by - 2, bs + 4, bs + 4); g.drawImage(lg, bx, by, bs, bs); }
    else { g.fillStyle = '#b1101f'; g.fillRect(bx, by, bs, 26); g.fillStyle = '#fbf7ee'; g.font = '900 13px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('HOKORI MEIYO', bx + bs / 2, by + 18); }
  };
  badge();
  // rug: dojonaam
  g.fillStyle = variant === 'zwart' ? '#d9a441' : '#b1101f'; g.font = '900 34px Arial, sans-serif';
  g.save(); g.translate(W * 0.0, 0); g.fillText('DOJO HOKORI MEIYO', 0, H * 0.3); g.fillText('DOJO HOKORI MEIYO', W, H * 0.3); g.restore();
  noise(g, W, H, 10, 1);
  const t = tex(c);
  if (!getLogoFree()) logoReady.then(() => { badge(); t.needsUpdate = true; });
  return t;
}

// ── Tatami ──
export function tatamiTexture(color = '#cbbf8e', border = '#3a6b35') {
  const W = 512, H = 1024, c = canvas(W, H), g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, W, H);
  // geweven igusa-structuur
  for (let y = 0; y < H; y += 4) { g.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.04})`; g.fillRect(0, y, W, 2); }
  g.fillStyle = border; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H);
  noise(g, W, H, 14, 1);
  return tex(c);
}

// ── Banner met logo (verticaal doek) ──
export function bannerTexture(kind = 'logo') {
  const W = 512, H = 1024, c = canvas(W, H), g = c.getContext('2d'), t = tex(c);
  const draw = () => {
    g.clearRect(0, 0, W, H);
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#7d0a14'); grd.addColorStop(1, '#3d0309');
    g.fillStyle = kind === 'kanji' ? '#f2ede1' : grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d9a441'; g.lineWidth = 14; g.strokeRect(18, 18, W - 36, H - 36);
    if (kind === 'kanji') {
      drawGlyph(g, '極', 86, 120, 340, '#111'); drawGlyph(g, '真', 86, 470, 340, '#111');
      g.fillStyle = '#b1101f'; g.font = '900 44px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('KYOKUSHIN', W / 2, 920);
    } else if (kind === 'osu') {
      drawGlyph(g, '押', 106, 160, 300, '#fbf7ee'); drawGlyph(g, '忍', 106, 480, 300, '#fbf7ee');
      g.fillStyle = '#d9a441'; g.font = '900 50px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('OSU NO SEISHIN', W / 2, 900);
    } else {
      const logo = getLogo(); if (logo) g.drawImage(logo, 46, 90, W - 92, W - 92);
      g.fillStyle = '#fbf7ee'; g.font = '900 60px Arial, sans-serif'; g.textAlign = 'center';
      g.fillText('HOKORI', W / 2, 640); g.fillText('MEIYO', W / 2, 712);
      g.fillStyle = '#d9a441'; g.font = '900 40px Arial, sans-serif'; g.fillText('EER & TROTS', W / 2, 790);
      drawGlyph(g, '誇', 120, 820, 120, '#d9a441'); drawGlyph(g, '名', 270, 820, 120, '#d9a441');
    }
    t.needsUpdate = true;
  };
  draw(); logoReady.then(draw);
  return t;
}

// ── Brede reclameband rond de mat ──
export function boardTexture() {
  const W = 2048, H = 128, c = canvas(W, H), g = c.getContext('2d'), t = tex(c, [3, 1]);
  const draw = () => {
    g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#b1101f'; g.fillRect(0, H - 14, W, 14);
    const logo = getLogo();
    for (let i = 0; i < 4; i++) {
      const x = i * 512;
      if (logo) g.drawImage(logo, x + 20, 10, 108, 108);
      g.fillStyle = '#fbf7ee'; g.font = '900 46px Arial, sans-serif'; g.textAlign = 'left'; g.fillText('HOKORI MEIYO', x + 140, 72);
      g.fillStyle = '#d9a441'; g.font = '900 22px Arial, sans-serif'; g.fillText('EER & TROTS · ZOETERMEER', x + 142, 104);
    }
    t.needsUpdate = true;
  };
  draw(); logoReady.then(draw);
  return t;
}

// Scheidsrechtersvlag (hata)
export function flagMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide });
}

// ── Stof: normal map met katoenweefsel en zachte verticale plooien (voor de dogi) ──
let fabricCache = null;
export function fabricNormal() {
  if (fabricCache) return fabricCache;
  const N = 512, c = canvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N);
  const H = new Float32Array(N * N);
  const folds = Array.from({ length: 5 }, () => ({ f: 1 + Math.floor(Math.random() * 2), p: Math.random() * 6.28, a: 0.25 + Math.random() * 0.45, w: 0.5 + Math.random() * 1.5 }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    let h = 0;
    for (const f of folds) h += Math.sin((u * f.f + Math.sin(v * 6.28 * f.w + f.p) * 0.08) * 6.28 + f.p) * f.a * 0.5 * (0.6 + 0.4 * Math.sin(v * 6.28 * f.w)); // zachte plooien (naadloos in u)
    h += (Math.sin(x * 1.7) * Math.sin(y * 1.7)) * 0.05;                                                             // fijn weefsel
    h += (Math.random() - 0.5) * 0.22;                                                                               // onregelmatige draad
    H[y * N + x] = h;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hl = H[y * N + ((x + N - 1) % N)], hr = H[y * N + ((x + 1) % N)], hu = H[((y + N - 1) % N) * N + x], hd = H[((y + 1) % N) * N + x];
    let nx = (hl - hr) * 1.2, ny = (hu - hd) * 1.2, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * N + x) * 4; img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = 4;
  return (fabricCache = t);
}
