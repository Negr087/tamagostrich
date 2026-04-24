'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { fetchGLTF, makePetMats } from '@/lib/petModels';
import { useAppearanceStore } from '@/store/appearance';
import { useLang } from '@/lib/i18n';
import PetSelector from './PetSelector';

type Phase = 'idle' | 'cracking' | 'hatched';

const PURPLE = '#9370DB';

const GRADIENT_TEXT: React.CSSProperties = {
  background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function EggHatch() {
  const [phase, setPhase]               = useState<Phase>('idle');
  const [showSelector, setShowSelector] = useState(false);
  const canvasRef                        = useRef<HTMLCanvasElement>(null);
  const { setAnimalType, setBodyColor, setHasChosen } = useAppearanceStore();
  const { lang } = useLang();
  const es = lang === 'es';

  // Preload mascota.glb immediately so it's ready when the egg cracks
  useEffect(() => { fetchGLTF('/mascota.glb').catch(() => {}); }, []);

  function handleEggClick() {
    if (phase !== 'idle') return;
    setPhase('cracking');
    // Switch to hatched only when BOTH the animation AND the GLB are ready
    Promise.all([
      new Promise<void>(r => setTimeout(r, 1900)),
      fetchGLTF('/mascota.glb').then(() => {}).catch(() => {}),
    ]).then(() => setPhase('hatched'));
  }

  function handleStart() {
    setAnimalType('nori');
    setBodyColor(PURPLE);
    setHasChosen(true);
  }

  // Three.js scene for the hatched mascota
  useEffect(() => {
    if (phase !== 'hatched') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const W = 600, H = 600;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 2.2, 6.5);
    camera.lookAt(0, 1.8, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(4, 7, 5);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9b59e8, 0.5);
    rim.position.set(-3, 3, -4);
    scene.add(rim);

    const mats = makePetMats(PURPLE);
    let root: THREE.Group | null = null;

    fetchGLTF('/mascota.glb').then(c => {
      const model = c.scene.clone();
      model.scale.setScalar(c.scale);
      model.position.set(c.ox, c.oy, c.oz);
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = child.receiveShadow = true;
          child.material   = mats.body;
        }
      });
      root = new THREE.Group();
      root.add(model);
      scene.add(root);
    }).catch(() => {});

    const t0 = performance.now();
    function animate() {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;
      if (root) {
        root.rotation.y = t * 0.65;
        root.position.y = Math.sin(t * 1.4) * 0.09;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      scene.clear();
    };
  }, [phase]);

  return (
    <>
      <style>{`
        @keyframes eggWobble {
          0%,100% { transform: rotate(-4deg); }
          25%     { transform: rotate(4deg) scale(1.03); }
          75%     { transform: rotate(-2deg) scale(1.01); }
        }
        @keyframes eggShake {
          0%  { transform: translate(0,0) rotate(0deg); }
          12% { transform: translate(-12px,-3px) rotate(-9deg); }
          25% { transform: translate(14px,2px) rotate(10deg); }
          37% { transform: translate(-10px,4px) rotate(-7deg); }
          50% { transform: translate(11px,-3px) rotate(8deg); }
          62% { transform: translate(-7px,2px) rotate(-5deg); }
          75% { transform: translate(6px,-1px) rotate(4deg); }
          87% { transform: translate(-3px,1px) rotate(-2deg); }
          100%{ transform: translate(0,0) rotate(0deg); }
        }
        @keyframes crackGlow {
          0%,100% { opacity: 0.65; }
          50%     { opacity: 1; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5) translateY(18px); opacity: 0; }
          65%  { transform: scale(1.08) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes hintPulse {
          0%,100% { opacity: 0.45; }
          50%     { opacity: 0.95; }
        }
        @keyframes eggGlowRing {
          0%,100% { box-shadow: 0 0 0 0 rgba(180,249,83,0.35), 0 12px 50px rgba(0,0,0,0.55); }
          50%     { box-shadow: 0 0 0 14px rgba(180,249,83,0), 0 12px 50px rgba(0,0,0,0.55); }
        }
        @keyframes crackShell {
          0%,100% { box-shadow: 0 12px 50px rgba(0,0,0,0.55), 0 0 30px rgba(255,200,50,0.25); }
          50%     { box-shadow: 0 12px 50px rgba(0,0,0,0.55), 0 0 60px rgba(255,200,50,0.55); }
        }
      `}</style>

      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-4"
        style={{
          background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0a 100%)',
          zIndex: 200,
        }}
      >
        {phase !== 'hatched' ? (
          /* ── Egg phases ── */
          <>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold mb-2" style={GRADIENT_TEXT}>
                {es ? '¡Tu mascota te espera!' : 'Your pet is waiting!'}
              </h1>
              <p
                className="text-sm"
                style={{
                  color: phase === 'cracking' ? '#b4f953' : '#a3a3a3',
                  animation: phase === 'idle' ? 'hintPulse 1.8s ease-in-out infinite' : 'none',
                }}
              >
                {phase === 'idle'
                  ? (es ? 'Tocá el huevo para eclosionar' : 'Tap the egg to hatch')
                  : (es ? '¡Está rompiendo el cascarón!' : "It's hatching!")}
              </p>
            </div>

            {/* Egg */}
            <div
              onClick={handleEggClick}
              style={{
                position: 'relative',
                width: 190,
                height: 232,
                cursor: phase === 'idle' ? 'pointer' : 'default',
                animation: phase === 'idle'
                  ? 'eggWobble 2.6s ease-in-out infinite'
                  : 'eggShake 0.14s ease-in-out infinite',
                userSelect: 'none',
              }}
            >
              {/* Shell */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
                  background: 'radial-gradient(circle at 38% 28%, #fdf7e4 0%, #e8d78a 55%, #c4a84a 100%)',
                  animation: phase === 'idle'
                    ? 'eggGlowRing 2.2s ease-in-out infinite'
                    : 'crackShell 0.25s ease-in-out infinite',
                  inset: 0,
                  position: 'absolute',
                }}
              />

              {/* Crack SVG */}
              {phase === 'cracking' && (
                <svg
                  viewBox="0 0 190 232"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    animation: 'crackGlow 0.22s ease-in-out infinite',
                    pointerEvents: 'none',
                  }}
                >
                  {/* Glow layer behind cracks */}
                  <path
                    d="M95 68 L106 93 L89 112 L109 134 L92 156 L104 178"
                    stroke="rgba(255,210,60,0.4)"
                    strokeWidth="9"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Main crack */}
                  <path
                    d="M95 68 L106 93 L89 112 L109 134 L92 156 L104 178"
                    stroke="#7a5c10"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Side cracks */}
                  <path d="M80 107 L95 118 L83 132" stroke="#7a5c10" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  <path d="M112 120 L95 130 L109 147" stroke="#7a5c10" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  <path d="M100 86 L116 94" stroke="#7a5c10" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  <path d="M88 142 L74 148" stroke="#7a5c10" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </>
        ) : (
          /* ── Hatched ── */
          <>
            <div
              className="text-center"
              style={{ animation: 'popIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            >
              <h1 className="text-3xl font-extrabold mb-1" style={GRADIENT_TEXT}>
                {es ? '¡Nació tu mascota!' : 'Your pet hatched!'}
              </h1>
              <p className="text-sm text-lc-muted">
                {es ? 'Tu avestruz bebé te está esperando' : 'Your baby ostrich is waiting for you'}
              </p>
            </div>

            {/* 3D viewer */}
            <div
              style={{
                animation: 'popIn 0.75s cubic-bezier(0.34,1.56,0.64,1) forwards',
                animationDelay: '0.08s',
                opacity: 0,
              }}
            >
              <canvas
                ref={canvasRef}
                width={600}
                height={600}
                style={{
                  width: 280,
                  height: 280,
                  display: 'block',
                  borderRadius: 20,
                  filter: 'drop-shadow(0 0 36px rgba(147,112,219,0.6))',
                }}
              />
            </div>

            {/* Buttons */}
            <div
              className="flex flex-col gap-3 w-full max-w-xs"
              style={{
                animation: 'popIn 0.6s ease-out forwards',
                animationDelay: '0.28s',
                opacity: 0,
              }}
            >
              <button
                onClick={handleStart}
                className="lc-pill-primary w-full py-3 text-sm font-bold tracking-wide"
              >
                {es ? '¡Comenzar!' : "Let's go!"}
              </button>
              <button
                onClick={() => setShowSelector(true)}
                className="lc-pill-secondary w-full py-3 text-sm font-semibold tracking-wide"
              >
                {es ? 'Elegir otra mascota' : 'Choose another pet'}
              </button>
            </div>
          </>
        )}
      </div>

      {showSelector && (
        <PetSelector
          onClose={() => setShowSelector(false)}
          onConfirm={() => { setShowSelector(false); setHasChosen(true); }}
        />
      )}
    </>
  );
}
