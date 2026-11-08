// Effecten: impact-vonken, zweetdruppels, schokgolf-ring, stof van de tatami,
// camera-shake, hit-stop en slow motion.
import * as THREE from '../../lib/three.module.js';

const MAX = 600;

export class FX {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 3); this.size = new Float32Array(MAX);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: 'attribute float size; varying vec3 vC; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*(300./-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC*(1.-d*1.6),1.); }',
    });
    this.points = new THREE.Points(geo, mat); this.points.frustumCulled = false; scene.add(this.points);
    this.p = []; for (let i = 0; i < MAX; i++) this.p.push({ life: 0 });
    this.rings = [];
    this.ringGeo = new THREE.RingGeometry(0.6, 0.75, 40);
    this.shake = 0; this.hitstop = 0; this.timeScale = 1; this.slowTarget = 1; this.slowT = 0;
    this.flashEl = document.getElementById('flash');
  }

  burst(at, { n = 24, color = [1, 0.9, 0.7], speed = 3, size = 0.08, life = 0.4, gravity = -6, spread = 1 } = {}) {
    let made = 0;
    for (const q of this.p) {
      if (q.life > 0) continue;
      q.life = q.max = life * (0.6 + Math.random() * 0.8);
      q.x = at.x; q.y = at.y; q.z = at.z;
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI * spread, s = speed * (0.4 + Math.random());
      q.vx = Math.cos(a) * Math.cos(b) * s; q.vy = Math.sin(b) * s + 1; q.vz = Math.sin(a) * Math.cos(b) * s;
      q.g = gravity; q.s = size * (0.6 + Math.random() * 0.8); q.c = color;
      if (++made >= n) break;
    }
  }

  ring(at, facing, color = '#ffffff', scale = 1) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(at); m.rotation.y = Math.PI / 2 * facing; m.scale.setScalar(0.15 * scale);
    this.scene.add(m); this.rings.push({ m, t: 0, scale });
  }

  impact(at, facing, power, zone, counter) {
    const heavy = power > 12;
    this.burst(at, { n: heavy ? 40 : 22, color: counter ? [1, 0.55, 0.25] : [1, 0.92, 0.75], speed: heavy ? 4.5 : 3, size: heavy ? 0.1 : 0.07 });
    this.burst(at, { n: heavy ? 14 : 6, color: [0.75, 0.85, 1], speed: 2, size: 0.04, life: 0.7, gravity: -9 }); // zweet
    this.ring(at, facing, counter ? '#ffb15c' : '#ffffff', heavy ? 1.6 : 1);
    this.shake = Math.max(this.shake, heavy ? 0.16 : 0.06);
    this.hitstop = heavy ? 0.09 : 0.045;
    if (heavy || counter) this.flash(heavy ? 0.35 : 0.18);
  }
  dust(at) { this.burst(at, { n: 30, color: [0.55, 0.5, 0.4], speed: 1.6, size: 0.12, life: 0.9, gravity: -1, spread: 0.3 }); }
  flash(a = 0.3, color = '#fff') { if (!this.flashEl) return; this.flashEl.style.transition = 'none'; this.flashEl.style.background = color; this.flashEl.style.opacity = a; requestAnimationFrame(() => { this.flashEl.style.transition = 'opacity .35s'; this.flashEl.style.opacity = 0; }); }
  slowmo(scale, dur) { this.slowTarget = scale; this.slowT = dur; }

  // geeft de geschaalde speltijd terug
  step(rawDt) {
    if (this.hitstop > 0) { this.hitstop -= rawDt; return 0; }
    if (this.slowT > 0) { this.slowT -= rawDt; if (this.slowT <= 0) this.slowTarget = 1; }
    this.timeScale += (this.slowTarget - this.timeScale) * Math.min(1, rawDt * 10);
    return rawDt * this.timeScale;
  }

  update(dt) {
    let i = 0;
    for (const q of this.p) {
      if (q.life > 0) {
        q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        if (q.y < 0.06) { q.y = 0.06; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; }
        const k = Math.max(0, q.life / q.max);
        this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
        this.col[i * 3] = q.c[0] * k; this.col[i * 3 + 1] = q.c[1] * k; this.col[i * 3 + 2] = q.c[2] * k;
        this.size[i] = q.s;
      } else this.size[i] = 0;
      i++;
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
    for (let r = this.rings.length - 1; r >= 0; r--) {
      const o = this.rings[r]; o.t += dt;
      o.m.scale.setScalar((0.15 + o.t * 3.5) * o.scale); o.m.material.opacity = Math.max(0, 0.9 - o.t * 3.6);
      if (o.t > 0.25) { this.scene.remove(o.m); o.m.material.dispose(); this.rings.splice(r, 1); }
    }
    this.shake = Math.max(0, this.shake - dt * 0.8);
  }
}
