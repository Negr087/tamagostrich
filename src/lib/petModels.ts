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

// ─── GLTF LOADER (generic) ───────────────────────────────────────────
async function loadGLTF(scene: THREE.Scene, m: PetMats, path: string): Promise<PetParts> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const root = new THREE.Group();
        const model = gltf.scene;

        const box    = new THREE.Box3().setFromObject(model);
        const size   = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale  = 3.8 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;
        model.position.y = -box.min.y * scale + 0.05;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
            child.material      = m.body;
          }
        });

        root.add(model);
        scene.add(root);
        resolve({ root, shadow: mkShadow(scene) });
      },
      undefined,
      (err) => reject(err),
    );
  });
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
export async function buildAnimal(scene: THREE.Scene, mats: PetMats, type: AnimalType): Promise<PetParts> {
  switch (type) {
    case 'avestruz': return loadGLTF(scene, mats, '/ostrich.glb');
    case 'llama':    return loadGLTF(scene, mats, '/llama.glb');
    case 'toro':     return loadGLTF(scene, mats, '/toro.glb');
    case 'gorila':   return loadGLTF(scene, mats, '/gorila.glb');
    case 'tigre':    return loadGLTF(scene, mats, '/tigre.glb');
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
