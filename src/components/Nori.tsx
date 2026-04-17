'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { nip19 } from 'nostr-tools';
import { useAuthStore } from '@/store/auth';
import { useNoriStore, NoriAction, NoriMood } from '@/store/nori';
import { startNoriListener, stopNoriListener } from '@/lib/noriEvents';
import { getNDK } from '@/lib/nostr';
import { useLang } from '@/lib/i18n';

// ─── TYPES ───────────────────────────────────────────────────────

interface EventParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

type PetAnim = 'bob' | 'sleep' | 'zap' | 'spin' | 'tilt' | 'nod' | 'pulse';

const ACTION_TO_ANIM: Partial<Record<NoriAction, PetAnim>> = {
  zap_received:      'zap',
  new_follower:      'spin',
  mention_received:  'tilt',
  note_published:    'nod',
  reaction_received: 'pulse',
  repost_received:   'nod',
  no_activity:       'sleep',
};

// ─── EVENT PARTICLES ──────────────────────────────────────────────

const PARTICLE_CONFIG: Partial<Record<NoriAction, [number, number, number]>> = {
  zap_received:      [0xF5C518, 18, 1.2],
  reaction_received: [0xFF6B6B, 14, 1.0],
  repost_received:   [0x4FC3F7, 12, 1.0],
  new_follower:      [0x7F77DD, 12, 1.0],
  mention_received:  [0x5DCAA5, 10, 1.0],
};

function spawnEventParticles(
  partGroup: THREE.Group,
  particles: EventParticle[],
  color: number,
  count: number,
  spread: number
) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 5, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    mesh.position.set(
      (Math.random() - 0.5) * spread,
      2.0 + Math.random() * 1.5,
      (Math.random() - 0.5) * spread
    );
    partGroup.add(mesh);
    particles.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        0.06 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.08
      ),
      life: 1,
    });
  }
}

// ─── MATERIALS ────────────────────────────────────────────────────

function makeMats() {
  return {
    purple:     new THREE.MeshStandardMaterial({ color: 0x9370DB, roughness: 0.4, metalness: 0.05 }),
    darkPurple: new THREE.MeshStandardMaterial({ color: 0x7B5EA7, roughness: 0.5, metalness: 0.05 }),
    beak:       new THREE.MeshStandardMaterial({ color: 0xF5A623, roughness: 0.3, metalness: 0.1  }),
    eyeWhite:   new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2, metalness: 0.0  }),
    eyePupil:   new THREE.MeshStandardMaterial({ color: 0x2D1B69, roughness: 0.1, metalness: 0.3  }),
    eyeIris:    new THREE.MeshStandardMaterial({ color: 0x8B5CF6, roughness: 0.15,metalness: 0.2  }),
    leg:        new THREE.MeshStandardMaterial({ color: 0xF5A623, roughness: 0.5, metalness: 0.0  }),
    tongue:     new THREE.MeshStandardMaterial({ color: 0xFF6B8A, roughness: 0.4, metalness: 0.0  }),
  };
}

type Mats = ReturnType<typeof makeMats>;

// ─── BUILD OSTRICH ────────────────────────────────────────────────

interface OstrichParts {
  bird:       THREE.Group;
  head:       THREE.Mesh;
  hairGroup:  THREE.Group;
  beakGroup:  THREE.Group;
  legL:       THREE.Group;
  legR:       THREE.Group;
  shadow:     THREE.Mesh;
}

function buildOstrich(scene: THREE.Scene, m: Mats): OstrichParts {
  const bird = new THREE.Group();

  // Body
  const bodyGeo = new THREE.SphereGeometry(1.3, 32, 32);
  bodyGeo.scale(1, 0.85, 0.9);
  const body = new THREE.Mesh(bodyGeo, m.purple);
  body.position.set(0, 1.8, 0);
  body.castShadow = true;
  bird.add(body);

  // Feather tufts around body
  function createFeatherTuft(x: number, y: number, z: number, scale: number) {
    const grp = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.18 * scale, 12, 12);
      geo.scale(1, 1.3, 0.8);
      const mesh = new THREE.Mesh(geo, m.darkPurple);
      const angle = (i / 5) * Math.PI * 0.8 - Math.PI * 0.4;
      mesh.position.set(Math.sin(angle) * 0.15 * scale, Math.cos(angle) * 0.15 * scale, 0);
      mesh.rotation.z = angle * 0.5;
      mesh.castShadow = true;
      grp.add(mesh);
    }
    grp.position.set(x, y, z);
    return grp;
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    bird.add(createFeatherTuft(Math.sin(angle) * 1.1, 1.4, Math.cos(angle) * 0.8, 1.2));
  }

  // Neck (segmented)
  const neckGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const geo = new THREE.SphereGeometry(0.35 - t * 0.08, 16, 16);
    const seg = new THREE.Mesh(geo, m.purple);
    seg.position.set(0, 2.5 + t * 1.5, -0.1 + t * 0.2);
    seg.castShadow = true;
    neckGroup.add(seg);
  }
  bird.add(neckGroup);

  // Head
  const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
  headGeo.scale(1, 0.9, 0.95);
  const head = new THREE.Mesh(headGeo, m.purple);
  head.position.set(0, 4.3, 0.15);
  head.castShadow = true;
  bird.add(head);

  // Hair tufts
  const hairGroup = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    geo.scale(0.6, 2.2, 0.6);
    const hair = new THREE.Mesh(geo, m.darkPurple);
    const angle = (i / 7) * Math.PI - Math.PI * 0.5;
    hair.position.set(
      Math.sin(angle) * 0.25,
      4.85 + Math.random() * 0.2,
      0.15 + Math.cos(angle) * 0.1
    );
    hair.rotation.z = angle * 0.4;
    hair.rotation.x = -0.2;
    hairGroup.add(hair);
  }
  bird.add(hairGroup);

  // Eyebrows
  function createEyebrow(side: number) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.15, 0.12, 0.35, 0.05);
    shape.quadraticCurveTo(0.15, 0.08, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
    const brow = new THREE.Mesh(geo, m.darkPurple);
    brow.position.set(side * 0.1, 4.65, 0.5);
    brow.rotation.y = side * 0.3;
    brow.rotation.z = side * -0.2;
    brow.scale.x = side;
    return brow;
  }
  bird.add(createEyebrow(1));
  bird.add(createEyebrow(-1));

  // Eyes
  function createEye(side: number) {
    const eyeGroup = new THREE.Group();

    const whiteGeo = new THREE.SphereGeometry(0.22, 24, 24);
    whiteGeo.scale(1, 1.1, 0.6);
    eyeGroup.add(new THREE.Mesh(whiteGeo, m.eyeWhite));

    const irisGeo = new THREE.SphereGeometry(0.14, 20, 20);
    irisGeo.scale(1, 1, 0.5);
    const iris = new THREE.Mesh(irisGeo, m.eyeIris);
    iris.position.z = 0.08;
    eyeGroup.add(iris);

    const pupilGeo = new THREE.SphereGeometry(0.08, 16, 16);
    pupilGeo.scale(1, 1, 0.4);
    const pupil = new THREE.Mesh(pupilGeo, m.eyePupil);
    pupil.position.z = 0.12;
    eyeGroup.add(pupil);

    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    shine.position.set(0.04, 0.05, 0.15);
    eyeGroup.add(shine);

    eyeGroup.position.set(side * 0.35, 4.4, 0.4);
    eyeGroup.rotation.y = side * 0.25;
    return eyeGroup;
  }
  bird.add(createEye(1));
  bird.add(createEye(-1));

  // Beak
  const beakGroup = new THREE.Group();
  const upperBeakGeo = new THREE.SphereGeometry(0.25, 16, 16);
  upperBeakGeo.scale(1.2, 0.5, 1.8);
  const upperBeak = new THREE.Mesh(upperBeakGeo, m.beak);
  upperBeak.position.set(0, 4.15, 0.7);
  beakGroup.add(upperBeak);                              // index 0

  const lowerBeakGeo = new THREE.SphereGeometry(0.2, 16, 16);
  lowerBeakGeo.scale(1, 0.35, 1.5);
  const lowerBeak = new THREE.Mesh(lowerBeakGeo, m.beak);
  lowerBeak.position.set(0, 4.0, 0.65);
  beakGroup.add(lowerBeak);                             // index 1

  const tongueGeo = new THREE.SphereGeometry(0.1, 12, 12);
  tongueGeo.scale(0.8, 0.4, 1.5);
  const tongue = new THREE.Mesh(tongueGeo, m.tongue);
  tongue.position.set(0, 3.95, 0.85);
  beakGroup.add(tongue);
  bird.add(beakGroup);

  // Legs
  function createLeg(side: number): THREE.Group {
    const legGroup = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.0, 12), m.leg);
    upper.position.set(side * 0.4, 0.7, 0);
    upper.rotation.z = side * 0.15;
    upper.castShadow = true;
    legGroup.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.8, 12), m.leg);
    lower.position.set(side * 0.5, 0.15, 0.05);
    lower.castShadow = true;
    legGroup.add(lower);

    for (let t = -1; t <= 1; t++) {
      const toeGeo = new THREE.SphereGeometry(0.06, 8, 8);
      toeGeo.scale(0.8, 0.4, 2.0);
      const toe = new THREE.Mesh(toeGeo, m.leg);
      toe.position.set(side * 0.5 + t * 0.08, -0.15, 0.15 + Math.abs(t) * -0.05);
      toe.castShadow = true;
      legGroup.add(toe);
    }
    return legGroup;
  }
  const legR = createLeg(1);
  const legL = createLeg(-1);
  bird.add(legR);
  bird.add(legL);

  // Wings
  function createWing(side: number) {
    const wingGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.2, 12, 12);
      geo.scale(0.7, 1.2, 0.6);
      const feather = new THREE.Mesh(geo, m.darkPurple);
      const angle = (i / 6) * Math.PI * 0.5;
      feather.position.set(side * (1.2 + Math.sin(angle) * 0.2), 2.0 - i * 0.15, -0.1);
      feather.rotation.z = side * (0.3 + i * 0.08);
      feather.castShadow = true;
      wingGroup.add(feather);
    }
    return wingGroup;
  }
  bird.add(createWing(1));
  bird.add(createWing(-1));

  // Tail feathers
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.SphereGeometry(0.18, 12, 12);
    geo.scale(0.6, 1.3, 0.8);
    const feather = new THREE.Mesh(geo, m.darkPurple);
    const angle = (i / 5) * Math.PI * 0.6 - Math.PI * 0.3;
    feather.position.set(Math.sin(angle) * 0.3, 1.5 + Math.cos(angle) * 0.15, -0.9);
    feather.rotation.x = 0.4;
    feather.rotation.z = angle * 0.3;
    feather.castShadow = true;
    bird.add(feather);
  }

  scene.add(bird);

  // Shadow under bird
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.18;
  scene.add(shadow);

  return { bird, head, hairGroup, beakGroup, legL, legR, shadow };
}

// ─── ANIMATE OSTRICH ─────────────────────────────────────────────

function animateOstrich(
  t: number,
  elapsed: number,
  anim: PetAnim,
  p: OstrichParts
) {
  // Always: breathing beak + hair sway (run regardless of reactive anim)
  (p.beakGroup.children[1] as THREE.Mesh).position.y = 4.0 + Math.sin(t * 3) * 0.02;
  p.hairGroup.children.forEach((h, i) => {
    h.rotation.z = Math.sin(t * 2 + i * 0.5) * 0.15;
  });

  // Reset root
  p.bird.rotation.set(0, 0, 0);
  p.bird.scale.setScalar(1);
  p.legL.rotation.set(0, 0, 0);
  p.legR.rotation.set(0, 0, 0);

  switch (anim) {
    case 'bob': {
      const s = Math.sin(t * 1.5);
      p.bird.position.y = s * 0.1;
      p.bird.rotation.z = Math.sin(t * 0.8) * 0.03;
      p.bird.rotation.x = Math.sin(t * 1.2) * 0.02;
      // Leg walk cycle
      p.legL.rotation.x =  Math.sin(t * 1.5) * 0.18;
      p.legR.rotation.x = -Math.sin(t * 1.5) * 0.18;
      break;
    }
    case 'sleep': {
      p.bird.position.y = 0;
      p.bird.rotation.z = 0.1 + Math.sin(t * 0.8) * 0.04;
      p.head.rotation.x = 0.45;
      break;
    }
    case 'zap': {
      const prog = Math.min(elapsed / 0.9, 1);
      p.bird.position.y = Math.sin(prog * Math.PI) * 1.1;
      p.bird.rotation.z = Math.sin(prog * Math.PI * 2.5) * 0.14;
      p.legL.rotation.x = Math.sin(prog * Math.PI) * 0.45;
      p.legR.rotation.x = Math.sin(prog * Math.PI) * 0.45;
      break;
    }
    case 'spin': {
      const prog = Math.min(elapsed / 1.0, 1);
      const ease = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
      p.bird.rotation.y   = ease * Math.PI * 2;
      p.bird.position.y   = Math.sin(prog * Math.PI) * 0.15;
      break;
    }
    case 'tilt': {
      const prog  = Math.min(elapsed / 0.7, 1);
      const angle = Math.sin(prog * Math.PI * 2) * 0.38;
      p.bird.position.y = 0;
      p.bird.rotation.z = angle;
      break;
    }
    case 'nod': {
      const prog = Math.min(elapsed / 0.8, 1);
      p.bird.position.y = 0;
      p.head.rotation.x = Math.sin(prog * Math.PI * 4) * 0.45;
      break;
    }
    case 'pulse': {
      const prog = Math.min(elapsed / 0.6, 1);
      p.bird.position.y = 0;
      p.bird.scale.setScalar(1 + Math.sin(prog * Math.PI * 4) * 0.11);
      break;
    }
  }
}

// ─── STAT BAR ────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const isCritical = value < 25;
  const isLow      = value < 50;
  const barColor   = isCritical ? '#ef4444' : isLow ? '#f59e0b' : color;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-lc-muted w-16 text-right tracking-wider uppercase">{label}</span>
      <div className="flex-1 h-2 bg-lc-border/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isCritical ? 'animate-pulse' : ''}`}
          style={{ width: `${value}%`, background: `linear-gradient(90deg,${barColor},${barColor}88)`, boxShadow: `0 0 8px ${barColor}60` }}
        />
      </div>
      <span className={`text-xs font-bold w-7 tabular-nums ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-lc-white'}`}>
        {Math.round(value)}
      </span>
    </div>
  );
}

const ACTION_BUTTONS: { action: NoriAction; emoji: string; label: string }[] = [
  { action: 'zap_received',      emoji: '⚡', label: 'Recibir Zap' },
  { action: 'note_published',    emoji: '📝', label: 'Publicar nota' },
  { action: 'reaction_received', emoji: '🔥', label: 'Nueva reacción' },
  { action: 'repost_received',   emoji: '🔁', label: 'Reposteo' },
  { action: 'no_activity',       emoji: '😴', label: 'Sin actividad' },
  { action: 'mention_received',  emoji: '💬', label: 'Te mencionaron' },
  { action: 'new_follower',      emoji: '🌟', label: 'Nuevo seguidor' },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface SenderProfile { name?: string; picture?: string }

function SenderDisplay({ pubkey, profile }: { pubkey: string; profile?: SenderProfile }) {
  const shortNpub = nip19.npubEncode(pubkey).slice(0, 9) + '…';
  const displayName = profile?.name || shortNpub;
  return (
    <div className="flex items-center gap-1.5 shrink-0 max-w-[110px]">
      {profile?.picture ? (
        <img src={profile.picture} alt="" className="w-5 h-5 rounded-full object-cover shrink-0"
          style={{ background: '#262626' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px]"
          style={{ background: '#262626', color: '#a3a3a3' }}>
          {displayName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>{displayName}</span>
    </div>
  );
}

const MOOD_META: Record<NoriMood, { emoji: string; label: string; color: string }> = {
  happy:    { emoji: '😊', label: 'Feliz',       color: '#4ade80' },
  excited:  { emoji: '🎉', label: 'Emocionada',  color: '#f97316' },
  resting:  { emoji: '😌', label: 'Descansando', color: '#60a5fa' },
  sleeping: { emoji: '😴', label: 'Durmiendo',   color: '#818cf8' },
  sad:      { emoji: '😢', label: 'Triste',       color: '#f87171' },
  social:   { emoji: '🤩', label: 'Social',       color: '#e879f9' },
};

function useIdleTime(lastEventTime: number) {
  const { t } = useLang();
  const [idle, setIdle] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - lastEventTime;
      const mins = Math.floor(diff / 60000);
      const hrs  = Math.floor(diff / 3600000);
      if (mins < 1)       setIdle(t.idleNow);
      else if (mins < 60) setIdle(t.idleMins(mins));
      else if (hrs < 24)  setIdle(t.idleHours(hrs));
      else                setIdle(t.idleDays(hrs / 24));
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [lastEventTime, t]);
  return idle;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export default function NoriTamagotchi() {
  const { isConnected, profile } = useAuthStore();
  const { stats, mood, activityLog, isListening, lastEventTime, loadFromNostr } = useNoriStore();
  const { t } = useLang();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spawnRef     = useRef<((color: number, count: number, spread: number) => void) | null>(null);
  const lastLogRef   = useRef<string>('');
  const clearRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSpeech  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const petAnimRef   = useRef<PetAnim>('bob');
  const animStartRef = useRef<number>(0);

  const [speechText, setSpeechText]         = useState('');
  const [speechVisible, setSpeechVisible]   = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({});
  const [lastAction, setLastAction]         = useState<NoriAction | null>(null);
  const [petAnim, setPetAnim]               = useState<PetAnim>('bob');
  const [animKey, setAnimKey]               = useState(0);
  const idleTime = useIdleTime(lastEventTime);
  const fetchingSet = useRef<Set<string>>(new Set());

  // Sync React state → refs used inside rAF
  useEffect(() => {
    petAnimRef.current   = petAnim;
    animStartRef.current = performance.now() / 1000;
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch NDK profiles for senders
  useEffect(() => {
    const ndk = getNDK();
    for (const entry of activityLog.slice(0, 8)) {
      const pk = entry.senderPubkey;
      if (!pk || fetchingSet.current.has(pk)) continue;
      fetchingSet.current.add(pk);
      Promise.race([
        ndk.fetchEvents({ kinds: [0], authors: [pk], limit: 1 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
      ]).then((result) => {
        if (!result) return;
        const event = Array.from(result)[0];
        if (!event) return;
        try {
          const c = JSON.parse(event.content);
          setSenderProfiles(prev => ({
            ...prev,
            [pk]: { name: c.name || c.display_name || c.displayName, picture: c.picture || c.image },
          }));
        } catch { /* JSON malformado */ }
      }).catch(() => { /* timeout */ });
    }
  }, [activityLog]);

  // Watch activity log
  useEffect(() => {
    if (activityLog.length === 0) return;
    if (activityLog[0].id === lastLogRef.current) return;
    lastLogRef.current = activityLog[0].id;

    const action = activityLog[0].action;

    const cfg = PARTICLE_CONFIG[action];
    if (cfg && spawnRef.current) spawnRef.current(...cfg);

    const anim = ACTION_TO_ANIM[action] || 'bob';
    setPetAnim(anim);
    setAnimKey(k => k + 1);

    setSpeechText(activityLog[0].message);
    setSpeechVisible(true);
    if (clearSpeech.current) clearTimeout(clearSpeech.current);
    clearSpeech.current = setTimeout(() => setSpeechVisible(false), 2800);

    setLastAction(action);
    setTimeout(() => setLastAction(null), 3000);

    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => {
      setPetAnim('bob');
      setAnimKey(k => k + 1);
    }, 4000);
  }, [activityLog]);

  // Nostr listener
  const pubkey = profile?.pubkey;
  useEffect(() => {
    if (isConnected && pubkey) startNoriListener(pubkey);
    return () => stopNoriListener();
  }, [isConnected, pubkey]);

  // Load pet state from Nostr on login (cross-device sync)
  useEffect(() => {
    if (isConnected && pubkey) loadFromNostr(pubkey);
  }, [isConnected, pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Three.js scene
  useEffect(() => {
    if (!isConnected || !profile) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let raf: number;
    let initialized = false;
    let threeCleanup: (() => void) | null = null;

    const tryInit = () => {
      if (initialized) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      initialized = true;
      ro.disconnect();

      // Scene
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0d0d1a, 0.012);

      // Camera
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
      renderer.toneMapping         = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.outputColorSpace    = THREE.SRGBColorSpace;

      // Lights (same as HTML)
      scene.add(new THREE.AmbientLight(0x404060, 0.6));

      const mainLight = new THREE.DirectionalLight(0xffeedd, 1.2);
      mainLight.position.set(5, 8, 5);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.set(1024, 1024);
      scene.add(mainLight);

      const rimLight = new THREE.DirectionalLight(0x8B5CF6, 0.6);
      rimLight.position.set(-5, 3, -3);
      scene.add(rimLight);

      const fillLight = new THREE.PointLight(0xC084FC, 0.5, 20);
      fillLight.position.set(0, 5, 5);
      scene.add(fillLight);

      const bottomLight = new THREE.PointLight(0xF5A623, 0.3, 10);
      bottomLight.position.set(0, 0, 3);
      scene.add(bottomLight);

      // Ground
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(15, 64),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8, metalness: 0.2 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Background ambient particles (floating dots like the HTML)
      const BG_COUNT = 80;
      const bgGeo = new THREE.BufferGeometry();
      const bgPos = new Float32Array(BG_COUNT * 3);
      for (let i = 0; i < BG_COUNT; i++) {
        bgPos[i * 3]     = (Math.random() - 0.5) * 20;
        bgPos[i * 3 + 1] = Math.random() * 12;
        bgPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
      bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
      const bgParticles = new THREE.Points(bgGeo, new THREE.PointsMaterial({
        color: 0xC084FC, size: 0.05, transparent: true, opacity: 0.6,
      }));
      scene.add(bgParticles);

      // Ostrich
      const mats  = makeMats();
      const parts = buildOstrich(scene, mats);

      // Event particles group
      const partGroup = new THREE.Group();
      scene.add(partGroup);
      const eventParticles: EventParticle[] = [];
      spawnRef.current = (color, count, spread) =>
        spawnEventParticles(partGroup, eventParticles, color, count, spread);

      // Orbit controls (drag to rotate, scroll to zoom) — same as HTML
      let isDragging = false;
      let prevMouse  = { x: 0, y: 0 };
      const spherical = { theta: 0, phi: Math.PI / 3, radius: 10 };

      function updateCamera() {
        camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.position.y = spherical.radius * Math.cos(spherical.phi) + 2;
        camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.lookAt(0, 2.2, 0);
      }
      updateCamera();

      const onPointerDown = (e: PointerEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        spherical.theta += (e.clientX - prevMouse.x) * 0.008;
        spherical.phi    = Math.max(0.3, Math.min(Math.PI * 0.8, spherical.phi + (e.clientY - prevMouse.y) * 0.008));
        prevMouse = { x: e.clientX, y: e.clientY };
        updateCamera();
      };
      const onPointerUp = () => { isDragging = false; };
      const onWheel = (e: WheelEvent) => {
        spherical.radius = Math.max(5, Math.min(20, spherical.radius + e.deltaY * 0.01));
        updateCamera();
      };
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup',   onPointerUp);
      canvas.addEventListener('wheel',       onWheel, { passive: true });
      // Remove pointer-events: none from canvas so drag works
      canvas.style.pointerEvents = 'auto';

      function animate() {
        raf = requestAnimationFrame(animate);
        const t       = performance.now() / 1000;
        const elapsed = t - animStartRef.current;

        // Drive ostrich
        animateOstrich(t, elapsed, petAnimRef.current, parts);

        // Shadow responds to jump
        const jumpY = parts.bird.position.y;
        parts.shadow.scale.setScalar(Math.max(0.4, 1 - jumpY * 0.12));
        (parts.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, 0.3 - jumpY * 0.06);

        // Float background particles
        const pos = bgGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < BG_COUNT; i++) {
          pos[i * 3 + 1] += 0.003;
          if (pos[i * 3 + 1] > 12) pos[i * 3 + 1] = 0;
        }
        bgGeo.attributes.position.needsUpdate = true;

        // No auto-rotate — camera only moves on user drag/scroll

        // Event particles
        for (let i = eventParticles.length - 1; i >= 0; i--) {
          const p = eventParticles[i];
          p.life -= 0.022;
          if (p.life <= 0) {
            partGroup.remove(p.mesh);
            p.mesh.geometry.dispose();
            eventParticles.splice(i, 1);
            continue;
          }
          p.mesh.position.addScaledVector(p.vel, 1);
          p.vel.y -= 0.002;
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life;
          p.mesh.scale.setScalar(p.life * 0.8 + 0.2);
        }

        renderer.render(scene, camera);
      }
      animate();

      const onResize = () => {
        const rw = container.clientWidth;
        const rh = container.clientHeight;
        if (!rw || !rh) return;
        camera.aspect = rw / rh;
        camera.updateProjectionMatrix();
        renderer.setSize(rw, rh);
      };
      window.addEventListener('resize', onResize);

      threeCleanup = () => {
        window.removeEventListener('resize', onResize);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup',   onPointerUp);
        canvas.removeEventListener('wheel',       onWheel);
        cancelAnimationFrame(raf);
        renderer.dispose();
        scene.clear();
        spawnRef.current = null;
      };
    };

    const ro = new ResizeObserver(tryInit);
    ro.observe(container);
    tryInit();

    return () => {
      ro.disconnect();
      threeCleanup?.();
    };
  }, [isConnected, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isConnected || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🪶</div>
          <h2 className="text-2xl font-extrabold mb-2" style={{
            background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'gradientShift 3s linear infinite',
          }}>{t.petWaitingTitle}</h2>
          <p className="font-bold text-lc-muted leading-relaxed mt-3">
            <span className="block text-base">{t.petWaitingLine1}</span>
            <span className="block text-lg">{t.petWaitingLine2}</span>
            <span className="block text-xl">{t.petWaitingLine3}</span>
            <span className="block text-2xl text-lc-muted">{t.petWaitingLine4}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Stats + Mood */}
        <div className="flex items-start justify-between mb-2 gap-4">
          <div className="flex-1 space-y-2 pt-1">
            <StatBar label={t.statHappiness} value={stats.happiness} color="#4ade80" />
            <StatBar label={t.statEnergy}    value={stats.energy}    color="#38bdf8" />
            <StatBar label={t.statSocial}    value={stats.social}    color="#a78bfa" />
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
            <span className="text-3xl">{MOOD_META[mood].emoji}</span>
            <span className="text-[11px] font-semibold" style={{ color: MOOD_META[mood].color }}>
              {t.moods[mood]}
            </span>
            <span className="text-[9px] text-lc-muted/60 tabular-nums">{idleTime}</span>
          </div>
        </div>

        {/* Pet canvas */}
        <div
          ref={containerRef}
          className="relative w-full rounded-2xl overflow-hidden border border-lc-border/30"
          style={{ height: 'min(55vh, 420px)', background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 100%)' }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Drag hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-lc-muted/40 pointer-events-none select-none" style={{ zIndex: 20 }}>
            {t.dragHint}
          </div>

          {/* Listening indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none" style={{ zIndex: 20 }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{
              background: isListening ? '#b4f953' : '#404040',
              boxShadow: isListening ? '0 0 6px #b4f953aa' : 'none',
              animation: isListening ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
            }} />
            <span className="text-[10px] font-medium" style={{ color: isListening ? '#b4f953' : '#555' }}>
              {isListening ? t.connected : t.disconnected}
            </span>
          </div>

          {/* Speech bubble */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-sm font-medium text-lc-white border border-lc-border/50 pointer-events-none whitespace-nowrap transition-opacity duration-300"
            style={{ background: 'rgba(10,10,10,0.85)', opacity: speechVisible ? 1 : 0, zIndex: 20 }}
          >
            {speechText}
          </div>

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center,transparent 55%,rgba(10,10,10,0.5) 100%)', zIndex: 15 }} />
        </div>

        {/* Event chips */}
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ACTION_BUTTONS.map(({ action, emoji }) => {
            const label = t.actions[action];
            const active = lastAction === action;
            return (
              <div key={label} className="lc-card p-3 flex flex-col items-center gap-1.5 text-center select-none transition-all duration-300"
                style={{
                  opacity: active ? 1 : 0.45,
                  boxShadow: active ? '0 0 14px rgba(180,249,83,0.35)' : 'none',
                  borderColor: active ? '#b4f953' : undefined,
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                }}>
                <span className="text-lg">{emoji}</span>
                <span className="text-[10px] leading-tight font-medium text-lc-muted">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Activity log */}
        <div className="mt-6">
          <h3 className="text-[10px] font-bold text-lc-muted/60 uppercase tracking-[0.15em] mb-3">
            {t.activityTitle}
          </h3>
          <div className="space-y-0">
            {activityLog.length === 0 ? (
              <p className="text-sm text-lc-muted/50 py-4 text-center">{t.activityEmpty}</p>
            ) : (
              activityLog.slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 py-2 border-b border-lc-border/20 last:border-0">
                  <span className="text-xs text-lc-muted/50 font-mono tabular-nums w-10 shrink-0">{formatTime(entry.timestamp)}</span>
                  {entry.senderPubkey ? (
                    <SenderDisplay pubkey={entry.senderPubkey} profile={senderProfiles[entry.senderPubkey]} />
                  ) : (
                    <span className="text-sm shrink-0">{entry.emoji}</span>
                  )}
                  <span className="text-xs text-lc-muted truncate">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
