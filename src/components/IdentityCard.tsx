'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuthStore } from '@/store/auth';
import { useGoalsStore } from '@/store/goals';
import { useNoriStore } from '@/store/nori';
import { useAppearanceStore } from '@/store/appearance';
import { ANIMAL_META, type AnimalType } from '@/lib/petModels';
import { verifyNip05, formatNip05 } from '@/lib/nostr';
import { useLang } from '@/lib/i18n';

// Shareable identity card: Nostr profile + verified NIP-05 + pet + QR of the npub.
// Drawn on a <canvas> so it can be downloaded / shared as a PNG.

const W = 1200;
const H = 750;
const GREEN = '#b4f953';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // without CORS the canvas would be tainted → skip avatar
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    setTimeout(() => resolve(null), 5000);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

export default function IdentityCard() {
  const { lang } = useLang();
  const es = lang === 'es';
  const profile = useAuthStore(s => s.profile);
  const { level, streakDays, unlockedAchievements } = useGoalsStore();
  const stats = useNoriStore(s => s.stats);
  const isDead = useNoriStore(s => s.isDead);
  const { animalType } = useAppearanceStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [nip05Result, setNip05Result] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const pubkey = profile?.pubkey ?? '';
  const npub = profile?.npub ?? '';

  useEffect(() => {
    if (profile?.nip05) verifyNip05(profile.nip05, pubkey).then(setNip05Result);
  }, [profile?.nip05, pubkey]);
  // No NIP-05 → nothing to verify (false); otherwise null until the check finishes.
  const nip05Ok = profile?.nip05 ? nip05Result : false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile || nip05Ok === null) return;
    let cancelled = false;

    (async () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const avatar = profile.picture ? await loadImage(profile.picture) : null;
      if (cancelled) return;

      const safeAnimal = (animalType in ANIMAL_META ? animalType : 'nori') as AnimalType;
      const pet = ANIMAL_META[safeAnimal];
      const font = (w: string, s: number) => `${w} ${s}px Inter, system-ui, -apple-system, sans-serif`;

      // Background + grid
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Card
      roundRect(ctx, 40, 40, W - 80, H - 80, 32);
      ctx.fillStyle = '#171717';
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,249,83,0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Header
      ctx.fillStyle = GREEN;
      ctx.font = font('800', 22);
      ctx.fillText('TAMAGOSTRICH · NOSTR IDENTITY', 90, 105);

      // Avatar
      const ax = 90, ay = 140, ar = 80;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + ar, ay + ar, ar, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (avatar) {
        ctx.drawImage(avatar, ax, ay, ar * 2, ar * 2);
      } else {
        ctx.fillStyle = '#262626';
        ctx.fillRect(ax, ay, ar * 2, ar * 2);
        ctx.fillStyle = '#fafafa';
        ctx.font = font('800', 72);
        ctx.textAlign = 'center';
        ctx.fillText((profile.displayName || profile.name || '?')[0].toUpperCase(), ax + ar, ay + ar + 26);
        ctx.textAlign = 'left';
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(ax + ar, ay + ar, ar, 0, Math.PI * 2);
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Name + NIP-05 + npub
      const tx = 290;
      const textMax = 520;
      ctx.fillStyle = '#fafafa';
      ctx.font = font('800', 52);
      ctx.fillText(fitText(ctx, profile.displayName || profile.name || 'Nostrich', textMax), tx, 205);
      if (profile.nip05) {
        ctx.font = font('600', 26);
        ctx.fillStyle = nip05Ok ? GREEN : '#a3a3a3';
        const label = `${nip05Ok ? '✓ ' : ''}${formatNip05(profile.nip05)}`;
        ctx.fillText(fitText(ctx, label, textMax), tx, 250);
      }
      ctx.font = font('500', 20);
      ctx.fillStyle = '#737373';
      ctx.fillText(`${npub.slice(0, 20)}…${npub.slice(-8)}`, tx, profile.nip05 ? 288 : 250);

      // Pet block
      const py = 360;
      roundRect(ctx, 90, py, 700, 260, 24);
      ctx.fillStyle = '#0f0f0f';
      ctx.fill();
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = font('400', 110);
      ctx.fillText(isDead ? '💀' : pet.emoji, 120, py + 150);
      ctx.fillStyle = '#fafafa';
      ctx.font = font('800', 36);
      ctx.fillText(es ? pet.nameEs : pet.nameEn, 270, py + 65);
      ctx.font = font('700', 22);
      ctx.fillStyle = GREEN;
      const streak = streakDays > 0 ? `   🔥 ${streakDays} ${es ? 'días' : 'days'}` : '';
      ctx.fillText(`${es ? 'NIVEL' : 'LEVEL'} ${level}${streak}   🏅 ${unlockedAchievements.length}`, 270, py + 102);

      const bars: [string, number, string][] = [
        [es ? 'Felicidad' : 'Happiness', stats.happiness, '#f472b6'],
        [es ? 'Energía' : 'Energy', stats.energy, '#facc15'],
        ['Social', stats.social, '#60a5fa'],
      ];
      bars.forEach(([label, value, color], i) => {
        const by = py + 140 + i * 38;
        ctx.font = font('600', 18);
        ctx.fillStyle = '#a3a3a3';
        ctx.fillText(label, 270, by + 14);
        roundRect(ctx, 400, by, 350, 16, 8);
        ctx.fillStyle = '#262626';
        ctx.fill();
        roundRect(ctx, 400, by, Math.max(16, 3.5 * Math.round(value)), 16, 8);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // QR (rendered by qrcode.react into a hidden canvas)
      const qr = qrWrapRef.current?.querySelector('canvas');
      const qx = 850, qy = 170, qs = 260;
      roundRect(ctx, qx - 20, qy - 20, qs + 40, qs + 40, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      if (qr) ctx.drawImage(qr, qx, qy, qs, qs);
      ctx.fillStyle = '#a3a3a3';
      ctx.font = font('600', 18);
      ctx.textAlign = 'center';
      ctx.fillText(es ? 'Escaneá para seguirme' : 'Scan to follow me', qx + qs / 2, qy + qs + 55);
      ctx.textAlign = 'left';

      // Footer
      ctx.fillStyle = '#525252';
      ctx.font = font('500', 18);
      ctx.fillText(typeof window !== 'undefined' ? window.location.host : 'tamagostrich', 90, H - 75);

      setReady(true);
    })();

    return () => { cancelled = true; };
  }, [profile, nip05Ok, level, streakDays, unlockedAchievements.length, stats, isDead, animalType, es, npub]);

  async function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      try { canvasRef.current?.toBlob(resolve, 'image/png'); } catch { resolve(null); }
    });
  }

  async function handleDownload() {
    setBusy(true);
    const blob = await toBlob();
    setBusy(false);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamagostrich-${npub.slice(0, 12)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleShare() {
    setBusy(true);
    const blob = await toBlob();
    setBusy(false);
    if (!blob) return;
    const file = new File([blob], 'tamagostrich.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Tamagostrich', text: `nostr:${npub}` }).catch(() => {});
    } else {
      handleDownload();
    }
  }

  if (!profile) return null;

  return (
    <div className="space-y-3">
      <div ref={qrWrapRef} className="hidden">
        <QRCodeCanvas value={`nostr:${npub}`} size={520} marginSize={0} level="M" />
      </div>
      <div className="relative rounded-xl overflow-hidden border border-lc-border">
        {!ready && <div className="absolute inset-0 lc-skeleton" />}
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto block" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={handleDownload} disabled={!ready || busy} className="lc-pill-secondary px-4 py-2 text-sm font-medium disabled:opacity-50">
          ⬇ {es ? 'Descargar PNG' : 'Download PNG'}
        </button>
        <button onClick={handleShare} disabled={!ready || busy} className="lc-pill-primary px-5 py-2 text-sm font-bold disabled:opacity-50">
          {es ? 'Compartir' : 'Share'}
        </button>
      </div>
    </div>
  );
}
