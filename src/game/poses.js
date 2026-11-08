// Poses voor het procedurele skelet (zie model.js).
// Lokaal assenstelsel: de vechter kijkt naar +Z, +Y is omhoog, +X is de linkerkant van de vechter.
// Rotaties in radialen [x, y, z], Euler-volgorde XYZ.
//  - schouder/heup x < 0: arm/been naar voren; z: zijwaarts (links +, rechts -)
//  - elleboog x < 0: onderarm buigt naar voren; knie x > 0: onderbeen buigt naar achteren
//  - pelvis/spine y > 0: rechterkant draait naar voren
// root: [hoogte-offset, voorwaarts, yaw, pitch]
// Orthodoxe kamae: links voor. Alles wat niet in een pose staat komt uit GUARD.

export const GUARD = {
  root: [-0.06, 0, 0, 0],
  pelvis: [0, -0.35, 0],
  spine: [0.08, 0.05, 0],
  head: [-0.08, 0.3, 0],
  lSh: [-1.0, 0, -0.25], lEl: [-1.75, 0, 0],
  rSh: [-0.75, 0, 0.2], rEl: [-2.05, 0, 0],
  lHip: [-0.38, 0, 0.08], lKnee: [0.35, 0, 0],
  rHip: [0.3, 0, -0.06], rKnee: [0.28, 0, 0],
};

const P = o => ({ ...GUARD, ...o });

export const POSES = {
  guard: GUARD,
  block: P({ spine: [0.2, 0, 0], head: [0.1, 0.3, 0], lSh: [-1.25, 0, -0.45], lEl: [-2.35, 0, 0], rSh: [-1.15, 0, 0.45], rEl: [-2.4, 0, 0], root: [-0.1, -0.05, 0, 0] }),
  suneUke: P({ lHip: [-1.05, 0, 0.35], lKnee: [1.7, 0, 0], rKnee: [0.35, 0, 0], lSh: [-1.15, 0, -0.4], lEl: [-2.3, 0, 0], root: [-0.02, 0, 0, 0] }),
  gedanBarai: P({ lSh: [-0.35, 0, -0.3], lEl: [-0.15, 0, 0], spine: [0.15, -0.3, 0] }),

  jab: P({ lSh: [-1.42, 0, -0.1], lEl: [-0.08, 0, 0], spine: [0.12, -0.45, 0], pelvis: [0, -0.45, 0], root: [-0.08, 0.12, 0, 0] }),
  gyaku: P({ rSh: [-1.42, 0, 0.12], rEl: [-0.08, 0, 0], lSh: [-0.9, 0, -0.1], lEl: [-1.9, 0, 0], spine: [0.12, 0.45, 0], pelvis: [0, 0.15, 0], head: [-0.08, -0.15, 0], root: [-0.1, 0.18, 0, 0], rHip: [0.45, 0, 0], rKnee: [0.15, 0, 0] }),
  shita: P({ rSh: [-0.85, 0, 0.1], rEl: [-1.45, 0, 0], spine: [0.3, 0.35, 0], pelvis: [0, 0.05, 0], root: [-0.16, 0.12, 0, 0], lKnee: [0.6, 0, 0], rKnee: [0.5, 0, 0] }),
  jodanTsuki: P({ rSh: [-1.75, 0, 0.12], rEl: [-0.08, 0, 0], spine: [0, 0.45, 0], pelvis: [0, 0.15, 0], root: [-0.06, 0.18, 0, 0] }),
  hiji: P({ rSh: [-1.35, 0, 0.6], rEl: [-2.5, 0, 0], spine: [0.15, 0.7, 0], pelvis: [0, 0.25, 0], root: [-0.1, 0.12, 0, 0] }),

  maeChamber: P({ rHip: [-1.55, 0, 0], rKnee: [1.9, 0, 0], spine: [-0.05, 0, 0], root: [0, 0.02, 0, 0] }),
  maeExt: P({ rHip: [-1.5, 0, 0], rKnee: [0.12, 0, 0], spine: [-0.25, 0, 0], head: [0.15, 0.3, 0], root: [0, 0.12, 0, 0], lKnee: [0.15, 0, 0] }),

  gedanChamber: P({ pelvis: [0, 0.6, 0], spine: [0.05, -0.5, 0.1], rHip: [-0.3, 0, -0.65], rKnee: [1.5, 0, 0], root: [-0.04, 0.05, 0, 0] }),
  gedanExt: P({ pelvis: [0, 1.05, 0], spine: [0.05, -0.8, 0.2], rHip: [-0.15, 0, -0.85], rKnee: [0.25, 0, 0], lKnee: [0.3, 0, 0], rSh: [-0.2, 0, 0.6], rEl: [-0.5, 0, 0], root: [-0.06, 0.12, 0, 0] }),
  chudanChamber: P({ pelvis: [0, 0.75, 0], spine: [0, -0.6, 0.15], rHip: [-0.35, 0, -1.25], rKnee: [1.8, 0, 0], root: [-0.02, 0.05, 0, 0] }),
  chudanExt: P({ pelvis: [0, 1.35, 0], spine: [0, -1.0, 0.35], rHip: [-0.2, 0, -1.4], rKnee: [0.2, 0, 0], lKnee: [0.15, 0, 0], rSh: [-0.1, 0, 0.7], rEl: [-0.4, 0, 0], root: [-0.02, 0.1, 0, 0] }),
  jodanChamber: P({ pelvis: [0, 0.85, 0], spine: [0, -0.6, 0.35], rHip: [-0.4, 0, -1.7], rKnee: [2.0, 0, 0], root: [0.02, 0.04, 0, 0] }),
  jodanExt: P({ pelvis: [0, 1.45, 0], spine: [0, -1.0, 0.6], head: [0, 0.4, -0.3], rHip: [-0.2, 0, -1.95], rKnee: [0.15, 0, 0], lKnee: [0.1, 0, 0], rSh: [0.1, 0, 0.9], rEl: [-0.3, 0, 0], root: [0.04, 0.08, 0, 0] }),

  ushiroTurn: P({ root: [-0.08, 0, Math.PI * 0.85, 0], rHip: [-0.9, 0, 0], rKnee: [1.9, 0, 0], spine: [0.25, 0, 0], head: [0, -0.6, 0] }),
  ushiroExt: P({ root: [-0.08, 0.1, Math.PI, 0], spine: [0.55, 0, 0], head: [-0.4, -0.9, 0], rHip: [1.35, 0, 0], rKnee: [0.1, 0, 0], lKnee: [0.3, 0, 0] }),
  uMawashiExt: P({ root: [0, 0.05, Math.PI * 1.45, 0], pelvis: [0, 0, 0], spine: [0.1, 0, 0.4], rHip: [0.2, 0, -1.8], rKnee: [0.1, 0, 0], lKnee: [0.1, 0, 0] }),
  ushiroBack: P({ root: [-0.06, 0, Math.PI * 1.7, 0] }),

  kakatoUp: P({ rHip: [-2.5, 0, -0.1], rKnee: [0.05, 0, 0], spine: [-0.3, 0.1, 0], lKnee: [0.1, 0, 0], root: [0.04, 0.02, 0, 0] }),
  kakatoDown: P({ rHip: [-0.9, 0, -0.05], rKnee: [0.1, 0, 0], spine: [0.15, 0.1, 0], root: [-0.06, 0.15, 0, 0] }),

  hiza: P({ rHip: [-1.75, 0, 0.1], rKnee: [2.3, 0, 0], spine: [-0.18, 0.1, 0], lSh: [-1.3, 0, -0.1], lEl: [-1.2, 0, 0], rSh: [-1.3, 0, 0.1], rEl: [-1.2, 0, 0], root: [0.02, 0.18, 0, 0] }),
  tobiPrep: P({ root: [-0.2, 0, 0, 0], lKnee: [0.9, 0, 0], rKnee: [0.9, 0, 0], lHip: [-0.6, 0, 0.08], rHip: [-0.1, 0, 0] }),
  tobiHiza: P({ root: [0.35, 0.25, 0, 0], rHip: [-2.0, 0, 0.05], rKnee: [2.4, 0, 0], lHip: [0.3, 0, 0], lKnee: [1.6, 0, 0], spine: [-0.25, 0, 0], lSh: [-1.6, 0, -0.1], lEl: [-1.0, 0, 0], rSh: [-1.6, 0, 0.1], rEl: [-1.0, 0, 0] }),

  // Rol kick (kaiten kakato geri): root-pitch draait een hele slag voorover (via 2π terug)
  rolPrep: P({ root: [-0.25, 0.05, 0, 0.35], spine: [0.4, 0, 0], lKnee: [1.0, 0, 0], rKnee: [1.0, 0, 0], lHip: [-0.8, 0, 0.1], rHip: [-0.4, 0, -0.1] }),
  rolDive: P({ root: [-0.15, 0.1, 0, 1.4], spine: [0.5, 0, 0], head: [0.6, 0, 0], lHip: [0.3, 0, 0.1], lKnee: [0.6, 0, 0], rHip: [0.5, 0, -0.1], rKnee: [0.3, 0, 0], lSh: [-2.6, 0, -0.2], rSh: [-2.6, 0, 0.2], lEl: [-0.3, 0, 0], rEl: [-0.3, 0, 0] }),
  rolInvert: P({ root: [0.12, 0.15, 0, Math.PI], spine: [0.3, 0, 0], head: [0.5, 0, 0], lHip: [-1.2, 0, 0.15], lKnee: [1.6, 0, 0], rHip: [-0.4, 0, -0.1], rKnee: [0.1, 0, 0], lSh: [-2.9, 0, -0.3], rSh: [-2.9, 0, 0.3], lEl: [-0.2, 0, 0], rEl: [-0.2, 0, 0] }),
  rolStrike: P({ root: [-0.42, 0.2, 0, Math.PI * 2 - 0.55], spine: [0.35, 0, 0], head: [0.3, 0, 0], rHip: [-2.2, 0, -0.05], rKnee: [0.05, 0, 0], lHip: [-1.4, 0, 0.15], lKnee: [1.9, 0, 0], lSh: [0.4, 0, 0.5], rSh: [0.4, 0, -0.5], lEl: [-0.3, 0, 0], rEl: [-0.3, 0, 0] }),
  rolUp: P({ root: [-0.3, 0.12, 0, Math.PI * 2 - 0.1], spine: [0.35, 0, 0], lKnee: [1.2, 0, 0], rKnee: [0.9, 0, 0], lHip: [-0.9, 0, 0.1], rHip: [-0.6, 0, -0.1] }),
  // Gewichtheffen (overhead press): halter op de schouders → boven het hoofd
  pressDown: P({ root: [-0.02, 0, 0, 0], pelvis: [0, 0, 0], spine: [-0.05, 0, 0], head: [-0.05, 0, 0], lSh: [-0.35, 0, 0.75], lEl: [-2.55, 0, 0], rSh: [-0.35, 0, -0.75], rEl: [-2.55, 0, 0], lHip: [0, 0, 0.14], lKnee: [0.12, 0, 0], rHip: [0, 0, -0.14], rKnee: [0.12, 0, 0] }),
  pressUp: P({ root: [0, 0, 0, 0], pelvis: [0, 0, 0], spine: [-0.08, 0, 0], head: [-0.15, 0, 0], lSh: [-2.75, 0, 0.42], lEl: [-0.15, 0, 0], rSh: [-2.75, 0, -0.42], rEl: [-0.15, 0, 0], lHip: [0, 0, 0.14], lKnee: [0, 0, 0], rHip: [0, 0, -0.14], rKnee: [0, 0, 0] }),
  pressStrain: P({ root: [-0.08, 0, 0, 0], pelvis: [0, 0, 0], spine: [-0.15, 0, 0.05], head: [-0.25, 0, 0], lSh: [-1.6, 0, 0.7], lEl: [-1.6, 0, 0], rSh: [-1.6, 0, -0.7], rEl: [-1.6, 0, 0], lHip: [0, 0, 0.16], lKnee: [0.35, 0, 0], rHip: [0, 0, -0.16], rKnee: [0.35, 0, 0] }),
  hitBody: P({ spine: [0.55, 0.1, 0], head: [0.3, 0.3, 0], root: [-0.12, -0.12, 0, 0], lSh: [-0.7, 0, -0.5], rSh: [-0.6, 0, 0.5], lEl: [-1.9, 0, 0], rEl: [-1.9, 0, 0] }),
  hitHead: P({ spine: [-0.35, 0, 0.1], head: [-0.6, 0.6, 0.2], root: [-0.04, -0.15, 0, 0], lSh: [-0.5, 0, -0.1], rSh: [-0.3, 0, 0.3], lEl: [-1.0, 0, 0], rEl: [-1.0, 0, 0] }),
  hitLeg: P({ lKnee: [1.0, 0, 0], lHip: [-0.2, 0, 0.15], root: [-0.2, -0.05, 0, 0], spine: [0.25, -0.2, 0.15] }),
  downKnees: P({ root: [-0.47, -0.05, 0, 0], pelvis: [-0.05, 0, 0], lHip: [-0.05, 0, 0.12], lKnee: [1.62, 0, 0], rHip: [0.0, 0, -0.12], rKnee: [1.62, 0, 0], spine: [0.75, 0, 0], head: [0.4, 0, 0], lSh: [-0.8, 0, -0.6], rSh: [-0.8, 0, 0.6], lEl: [-1.6, 0, 0], rEl: [-1.6, 0, 0] }),
  downBack: P({ root: [-0.78, -0.35, 0, -1.45], pelvis: [0, 0, 0], lHip: [-0.4, 0, 0.2], lKnee: [0.6, 0, 0], rHip: [-0.1, 0, -0.15], rKnee: [0.2, 0, 0], spine: [0.1, 0, 0], head: [0.3, 0.5, 0], lSh: [-0.2, 0, 1.0], rSh: [-0.3, 0, -1.1], lEl: [-0.3, 0, 0], rEl: [-0.4, 0, 0] }),

  rei: P({ root: [0, 0, 0, 0], pelvis: [0, 0, 0], spine: [0.55, 0, 0], head: [0.25, 0, 0], lSh: [-0.42, 0, 0.05], lEl: [-0.1, 0, 0], rSh: [-0.42, 0, -0.05], rEl: [-0.1, 0, 0], lHip: [0, 0, 0.06], lKnee: [0, 0, 0], rHip: [0, 0, -0.06], rKnee: [0, 0, 0] }),
  stand: P({ root: [0, 0, 0, 0], pelvis: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], lSh: [0.05, 0, 0.08], lEl: [-0.15, 0, 0], rSh: [0.05, 0, -0.08], rEl: [-0.15, 0, 0], lHip: [0, 0, 0.1], lKnee: [0, 0, 0], rHip: [0, 0, -0.1], rKnee: [0, 0, 0] }),
  osu: P({ root: [0, 0, 0, 0], pelvis: [0, 0, 0], spine: [0.05, 0, 0], head: [0.05, 0, 0], lSh: [-1.1, 0, -0.9], lEl: [-1.3, 0, 0], rSh: [-1.0, 0, 0.9], rEl: [-1.3, 0, 0], lHip: [0, 0, 0.12], lKnee: [0, 0, 0], rHip: [0, 0, -0.12], rKnee: [0, 0, 0] }),
  victory: P({ root: [0, 0, 0, 0], pelvis: [0, 0, 0], spine: [-0.1, 0, 0], head: [-0.25, 0, 0], lSh: [-2.6, 0, -0.3], lEl: [-0.4, 0, 0], rSh: [0.05, 0, -0.08], rEl: [-0.2, 0, 0], lHip: [0, 0, 0.12], lKnee: [0, 0, 0], rHip: [0, 0, -0.12], rKnee: [0, 0, 0] }),
};

export const JOINTS = ['pelvis', 'spine', 'head', 'lSh', 'lEl', 'rSh', 'rEl', 'lHip', 'lKnee', 'rHip', 'rKnee'];

// Mengt twee poses (a → b) met factor t naar `out`.
export function blendPose(a, b, t, out = {}) {
  for (const j of JOINTS) {
    const pa = a[j], pb = b[j], o = out[j] || (out[j] = [0, 0, 0]);
    o[0] = pa[0] + (pb[0] - pa[0]) * t; o[1] = pa[1] + (pb[1] - pa[1]) * t; o[2] = pa[2] + (pb[2] - pa[2]) * t;
  }
  const ra = a.root, rb = b.root, ro = out.root || (out.root = [0, 0, 0, 0]);
  for (let i = 0; i < 4; i++) ro[i] = ra[i] + (rb[i] - ra[i]) * t;
  return out;
}

export function clonePose(p) {
  const o = {}; for (const k in p) o[k] = p[k].slice(); return o;
}

export const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
