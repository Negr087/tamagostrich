import * as THREE from 'three';

// ─── TYPES ───────────────────────────────────────────────────────────
export type AnimalType = 'avestruz' | 'llama' | 'toro' | 'gorila' | 'tigre' | 'gato' | 'ardilla' | 'buho';
export type PetAnim = 'bob' | 'sleep' | 'zap' | 'spin' | 'tilt' | 'nod' | 'pulse';

export const ANIMAL_META: Record<AnimalType, { nameEs: string; nameEn: string; emoji: string; defaultColor: string }> = {
  avestruz: { nameEs: 'Avestruz', nameEn: 'Ostrich',  emoji: '🦚', defaultColor: '#9370DB' },
  llama:    { nameEs: 'Llama',    nameEn: 'Llama',    emoji: '🦙', defaultColor: '#C8A46E' },
  toro:     { nameEs: 'Toro',     nameEn: 'Bull',     emoji: '🐂', defaultColor: '#6B3A2A' },
  gorila:   { nameEs: 'Gorila',   nameEn: 'Gorilla',  emoji: '🦍', defaultColor: '#4A4040' },
  tigre:    { nameEs: 'Tigre',    nameEn: 'Tiger',    emoji: '🐯', defaultColor: '#E07020' },
  gato:     { nameEs: 'Gato',     nameEn: 'Cat',      emoji: '🐱', defaultColor: '#B0A090' },
  ardilla:  { nameEs: 'Ardilla',  nameEn: 'Squirrel', emoji: '🐿️', defaultColor: '#C06020' },
  buho:     { nameEs: 'Búho',     nameEn: 'Owl',      emoji: '🦉', defaultColor: '#8B7050' },
};

export interface PetMats {
  body:     THREE.MeshStandardMaterial;
  dark:     THREE.MeshStandardMaterial;
  eyeWhite: THREE.MeshStandardMaterial;
  eyePupil: THREE.MeshStandardMaterial;
  eyeIris:  THREE.MeshStandardMaterial;
  beak:     THREE.MeshStandardMaterial;
  leg:      THREE.MeshStandardMaterial;
  tongue:   THREE.MeshStandardMaterial;
}

export interface PetParts {
  root:       THREE.Group;
  shadow:     THREE.Mesh;
  head?:      THREE.Object3D;
  hairGroup?: THREE.Group;
  jawGroup?:  THREE.Object3D;
  legL?:      THREE.Object3D;
  legR?:      THREE.Object3D;
  tail?:      THREE.Object3D;
}

// ─── FACTORIES ───────────────────────────────────────────────────────
export function makePetMats(bodyHex = '#9370DB'): PetMats {
  const base = new THREE.Color(bodyHex);
  const dark = base.clone().multiplyScalar(0.78);
  return {
    body:     new THREE.MeshStandardMaterial({ color: base,     roughness: 0.4, metalness: 0.05 }),
    dark:     new THREE.MeshStandardMaterial({ color: dark,     roughness: 0.5, metalness: 0.05 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2, metalness: 0.0  }),
    eyePupil: new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.1, metalness: 0.3  }),
    eyeIris:  new THREE.MeshStandardMaterial({ color: 0x8B5CF6, roughness: 0.15,metalness: 0.2  }),
    beak:     new THREE.MeshStandardMaterial({ color: 0xF5A623, roughness: 0.3, metalness: 0.1  }),
    leg:      new THREE.MeshStandardMaterial({ color: 0xE09050, roughness: 0.5, metalness: 0.0  }),
    tongue:   new THREE.MeshStandardMaterial({ color: 0xFF6B8A, roughness: 0.4, metalness: 0.0  }),
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────
function mkShadow(scene: THREE.Scene): THREE.Mesh {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = -0.18;
  scene.add(s);
  return s;
}

function mkEye(m: PetMats, sz = 0.22): THREE.Group {
  const g = new THREE.Group();
  const wh = new THREE.Mesh(new THREE.SphereGeometry(sz, 24, 24), m.eyeWhite);
  wh.scale.set(1, 1.1, 0.6); g.add(wh);
  const ir = new THREE.Mesh(new THREE.SphereGeometry(sz * 0.63, 20, 20), m.eyeIris);
  ir.scale.set(1, 1, 0.5); ir.position.z = sz * 0.36; g.add(ir);
  const pu = new THREE.Mesh(new THREE.SphereGeometry(sz * 0.36, 16, 16), m.eyePupil);
  pu.scale.set(1, 1, 0.4); pu.position.z = sz * 0.54; g.add(pu);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(sz * 0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
  sh.position.set(sz * 0.18, sz * 0.23, sz * 0.68); g.add(sh);
  return g;
}

// ─── AVESTRUZ ────────────────────────────────────────────────────────
function buildAvestruz(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  const bodyGeo = new THREE.SphereGeometry(1.3, 32, 32);
  bodyGeo.scale(1, 0.85, 0.9);
  const body = new THREE.Mesh(bodyGeo, m.body);
  body.position.set(0, 1.8, 0); body.castShadow = true; root.add(body);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const geo = new THREE.SphereGeometry(0.18 * 1.2, 12, 12);
      geo.scale(1, 1.3, 0.8);
      const mesh = new THREE.Mesh(geo, m.dark);
      const b = (j / 5) * Math.PI * 0.8 - Math.PI * 0.4;
      mesh.position.set(Math.sin(b) * 0.18, Math.cos(b) * 0.18, 0);
      mesh.rotation.z = b * 0.5; g.add(mesh);
    }
    g.position.set(Math.sin(a) * 1.1, 1.4, Math.cos(a) * 0.8); root.add(g);
  }

  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.35 - t * 0.08, 16, 16), m.body);
    seg.position.set(0, 2.5 + t * 1.5, -0.1 + t * 0.2); root.add(seg);
  }

  const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
  headGeo.scale(1, 0.9, 0.95);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 4.3, 0.15); head.castShadow = true; root.add(head);

  const hairGroup = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    geo.scale(0.6, 2.2, 0.6);
    const hair = new THREE.Mesh(geo, m.dark);
    const a = (i / 7) * Math.PI - Math.PI * 0.5;
    hair.position.set(Math.sin(a) * 0.25, 4.85, 0.15 + Math.cos(a) * 0.1);
    hair.rotation.z = a * 0.4; hair.rotation.x = -0.2; hairGroup.add(hair);
  }
  root.add(hairGroup);

  const eyeL = mkEye(m); eyeL.position.set( 0.35, 4.4, 0.4); eyeL.rotation.y = -0.25; root.add(eyeL);
  const eyeR = mkEye(m); eyeR.position.set(-0.35, 4.4, 0.4); eyeR.rotation.y =  0.25; root.add(eyeR);

  const jawGroup = new THREE.Group();
  const ubk = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), m.beak);
  ubk.scale.set(1.2, 0.5, 1.8); ubk.position.set(0, 4.15, 0.7); jawGroup.add(ubk);
  const lbk = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), m.beak);
  lbk.scale.set(1, 0.35, 1.5); lbk.position.set(0, 4.0, 0.65); jawGroup.add(lbk);
  root.add(jawGroup);

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), m.dark);
      f.scale.set(0.7, 1.2, 0.6);
      const a = (i / 6) * Math.PI * 0.5;
      f.position.set(side * (1.2 + Math.sin(a) * 0.2), 2.0 - i * 0.15, -0.1);
      f.rotation.z = side * (0.3 + i * 0.08); root.add(f);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 0.6 - Math.PI * 0.3;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), m.dark);
      f.scale.set(0.6, 1.3, 0.8);
      f.position.set(Math.sin(a) * 0.3, 1.5 + Math.cos(a) * 0.15, -0.9);
      f.rotation.x = 0.4; f.rotation.z = a * 0.3; root.add(f);
    }
  }

  function mkLeg(side: number): THREE.Group {
    const g = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.0, 12), m.leg);
    up.position.set(side * 0.4, 0.7, 0); up.rotation.z = side * 0.15; g.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.8, 12), m.leg);
    lo.position.set(side * 0.5, 0.15, 0.05); g.add(lo);
    for (let t = -1; t <= 1; t++) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), m.leg);
      toe.scale.set(0.8, 0.4, 2.0);
      toe.position.set(side * 0.5 + t * 0.08, -0.15, 0.15 + Math.abs(t) * -0.05); g.add(toe);
    }
    return g;
  }
  const legL = mkLeg(-1); const legR = mkLeg(1);
  root.add(legL); root.add(legR);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, hairGroup, jawGroup, legL, legR };
}

// ─── LLAMA ───────────────────────────────────────────────────────────
function buildLlama(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Woolly body
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 32), m.body);
  body.scale.set(1.0, 0.9, 0.95); body.position.set(0, 1.8, 0); root.add(body);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), m.body);
    w.position.set(Math.sin(a) * 1.1, 1.5 + Math.cos(a * 1.3) * 0.45, Math.cos(a) * 0.8);
    w.scale.setScalar(0.85 + (i % 3) * 0.08); root.add(w);
  }

  // Neck (slightly forward-leaning)
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.28 - t * 0.05, 16, 16), m.body);
    seg.position.set(-t * 0.15, 2.6 + t * 1.25, t * 0.15); root.add(seg);
  }

  // Head (long face)
  const headGeo = new THREE.SphereGeometry(0.52, 32, 32);
  headGeo.scale(0.82, 1.05, 1.1);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(-0.2, 4.2, 0.2); root.add(head);

  // Muzzle
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), m.body);
  muz.scale.set(0.8, 0.65, 1.05); muz.position.set(-0.2, 3.97, 0.6); root.add(muz);

  // Nostrils
  for (const s of [-0.07, 0.07] as const) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), m.dark);
    n.scale.set(0.8, 0.5, 0.5); n.position.set(-0.2 + s, 3.93, 0.82); root.add(n);
  }

  // Ears
  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), m.dark);
    ear.scale.set(0.65, 1.6, 0.5); ear.position.set(side * 0.3 - 0.1, 4.72, 0.1);
    ear.rotation.z = side * 0.18; root.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), m.tongue);
    inner.scale.set(0.5, 1.1, 0.3); inner.position.set(side * 0.3 - 0.1, 4.72, 0.14);
    inner.rotation.z = side * 0.18; root.add(inner);
  }

  // Eyes
  const eyeL = mkEye(m, 0.19); eyeL.position.set(-0.0, 4.28, 0.48); root.add(eyeL);
  const eyeR = mkEye(m, 0.19); eyeR.position.set(-0.38, 4.28, 0.48); root.add(eyeR);

  // Neck fluff (swaying)
  const hairGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), m.body);
    h.position.set((i - 2) * 0.13, 3.1 + i * 0.18, -0.05); hairGroup.add(h);
  }
  root.add(hairGroup);

  // 4 legs
  function mkLlamaLeg(sx: number, sz: number): THREE.Group {
    const g = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.85, 12), m.body);
    up.position.y = -0.43; g.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.75, 12), m.dark);
    lo.position.y = -0.93; g.add(lo);
    const hf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), m.dark);
    hf.scale.set(1.1, 0.5, 1.2); hf.position.y = -1.35; g.add(hf);
    g.position.set(sx, 1.25, sz); return g;
  }
  const legL = mkLlamaLeg(-0.43, -0.18); const legR = mkLlamaLeg(0.43, -0.18);
  root.add(legL); root.add(legR);
  root.add(mkLlamaLeg(-0.41, 0.42)); root.add(mkLlamaLeg(0.41, 0.42));

  // Short tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), m.dark);
  tail.scale.set(0.7, 0.9, 0.55); tail.position.set(0, 1.95, -1.15); root.add(tail);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, hairGroup, legL, legR };
}

// ─── TORO ────────────────────────────────────────────────────────────
function buildToro(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Stocky body
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 32), m.body);
  body.scale.set(1.1, 0.92, 1.05); body.position.set(0, 1.7, 0); root.add(body);

  // Short thick neck
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.55 - t * 0.1, 16, 16), m.body);
    seg.position.set(0, 2.65 + t * 0.55, t * 0.2); root.add(seg);
  }

  // Head (wide, low)
  const headGeo = new THREE.SphereGeometry(0.68, 32, 32);
  headGeo.scale(1.0, 0.88, 1.05);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 3.42, 0.45); root.add(head);

  // Broad snout
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), m.body);
  snout.scale.set(1.0, 0.7, 1.05); snout.position.set(0, 3.22, 0.85); root.add(snout);
  for (const s of [-0.1, 0.1] as const) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), m.dark);
    n.scale.set(1, 0.5, 0.6); n.position.set(s, 3.19, 1.0); root.add(n);
  }

  // Horns
  for (const side of [-1, 1] as const) {
    const hGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.6, 10);
    const horn = new THREE.Mesh(hGeo, m.beak);
    horn.position.set(side * 0.52, 3.8, 0.3);
    horn.rotation.set(0.25, 0, side * 0.55);
    root.add(horn);
    // Tip curve suggestion with small sphere
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), m.beak);
    tip.position.set(side * 0.77, 3.9, 0.17); root.add(tip);
  }

  // Angry brow
  for (const side of [-1, 1] as const) {
    const brow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), m.dark);
    brow.scale.set(1.5, 0.4, 0.6);
    brow.position.set(side * 0.28, 3.65, 0.68); brow.rotation.z = side * 0.3; root.add(brow);
  }

  // Eyes
  const eyeL = mkEye(m, 0.18); eyeL.position.set( 0.35, 3.48, 0.72); root.add(eyeL);
  const eyeR = mkEye(m, 0.18); eyeR.position.set(-0.35, 3.48, 0.72); root.add(eyeR);

  // Nose ring
  const ringGeo = new THREE.TorusGeometry(0.1, 0.025, 8, 16);
  const ring = new THREE.Mesh(ringGeo, m.beak);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, 3.12, 1.0); root.add(ring);

  // 4 thick legs
  function mkToroLeg(sx: number, sz: number): THREE.Group {
    const g = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.85, 12), m.body);
    up.position.y = -0.43; g.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.75, 12), m.dark);
    lo.position.y = -0.93; g.add(lo);
    const hf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), m.dark);
    hf.scale.set(1.1, 0.5, 1.15); hf.position.y = -1.35; g.add(hf);
    g.position.set(sx, 1.3, sz); return g;
  }
  const legL = mkToroLeg(-0.52, -0.25); const legR = mkToroLeg(0.52, -0.25);
  root.add(legL); root.add(legR);
  root.add(mkToroLeg(-0.50, 0.45)); root.add(mkToroLeg(0.50, 0.45));

  // Tail
  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.7, 8), m.dark);
  tailStem.position.set(0, 2.1, -1.35); tailStem.rotation.x = 0.5; root.add(tailStem);
  const tailTuft = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), m.dark);
  tailTuft.position.set(0, 1.8, -1.7); root.add(tailTuft);

  // Hump
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), m.body);
  hump.scale.set(0.7, 0.6, 0.8); hump.position.set(0, 2.7, -0.5); root.add(hump);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, legL, legR };
}

// ─── GORILA ──────────────────────────────────────────────────────────
function buildGorila(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Barrel body
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), m.body);
  body.scale.set(1.1, 1.0, 0.95); body.position.set(0, 1.65, 0); root.add(body);

  // Light chest patch
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 20), m.dark);
  chest.scale.set(0.8, 0.7, 0.25); chest.position.set(0, 1.8, 1.12); root.add(chest);

  // Short thick neck
  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), m.body);
  neck.scale.set(1.0, 0.7, 0.9); neck.position.set(0, 2.65, 0.1); root.add(neck);

  // Round head with heavy brow
  const headGeo = new THREE.SphereGeometry(0.72, 32, 32);
  headGeo.scale(1.0, 0.92, 0.95);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 3.38, 0.1); root.add(head);

  // Sagittal crest (crown ridge)
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), m.dark);
  crest.scale.set(0.4, 0.5, 0.9); crest.position.set(0, 3.95, 0.0); root.add(crest);

  // Heavy brow ridge
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), m.dark);
  brow.scale.set(0.95, 0.25, 0.4); brow.position.set(0, 3.65, 0.56); root.add(brow);

  // Flat nose / face
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), m.body);
  snout.scale.set(0.85, 0.65, 0.7); snout.position.set(0, 3.18, 0.6); root.add(snout);
  for (const s of [-0.1, 0.1] as const) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), m.dark);
    n.scale.set(1, 0.5, 0.5); n.position.set(s, 3.2, 0.82); root.add(n);
  }

  // Eyes (under brow)
  const eyeL = mkEye(m, 0.17); eyeL.position.set( 0.26, 3.52, 0.6); root.add(eyeL);
  const eyeR = mkEye(m, 0.17); eyeR.position.set(-0.26, 3.52, 0.6); root.add(eyeR);

  // Small ears
  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), m.body);
    ear.scale.set(0.6, 0.7, 0.4); ear.position.set(side * 0.72, 3.38, 0.0); root.add(ear);
  }

  // Long arms (knuckle-walk pose)
  function mkArm(side: number): THREE.Group {
    const g = new THREE.Group();
    // Upper arm
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 1.1, 12), m.body);
    upper.position.set(0, -0.55, 0); upper.rotation.z = side * -0.15; g.add(upper);
    // Forearm
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 1.0, 12), m.body);
    fore.position.set(side * 0.15, -1.2, 0.3); fore.rotation.set(0.3, 0, side * 0.1); g.add(fore);
    // Big hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), m.dark);
    hand.scale.set(1.1, 0.6, 1.2); hand.position.set(side * 0.28, -1.8, 0.7); g.add(hand);
    // Knuckles
    for (let f = 0; f < 4; f++) {
      const knk = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), m.dark);
      knk.position.set(side * 0.28 + (f - 1.5) * 0.07, -1.78, 0.9); g.add(knk);
    }
    g.position.set(side * 1.3, 2.6, 0.1); return g;
  }
  root.add(mkArm(-1)); root.add(mkArm(1));

  // Short legs
  function mkGorillaLeg(sx: number): THREE.Group {
    const g = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.8, 12), m.body);
    up.position.y = -0.4; g.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.7, 12), m.dark);
    lo.position.y = -0.88; g.add(lo);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), m.dark);
    foot.scale.set(1.0, 0.45, 1.4); foot.position.set(0, -1.28, 0.1); g.add(foot);
    g.position.set(sx, 1.1, 0.2); return g;
  }
  const legL = mkGorillaLeg(-0.48); const legR = mkGorillaLeg(0.48);
  root.add(legL); root.add(legR);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, legL, legR };
}

// ─── TIGRE ───────────────────────────────────────────────────────────
function buildTigre(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Low feline body
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), m.body);
  body.scale.set(1.2, 0.82, 1.05); body.position.set(0, 1.6, 0); root.add(body);

  // Stripes (dark boxes on body)
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.6), m.dark);
    stripe.position.set((i - 2) * 0.3, 1.6, 0); root.add(stripe);
  }

  // Short thick neck
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.42 - t * 0.06, 16, 16), m.body);
    seg.position.set(0, 2.55 + t * 0.5, t * 0.22); root.add(seg);
  }

  // Round head
  const headGeo = new THREE.SphereGeometry(0.62, 32, 32);
  headGeo.scale(1.0, 0.92, 0.95);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 3.3, 0.35); root.add(head);

  // Stripe on face
  for (const s of [-0.22, 0.0, 0.22] as const) {
    const fs = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.08), m.dark);
    fs.position.set(s, 3.4, 0.6); root.add(fs);
  }

  // Muzzle
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), m.body);
  muz.scale.set(0.85, 0.65, 0.8); muz.position.set(0, 3.1, 0.72); root.add(muz);

  // Triangular ears
  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.28, 12), m.body);
    ear.position.set(side * 0.44, 3.8, 0.22); ear.rotation.z = side * 0.15; root.add(ear);
    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 10), m.tongue);
    earInner.position.set(side * 0.44, 3.8, 0.28); earInner.rotation.z = side * 0.15; root.add(earInner);
  }

  // Eyes
  const eyeL = mkEye(m, 0.19); eyeL.position.set( 0.28, 3.42, 0.58); root.add(eyeL);
  const eyeR = mkEye(m, 0.19); eyeR.position.set(-0.28, 3.42, 0.58); root.add(eyeR);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), m.tongue);
  nose.scale.set(1.1, 0.6, 0.6); nose.position.set(0, 3.12, 0.82); root.add(nose);

  // Whiskers
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.005, 0.55, 6), m.eyeWhite);
      w.position.set(side * (0.28 + i * 0.04), 3.08 + i * 0.04, 0.7);
      w.rotation.z = side * (Math.PI / 2 + i * 0.15); root.add(w);
    }
  }

  // 4 legs (slightly crouched)
  function mkTigreLeg(sx: number, sz: number, tilt: number): THREE.Group {
    const g = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.8, 12), m.body);
    up.position.y = -0.4; up.rotation.x = tilt; g.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.75, 12), m.body);
    lo.position.set(0, -0.88, tilt * 0.3); g.add(lo);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), m.dark);
    paw.scale.set(1.1, 0.45, 1.3); paw.position.y = -1.28; g.add(paw);
    g.position.set(sx, 1.2, sz); return g;
  }
  const legL = mkTigreLeg(-0.52, -0.3, -0.15); const legR = mkTigreLeg(0.52, -0.3, -0.15);
  root.add(legL); root.add(legR);
  root.add(mkTigreLeg(-0.50, 0.5, 0.12)); root.add(mkTigreLeg(0.50, 0.5, 0.12));

  // Long tail with dark tip
  const hairGroup = new THREE.Group();
  const positions = [
    [0, 1.8, -1.3], [0.3, 2.2, -1.7], [0.6, 2.6, -1.9], [0.7, 3.0, -1.8], [0.6, 3.3, -1.6]
  ];
  positions.forEach(([x, y, z], i) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.12 - i * 0.01, 10, 10), i > 2 ? m.dark : m.body);
    seg.position.set(x, y, z); hairGroup.add(seg);
  });
  root.add(hairGroup);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, hairGroup, legL, legR };
}

// ─── GATO ────────────────────────────────────────────────────────────
function buildGato(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Round body (smaller scale)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 32), m.body);
  body.scale.set(1.0, 0.95, 0.9); body.position.set(0, 1.55, 0); root.add(body);

  // Short neck
  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), m.body);
  neck.scale.set(0.9, 0.65, 0.85); neck.position.set(0, 2.35, 0.1); root.add(neck);

  // Round head (large relative to body)
  const headGeo = new THREE.SphereGeometry(0.58, 32, 32);
  headGeo.scale(1.0, 0.95, 0.92);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 2.92, 0.15); root.add(head);

  // Pointed ears
  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 12), m.body);
    ear.position.set(side * 0.38, 3.42, 0.1); ear.rotation.z = side * 0.2; root.add(ear);
    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 10), m.tongue);
    earInner.position.set(side * 0.38, 3.42, 0.14); earInner.rotation.z = side * 0.2; root.add(earInner);
  }

  // Muzzle
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), m.body);
  muz.scale.set(0.9, 0.6, 0.75); muz.position.set(0, 2.75, 0.5); root.add(muz);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), m.tongue);
  nose.scale.set(1.1, 0.55, 0.6); nose.position.set(0, 2.82, 0.63); root.add(nose);

  // Eyes (big)
  const eyeL = mkEye(m, 0.2); eyeL.position.set( 0.26, 3.02, 0.47); root.add(eyeL);
  const eyeR = mkEye(m, 0.2); eyeR.position.set(-0.26, 3.02, 0.47); root.add(eyeR);

  // Whiskers
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.5, 6), m.eyeWhite);
      w.position.set(side * (0.22 + i * 0.04), 2.72 + i * 0.04, 0.5);
      w.rotation.z = side * (Math.PI / 2 + i * 0.12); root.add(w);
    }
  }

  // 4 legs
  function mkGatoLeg(sx: number, sz: number): THREE.Group {
    const g = new THREE.Group();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.65, 10), m.body);
    up.position.y = -0.33; g.add(up);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.58, 10), m.body);
    lo.position.y = -0.7; g.add(lo);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), m.dark);
    paw.scale.set(1.1, 0.45, 1.25); paw.position.y = -1.02; g.add(paw);
    g.position.set(sx, 1.12, sz); return g;
  }
  const legL = mkGatoLeg(-0.38, -0.15); const legR = mkGatoLeg(0.38, -0.15);
  root.add(legL); root.add(legR);
  root.add(mkGatoLeg(-0.36, 0.35)); root.add(mkGatoLeg(0.36, 0.35));

  // Curled tail (sphere chain)
  const hairGroup = new THREE.Group();
  const curlPath = [
    [0.6, 1.55, -0.9], [1.0, 1.85, -1.1], [1.25, 2.2, -1.0],
    [1.2, 2.55, -0.7], [0.9, 2.7, -0.45],
  ];
  curlPath.forEach(([x, y, z], i) => {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.1 - i * 0.01, 10, 10), m.body);
    seg.position.set(x, y, z); hairGroup.add(seg);
  });
  const tipSeg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), m.dark);
  tipSeg.position.set(0.7, 2.75, -0.38); hairGroup.add(tipSeg);
  root.add(hairGroup);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, hairGroup, legL, legR };
}

// ─── ARDILLA ─────────────────────────────────────────────────────────
function buildArdilla(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Small body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.82, 32, 32), m.body);
  body.scale.set(1.0, 1.05, 0.88); body.position.set(0, 1.45, 0); root.add(body);

  // Short neck
  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), m.body);
  neck.scale.set(0.85, 0.6, 0.8); neck.position.set(0, 2.15, 0.1); root.add(neck);

  // Round head with chubby cheeks
  const headGeo = new THREE.SphereGeometry(0.52, 32, 32);
  headGeo.scale(1.0, 0.98, 0.92);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 2.72, 0.15); root.add(head);

  // Chubby cheeks
  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), m.body);
    cheek.scale.set(0.85, 0.8, 0.7); cheek.position.set(side * 0.42, 2.65, 0.3); root.add(cheek);
  }

  // Ears with rounded tips
  for (const side of [-1, 1] as const) {
    const earBase = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), m.body);
    earBase.scale.set(0.7, 1.3, 0.5); earBase.position.set(side * 0.35, 3.15, 0.1);
    earBase.rotation.z = side * 0.25; root.add(earBase);
    const earTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), m.dark);
    earTip.scale.set(0.55, 0.6, 0.4); earTip.position.set(side * 0.38, 3.35, 0.12);
    earTip.rotation.z = side * 0.25; root.add(earTip);
  }

  // Muzzle
  const muz = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), m.body);
  muz.scale.set(0.88, 0.58, 0.72); muz.position.set(0, 2.58, 0.48); root.add(muz);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), m.dark);
  nose.scale.set(1.0, 0.55, 0.6); nose.position.set(0, 2.65, 0.6); root.add(nose);

  // Eyes (big)
  const eyeL = mkEye(m, 0.19); eyeL.position.set( 0.24, 2.82, 0.43); root.add(eyeL);
  const eyeR = mkEye(m, 0.19); eyeR.position.set(-0.24, 2.82, 0.43); root.add(eyeR);

  // Small arms
  for (const side of [-1, 1] as const) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.45, 10), m.body);
    arm.position.set(side * 0.8, 1.6, 0.2); arm.rotation.z = side * 1.0; root.add(arm);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), m.dark);
    paw.position.set(side * 1.02, 1.35, 0.2); root.add(paw);
  }

  // Short legs
  function mkArdillaLeg(sx: number): THREE.Group {
    const g = new THREE.Group();
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 10), m.body);
    lo.position.y = -0.28; g.add(lo);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), m.dark);
    paw.scale.set(1.0, 0.4, 1.3); paw.position.y = -0.58; g.add(paw);
    g.position.set(sx, 1.05, 0.1); return g;
  }
  const legL = mkArdillaLeg(-0.32); const legR = mkArdillaLeg(0.32);
  root.add(legL); root.add(legR);

  // HUGE bushy tail (signature feature)
  const hairGroup = new THREE.Group();
  const tailBase: [number, number, number][] = [
    [0, 1.45, -0.88], [0.1, 1.88, -1.18], [0.15, 2.38, -1.4],
    [0.1, 2.88, -1.35], [0.0, 3.25, -1.1],
  ];
  tailBase.forEach(([x, y, z], i) => {
    const spread = 0.3 - i * 0.02;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.22 - i * 0.02, 10, 10), m.dark);
      seg.scale.set(0.7, 1.3, 0.7);
      seg.position.set(x + Math.sin(a) * spread, y, z + Math.cos(a) * spread * 0.4);
      hairGroup.add(seg);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), m.body);
    center.position.set(x, y, z); hairGroup.add(center);
  });
  root.add(hairGroup);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, hairGroup, legL, legR };
}

// ─── BÚHO ────────────────────────────────────────────────────────────
function buildBuho(scene: THREE.Scene, m: PetMats): PetParts {
  const root = new THREE.Group();

  // Very round body (almost a sphere)
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 32), m.body);
  body.scale.set(0.98, 1.1, 0.9); body.position.set(0, 1.75, 0); root.add(body);

  // Wing pattern on sides
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), m.dark);
      f.scale.set(0.5, 1.4, 0.5);
      f.position.set(side * (0.95 + i * 0.05), 1.75 - i * 0.22, -0.1);
      f.rotation.z = side * (0.4 + i * 0.06); root.add(f);
    }
  }

  // Tail feathers
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 0.5 - Math.PI * 0.25;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), m.dark);
    f.scale.set(0.55, 1.4, 0.55); f.position.set(Math.sin(a) * 0.3, 0.95, -1.0);
    f.rotation.x = 0.4; root.add(f);
  }

  // Head directly on body (no visible neck = very round)
  const headGeo = new THREE.SphereGeometry(0.72, 32, 32);
  headGeo.scale(1.0, 0.95, 0.9);
  const head = new THREE.Mesh(headGeo, m.body);
  head.position.set(0, 3.1, 0.15); root.add(head);

  // Facial disc (distinctive owl feature)
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 20), m.dark);
  disc.scale.set(0.95, 0.95, 0.22); disc.position.set(0, 3.1, 0.55); root.add(disc);

  // Ear tufts
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), m.dark);
      t.scale.set(0.5, 1.6 - i * 0.3, 0.45);
      t.position.set(side * (0.28 + i * 0.06), 3.72 + i * 0.05, 0.1);
      t.rotation.z = side * (0.3 + i * 0.1); root.add(t);
    }
  }

  // HUGE eyes (owl signature)
  const eyeL = mkEye(m, 0.28); eyeL.position.set( 0.25, 3.12, 0.58); root.add(eyeL);
  const eyeR = mkEye(m, 0.28); eyeR.position.set(-0.25, 3.12, 0.58); root.add(eyeR);

  // Small hooked beak
  const beakUpper = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), m.beak);
  beakUpper.scale.set(0.8, 0.6, 1.6); beakUpper.position.set(0, 2.92, 0.68); root.add(beakUpper);
  const beakTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), m.beak);
  beakTip.scale.set(0.6, 0.4, 1.0); beakTip.position.set(0, 2.85, 0.76); root.add(beakTip);

  // Short legs with talons
  function mkTalon(sx: number): THREE.Group {
    const g = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 10), m.leg);
    leg.position.y = -0.28; g.add(leg);
    for (let t = -1; t <= 1; t++) {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), m.dark);
      claw.scale.set(0.6, 0.4, 1.8); claw.position.set(t * 0.1, -0.6, 0.12 + t * -0.04); g.add(claw);
    }
    g.position.set(sx, 1.12, 0.1); return g;
  }
  const legL = mkTalon(-0.32); const legR = mkTalon(0.32);
  root.add(legL); root.add(legR);

  // Belly lighter patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), m.body);
  belly.scale.set(0.72, 0.88, 0.22); belly.position.set(0, 1.9, 1.05); root.add(belly);

  scene.add(root);
  return { root, shadow: mkShadow(scene), head, legL, legR };
}

// ─── DISPATCH ────────────────────────────────────────────────────────
export function buildAnimal(scene: THREE.Scene, mats: PetMats, type: AnimalType): PetParts {
  switch (type) {
    case 'avestruz': return buildAvestruz(scene, mats);
    case 'llama':    return buildLlama(scene, mats);
    case 'toro':     return buildToro(scene, mats);
    case 'gorila':   return buildGorila(scene, mats);
    case 'tigre':    return buildTigre(scene, mats);
    case 'gato':     return buildGato(scene, mats);
    case 'ardilla':  return buildArdilla(scene, mats);
    case 'buho':     return buildBuho(scene, mats);
  }
}

// ─── ANIMATION ───────────────────────────────────────────────────────
export function animatePet(
  t: number,
  elapsed: number,
  anim: PetAnim,
  p: PetParts,
): void {
  // Jaw breathing
  if (p.jawGroup) {
    (p.jawGroup as THREE.Object3D).children[1]?.position && (
      (p.jawGroup.children[1] as THREE.Mesh).position.y = (p.jawGroup.children[1] as THREE.Mesh).position.y + Math.sin(t * 3) * 0.002
    );
  }

  // Hair/tail sway
  if (p.hairGroup) {
    p.hairGroup.children.forEach((h, i) => { h.rotation.z = Math.sin(t * 2 + i * 0.5) * 0.12; });
  }

  // Reset
  p.root.rotation.set(0, 0, 0);
  p.root.scale.setScalar(1);
  if (p.legL) (p.legL as THREE.Object3D).rotation.set(0, 0, 0);
  if (p.legR) (p.legR as THREE.Object3D).rotation.set(0, 0, 0);

  switch (anim) {
    case 'bob': {
      p.root.position.y = Math.sin(t * 1.5) * 0.1;
      p.root.rotation.z = Math.sin(t * 0.8) * 0.03;
      p.root.rotation.x = Math.sin(t * 1.2) * 0.02;
      if (p.legL) (p.legL as THREE.Object3D).rotation.x =  Math.sin(t * 1.5) * 0.18;
      if (p.legR) (p.legR as THREE.Object3D).rotation.x = -Math.sin(t * 1.5) * 0.18;
      break;
    }
    case 'sleep': {
      p.root.position.y = 0;
      p.root.rotation.z = 0.1 + Math.sin(t * 0.8) * 0.04;
      if (p.head) (p.head as THREE.Object3D).rotation.x = 0.45;
      break;
    }
    case 'zap': {
      const prog = Math.min(elapsed / 0.9, 1);
      p.root.position.y = Math.sin(prog * Math.PI) * 1.1;
      p.root.rotation.z = Math.sin(prog * Math.PI * 2.5) * 0.14;
      if (p.legL) (p.legL as THREE.Object3D).rotation.x = Math.sin(prog * Math.PI) * 0.45;
      if (p.legR) (p.legR as THREE.Object3D).rotation.x = Math.sin(prog * Math.PI) * 0.45;
      break;
    }
    case 'spin': {
      const prog = Math.min(elapsed / 1.0, 1);
      const ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
      p.root.rotation.y = ease * Math.PI * 2;
      p.root.position.y = Math.sin(prog * Math.PI) * 0.15;
      break;
    }
    case 'tilt': {
      const prog = Math.min(elapsed / 0.7, 1);
      p.root.position.y = 0;
      p.root.rotation.z = Math.sin(prog * Math.PI * 2) * 0.38;
      break;
    }
    case 'nod': {
      const prog = Math.min(elapsed / 0.8, 1);
      p.root.position.y = 0;
      if (p.head) (p.head as THREE.Object3D).rotation.x = Math.sin(prog * Math.PI * 4) * 0.45;
      else p.root.rotation.x = Math.sin(prog * Math.PI * 4) * 0.12;
      break;
    }
    case 'pulse': {
      const prog = Math.min(elapsed / 0.6, 1);
      p.root.position.y = 0;
      p.root.scale.setScalar(1 + Math.sin(prog * Math.PI * 4) * 0.11);
      break;
    }
  }
}
