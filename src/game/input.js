// Besturing: touch (virtuele joystick links, vier knoppen rechts) en toetsenbord.
// Richtingen zijn relatief: f = naar de tegenstander, b = weg, d = omlaag, u = omhoog,
// ub/db = diagonaal omhoog/omlaag en weg van de tegenstander, uf/df = naar de tegenstander toe.
// Knopdrukken worden 0,15 s gebufferd, zodat een druk tijdens herstel niet verloren gaat.

const BUFFER = 0.2;
export const KEYMAPS = {
  solo: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], tsuki: ['KeyJ', 'KeyF'], geri: ['KeyK', 'KeyG'], uke: ['KeyL', 'KeyH', 'Space'], kiai: ['KeyI', 'KeyR'] },
  p1: { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], tsuki: ['KeyF'], geri: ['KeyG'], uke: ['KeyH'], kiai: ['KeyR'] },
  p2: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], tsuki: ['KeyJ'], geri: ['KeyK'], uke: ['KeyL'], kiai: ['KeyI'] },
};

const held = new Set();
addEventListener('keydown', e => { if (!e.repeat) held.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => held.delete(e.code));
addEventListener('blur', () => held.clear());

export class Controller {
  constructor(map = 'solo', touch = null) {
    this.map = KEYMAPS[map]; this.touch = touch; this.buf = {}; this.prev = {}; this.clock = 0;
  }
  any(list) { return list.some(k => held.has(k)); }
  read(dt) {
    this.clock += dt;
    const m = this.map, t = this.touch;
    let x = (this.any(m.right) ? 1 : 0) - (this.any(m.left) ? 1 : 0);
    let up = this.any(m.up), down = this.any(m.down);
    if (t) { if (Math.abs(t.jx) > 0.35) x = Math.sign(t.jx); if (t.jy < -0.5) up = true; if (t.jy > 0.5) down = true; }
    for (const b of ['tsuki', 'geri', 'kiai']) {
      const now = this.any(m[b]) || (t && t.btn[b]);
      if (now && !this.prev[b]) this.buf[b] = this.clock;
      this.prev[b] = now;
      if (t && t.tap[b]) { this.buf[b] = this.clock; t.tap[b] = false; }
    }
    const uke = this.any(m.uke) || !!(t && t.btn.uke);
    return { x, up, down, uke };
  }
  // zet ruwe input om naar relatieve input voor een vechter met kijkrichting `facing`
  toFighter(raw, facing) {
    const move = raw.x * facing;
    // diagonalen zijn eigen richtingen: ↖ ub, ↙ db, ↗ uf, ↘ df (onbekend in de tabel → alleen omhoog/omlaag)
    const v = raw.down ? 'd' : raw.up ? 'u' : '';
    const dir = v ? (move < 0 ? v + 'b' : move > 0 ? v + 'f' : v) : move > 0 ? 'f' : move < 0 ? 'b' : 'n';
    const pressed = {};
    for (const b in this.buf) if (this.clock - this.buf[b] <= BUFFER) pressed[b] = true;
    return { dir, move: raw.down || raw.up ? 0 : move, uke: raw.uke, pressed };
  }
  consume() { this.buf = {}; }
}

// Touch-laag: joystick verschijnt waar je duim de linkerhelft raakt.
export class TouchPad {
  constructor(root) {
    this.jx = 0; this.jy = 0; this.btn = {}; this.tap = {}; this.id = null;
    this.ring = root.querySelector('.ring'); this.knob = root.querySelector('.knob');
    const zone = root.querySelector('.stick');
    zone.addEventListener('pointerdown', e => { this.id = e.pointerId; this.ox = e.clientX; this.oy = e.clientY; this.show(e.clientX, e.clientY); zone.setPointerCapture(e.pointerId); });
    zone.addEventListener('pointermove', e => { if (e.pointerId !== this.id) return; const dx = e.clientX - this.ox, dy = e.clientY - this.oy, r = 50; const l = Math.hypot(dx, dy) || 1, k = Math.min(1, l / r); this.jx = dx / l * k; this.jy = dy / l * k; this.knob.style.transform = `translate(${this.jx * r}px,${this.jy * r}px)`; });
    const end = e => { if (e.pointerId !== this.id) return; this.id = null; this.jx = this.jy = 0; this.ring.style.opacity = 0; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    root.querySelectorAll('[data-btn]').forEach(b => {
      const k = b.dataset.btn;
      b.addEventListener('pointerdown', e => { e.preventDefault(); this.btn[k] = true; this.tap[k] = true; b.classList.add('on'); navigator.vibrate?.(8); });
      const up = () => { this.btn[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  }
  show(x, y) { this.ring.style.left = x + 'px'; this.ring.style.top = y + 'px'; this.ring.style.opacity = 1; this.knob.style.transform = 'translate(0,0)'; }
}
