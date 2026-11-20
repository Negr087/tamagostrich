'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildAnimal, makePetMats, animatePet, type AnimalType, type PetAnim, type PetParts } from '@/lib/petModels';

// Lightweight, read-only 3D pet (used to show other users' pets). Drag to rotate.
// `playKey` changes → plays a one-shot celebration animation (e.g. after being fed).
export default function PetViewer({
  animalType, bodyColor, idle = 'bob', playKey = 0,
}: { animalType: AnimalType; bodyColor: string; idle?: PetAnim; playKey?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<{ anim: PetAnim; start: number }>({ anim: idle, start: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { animRef.current = { anim: idle, start: performance.now() / 1000 }; }, [idle]);

  useEffect(() => {
    if (!playKey) return;
    animRef.current = { anim: 'zap', start: performance.now() / 1000 };
    const t = setTimeout(() => { animRef.current = { anim: idle, start: performance.now() / 1000 }; }, 1000);
    return () => clearTimeout(t);
  }, [playKey, idle]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let alive = true;
    let raf = 0;

    const w = wrap.clientWidth || 300;
    const h = wrap.clientHeight || 260;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    let theta = 0.4;
    const place = () => {
      camera.position.set(9 * Math.sin(theta), 4, 9 * Math.cos(theta));
      camera.lookAt(0, 2, 0);
    };
    place();

    scene.add(new THREE.AmbientLight(0x606080, 0.9));
    const key = new THREE.DirectionalLight(0xffeedd, 1.3);
    key.position.set(5, 8, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb4f953, 0.5);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    let parts: PetParts | null = null;
    buildAnimal(scene, makePetMats(bodyColor), animalType)
      .then((p) => { if (alive) { parts = p; setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });

    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      theta -= (e.clientX - lastX) * 0.01;
      lastX = e.clientX;
      place();
    };
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = performance.now() / 1000;
      if (parts) animatePet(t, t - animRef.current.start, animRef.current.anim, parts);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      renderer.dispose();
      scene.clear();
    };
  }, [animalType, bodyColor]);

  return (
    <div ref={wrapRef} className="relative w-full h-64 rounded-xl overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 60%, rgba(180,249,83,0.08), transparent 70%)' }}>
      {loading && <div className="absolute inset-0 flex items-center justify-center"><div className="lc-spinner" /></div>}
      <canvas ref={canvasRef} className="w-full h-full block touch-none cursor-grab" />
    </div>
  );
}
