'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { nip19 } from 'nostr-tools';
import { useAuthStore } from '@/store/auth';
import { useNoriStore, NoriAction, NoriMood } from '@/store/nori';
import { useGoalsStore, ACHIEVEMENTS } from '@/store/goals';
import { useAppearanceStore, PALETTE } from '@/store/appearance';
import { buildAnimal, animatePet, makePetMats, preloadGLBs, PetParts, PetMats, PetAnim, ANIMAL_META } from '@/lib/petModels';
import { startNoriListener, stopNoriListener } from '@/lib/noriEvents';
import { getNDK } from '@/lib/nostr';
import { useLang } from '@/lib/i18n';
import PetSelector from './PetSelector';

// ─── TYPES ───────────────────────────────────────────────────────────

const ACTION_TO_ANIM: Partial<Record<NoriAction, PetAnim>> = {
  zap_received:      'zap',
  new_follower:      'spin',
  mention_received:  'tilt',
  note_published:    'nod',
  reaction_received: 'pulse',
  repost_received:   'nod',
  no_activity:       'sleep',
};

// ─── EVENT PARTICLES ─────────────────────────────────────────────────

interface EventParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

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

// ─── STAT BAR ────────────────────────────────────────────────────────

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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export default function NoriTamagotchi() {
  const { isConnected, profile } = useAuthStore();
  const { stats, mood, activityLog, isListening, lastEventTime, loadFromNostr } = useNoriStore();
  const { level, justLeveledUp, recentUnlocks, clearNotifications } = useGoalsStore();
  const { bodyColor, animalType, setBodyColor } = useAppearanceStore();
  const { t, lang } = useLang();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spawnRef     = useRef<((color: number, count: number, spread: number) => void) | null>(null);
  const matsRef      = useRef<PetMats | null>(null);
  const partsRef     = useRef<PetParts | null>(null);
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
  const [paletteOpen, setPaletteOpen]       = useState(false);
  const [selectorOpen, setSelectorOpen]     = useState(false);
  const idleTime = useIdleTime(lastEventTime);
  const fetchingSet = useRef<Set<string>>(new Set());

  // Kick off all GLB downloads in parallel as soon as component mounts
  useEffect(() => { preloadGLBs(); }, []);

  // Sync React state → refs used inside rAF
  useEffect(() => {
    petAnimRef.current   = petAnim;
    animStartRef.current = performance.now() / 1000;
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live-update materials when body color changes (no scene rebuild needed)
  useEffect(() => {
    const m = matsRef.current;
    if (!m) return;
    const base = new THREE.Color(bodyColor);
    const dark = base.clone().multiplyScalar(0.78);
    m.body.color.copy(base);
    m.dark.color.copy(dark);
  }, [bodyColor]);

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

    const entry0 = activityLog[0];
    const speech = entry0.detail
      ? `${t.actions[entry0.action]} · ${entry0.detail}`
      : t.actions[entry0.action];
    setSpeechText(speech);
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

  // Level-up and achievement notifications
  useEffect(() => {
    if (!justLeveledUp && recentUnlocks.length === 0) return;
    clearNotifications();

    if (justLeveledUp) {
      setSpeechText(t.goalsLevelUp(level));
      setSpeechVisible(true);
      setPetAnim('spin');
      setAnimKey(k => k + 1);
      if (clearSpeech.current) clearTimeout(clearSpeech.current);
      clearSpeech.current = setTimeout(() => setSpeechVisible(false), 3500);
      if (clearRef.current) clearTimeout(clearRef.current);
      clearRef.current = setTimeout(() => { setPetAnim('bob'); setAnimKey(k => k + 1); }, 4000);
    } else if (recentUnlocks.length > 0) {
      const ach = ACHIEVEMENTS.find(a => a.id === recentUnlocks[0]);
      if (ach) {
        setSpeechText(`${ach.emoji} ${lang === 'es' ? ach.nameEs : ach.nameEn}`);
        setSpeechVisible(true);
        if (clearSpeech.current) clearTimeout(clearSpeech.current);
        clearSpeech.current = setTimeout(() => setSpeechVisible(false), 3000);
      }
    }
  }, [justLeveledUp, recentUnlocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nostr listener
  const pubkey = profile?.pubkey;
  useEffect(() => {
    if (isConnected && pubkey) startNoriListener(pubkey);
    return () => stopNoriListener();
  }, [isConnected, pubkey]);

  // Load pet state from Nostr on login
  useEffect(() => {
    if (isConnected && pubkey) loadFromNostr(pubkey);
  }, [isConnected, pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Three.js scene — rebuilds when animal type changes
  useEffect(() => {
    if (!isConnected || !profile) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let raf: number;
    let initialized = false;
    let alive = true;
    let threeCleanup: (() => void) | null = null;

    const tryInit = async () => {
      if (initialized) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      initialized = true;
      ro.disconnect();

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0d0d1a, 0.012);

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
      renderer.toneMapping         = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.outputColorSpace    = THREE.SRGBColorSpace;

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

      scene.add(new THREE.PointLight(0xF5A623, 0.3, 10)).position.set(0, 0, 3);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(15, 64),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8, metalness: 0.2 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.2;
      ground.receiveShadow = true;
      scene.add(ground);

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

      // Build animal using current bodyColor and animalType
      const mats  = makePetMats(bodyColor);
      matsRef.current = mats;
      const parts = await buildAnimal(scene, mats, animalType);
      if (!alive) { renderer.dispose(); scene.clear(); return; }
      partsRef.current = parts;

      const partGroup = new THREE.Group();
      scene.add(partGroup);
      const eventParticles: EventParticle[] = [];
      spawnRef.current = (color, count, spread) =>
        spawnEventParticles(partGroup, eventParticles, color, count, spread);

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
      canvas.style.pointerEvents = 'auto';

      function animate() {
        raf = requestAnimationFrame(animate);
        const t       = performance.now() / 1000;
        const elapsed = t - animStartRef.current;

        if (partsRef.current) {
          animatePet(t, elapsed, petAnimRef.current, partsRef.current);

          // Shadow responds to jump
          const jumpY = partsRef.current.root.position.y;
          const shadow = partsRef.current.shadow;
          shadow.scale.setScalar(Math.max(0.4, 1 - jumpY * 0.12));
          (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, 0.3 - jumpY * 0.06);
        }

        // Float background particles
        const pos = bgGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < BG_COUNT; i++) {
          pos[i * 3 + 1] += 0.003;
          if (pos[i * 3 + 1] > 12) pos[i * 3 + 1] = 0;
        }
        bgGeo.attributes.position.needsUpdate = true;

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
        spawnRef.current  = null;
        matsRef.current   = null;
        partsRef.current  = null;
      };
    };

    const ro = new ResizeObserver(tryInit);
    ro.observe(container);
    tryInit();

    return () => {
      alive = false;
      ro.disconnect();
      threeCleanup?.();
    };
  }, [isConnected, profile, animalType]); // eslint-disable-line react-hooks/exhaustive-deps

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
            animation: 'gradientShift 5s linear infinite',
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
    <>
      {/* Pet Selector modal (in-app) */}
      {selectorOpen && <PetSelector onClose={() => setSelectorOpen(false)} />}

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
              <span className="text-[10px] font-bold text-lc-green tracking-wide">Lv.{level}</span>
            </div>
          </div>

          {/* Pet canvas */}
          <div
            ref={containerRef}
            className="relative w-full rounded-2xl overflow-hidden border border-lc-border/30"
            style={{ height: 'min(55vh, 420px)', background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 100%)' }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

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

            {/* Current animal chip (top-left) */}
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full border border-lc-border/40 pointer-events-none" style={{ background: 'rgba(10,10,10,0.7)', zIndex: 20 }}>
              <span className="text-sm">{ANIMAL_META[animalType].emoji}</span>
              <span className="text-[10px] font-semibold text-lc-muted/80">
                {lang === 'es' ? ANIMAL_META[animalType].nameEs : ANIMAL_META[animalType].nameEn}
              </span>
            </div>

            {/* Speech bubble */}
            <div
              className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-sm font-medium text-lc-white border border-lc-border/50 pointer-events-none whitespace-nowrap transition-opacity duration-300"
              style={{ background: 'rgba(10,10,10,0.85)', opacity: speechVisible ? 1 : 0, zIndex: 20 }}
            >
              {speechText}
            </div>

            {/* Customization buttons (bottom-left) */}
            <div className="absolute bottom-3 left-3 flex items-end gap-2" style={{ zIndex: 20 }}>
              {/* Animal selector */}
              <button
                onClick={() => { setSelectorOpen(true); setPaletteOpen(false); }}
                className="w-7 h-7 rounded-full border border-lc-border/60 flex items-center justify-center text-sm transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ background: 'rgba(10,10,10,0.8)' }}
                title={lang === 'es' ? 'Cambiar mascota' : 'Change pet'}
              >
                🐾
              </button>

              {/* Color picker */}
              <button
                onClick={() => setPaletteOpen(o => !o)}
                className="w-7 h-7 rounded-full border border-lc-border/60 flex items-center justify-center text-sm transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ background: 'rgba(10,10,10,0.8)', boxShadow: paletteOpen ? '0 0 0 2px #b4f95344' : 'none' }}
                title={lang === 'es' ? 'Cambiar color' : 'Change color'}
              >
                🎨
              </button>

              {paletteOpen && (
                <div
                  className="flex gap-1.5 items-center px-2.5 py-2 rounded-full border border-lc-border/50"
                  style={{ background: 'rgba(10,10,10,0.88)' }}
                >
                  {PALETTE.map(({ hex, nameEs, nameEn }) => (
                    <button
                      key={hex}
                      onClick={() => setBodyColor(hex)}
                      className="rounded-full transition-all duration-150 hover:scale-125"
                      style={{
                        width: bodyColor === hex ? 22 : 18,
                        height: bodyColor === hex ? 22 : 18,
                        background: hex,
                        boxShadow: bodyColor === hex ? `0 0 0 2px #0a0a0a, 0 0 0 4px ${hex}` : 'none',
                      }}
                      title={lang === 'es' ? nameEs : nameEn}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center,transparent 55%,rgba(10,10,10,0.5) 100%)', zIndex: 15 }} />
          </div>

          {/* Event chips */}
          <div className="mt-4 grid grid-cols-4 sm:grid-cols-7 gap-2">
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
                    <span className="text-xs text-lc-muted truncate">
                      {t.actions[entry.action]}{entry.detail ? ` · ${entry.detail}` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
