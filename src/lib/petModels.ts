import * as THREE from 'three';

// ─── TYPES ───────────────────────────────────────────────────────────
export type AnimalType = 'nori' | 'avestruz' | 'llama' | 'toro' | 'gorila' | 'tigre' | 'gato' | 'ardilla' | 'buho';
export type PetAnim = 'bob' | 'sleep' | 'zap' | 'spin' | 'tilt' | 'nod' | 'pulse';

export const ANIMAL_META: Record<AnimalType, { nameEs: string; nameEn: string; emoji: string; defaultColor: string }> = {
  nori:     { nameEs: 'Nori',     nameEn: 'Nori',     emoji: '🪶', defaultColor: '#9370DB' },
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

// ─── GLTF CACHE + LOADER ─────────────────────────────────────────────

interface CachedGLTF {
  scene: THREE.Group;
  scale: number;
  ox: number; oy: number; oz: number;
}

// Stores the in-flight or resolved promise per path — prevents double-loading
const glbPromises = new Map<string, Promise<CachedGLTF>>();

export function fetchGLTF(path: string): Promise<CachedGLTF> {
  if (!glbPromises.has(path)) {
    glbPromises.set(path, (async () => {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(path, resolve as never, undefined, reject);
      });
      const model  = gltf.scene;
      const box    = new THREE.Box3().setFromObject(model);
      const size   = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale  = 3.8 / Math.max(size.x, size.y, size.z);
      return { scene: model, scale, ox: -center.x * scale, oy: -box.min.y * scale + 0.05, oz: -center.z * scale };
    })());
  }
  return glbPromises.get(path)!;
}

async function loadGLTF(scene: THREE.Scene, m: PetMats, path: string): Promise<PetParts> {
  const c     = await fetchGLTF(path);
  const root  = new THREE.Group();
  const model = c.scene.clone(); // clone so we don't mutate the cached original
  model.scale.setScalar(c.scale);
  model.position.set(c.ox, c.oy, c.oz);
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = child.receiveShadow = true;
      child.material   = m.body;
    }
  });
  root.add(model);
  scene.add(root);
  return { root, shadow: mkShadow(scene) };
}

// Call once on app mount — kicks off all GLB downloads in parallel
export const GLB_PATHS: Partial<Record<AnimalType, string>> = {
  nori:     '/mascota.glb',
  avestruz: '/ostrich.glb',
  llama:    '/llama.glb',
  toro:     '/toro.glb',
  gorila:   '/gorila.glb',
  tigre:    '/tigre.glb',
  ardilla:  '/ardilla.glb',
  gato:     '/gato.glb',
  buho:     '/buho.glb',
};

export function preloadGLBs(): void {
  for (const path of Object.values(GLB_PATHS)) fetchGLTF(path);
}



// ─── DISPATCH ────────────────────────────────────────────────────────
export async function buildAnimal(scene: THREE.Scene, mats: PetMats, type: AnimalType): Promise<PetParts> {
  switch (type) {
    case 'nori':     return loadGLTF(scene, mats, '/mascota.glb');
    case 'avestruz': return loadGLTF(scene, mats, '/ostrich.glb');
    case 'llama':    return loadGLTF(scene, mats, '/llama.glb');
    case 'toro':     return loadGLTF(scene, mats, '/toro.glb');
    case 'gorila':   return loadGLTF(scene, mats, '/gorila.glb');
    case 'tigre':    return loadGLTF(scene, mats, '/tigre.glb');
    case 'gato':     return loadGLTF(scene, mats, '/gato.glb');
    case 'ardilla':  return loadGLTF(scene, mats, '/ardilla.glb');
    case 'buho':     return loadGLTF(scene, mats, '/buho.glb');
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
