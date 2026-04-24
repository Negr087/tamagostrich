'use client';

import { useState } from 'react';
import LoginModal from './LoginModal';
import { useLang } from '@/lib/i18n';

const GRADIENT_TEXT: React.CSSProperties = {
  background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const GRADIENT_BTN: React.CSSProperties = {
  background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
  backgroundSize: '200% auto',
  animation: 'gradientShift 5s linear infinite',
};

function ConnectButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="lc-pill font-bold text-lc-black flex items-center gap-2 px-8 py-3.5 text-[15px]"
      style={GRADIENT_BTN}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      {children}
    </button>
  );
}

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { lang } = useLang();
  const es = lang === 'es';

  return (
    <>
      <style>{`
        @keyframes eggFloat {
          0%,100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes shellDrift {
          0%,100% { transform: rotate(-22deg) translate(4px, -6px); }
          50%      { transform: rotate(-26deg) translate(6px, -12px); }
        }
        @keyframes babyBob {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes eggGlow {
          0%,100% { filter: drop-shadow(0 0 18px rgba(147,112,219,0.35)); }
          50%      { filter: drop-shadow(0 0 36px rgba(147,112,219,0.6)); }
        }
        @keyframes statFill {
          from { width: 0; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeUp2 {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .land-fadein   { animation: fadeUp  0.7s ease-out forwards; }
        .land-fadein2  { animation: fadeUp2 0.6s ease-out 0.15s forwards; opacity:0; }
        .land-fadein3  { animation: fadeUp2 0.6s ease-out 0.3s  forwards; opacity:0; }
      `}</style>

      <div
        className="min-h-screen pt-20"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0a0a0a 65%)' }}
      >

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section className="flex flex-col items-center text-center px-6 pt-12 pb-20 gap-8">

          {/* Cracked egg CSS illustration */}
          <div style={{ position: 'relative', width: 130, height: 150, animation: 'eggFloat 3.2s ease-in-out infinite, eggGlow 2.8s ease-in-out infinite' }}>
            {/* Shell bottom half — jagged top edge via clip-path */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 130,
              height: 90,
              borderRadius: '0 0 65px 65px',
              background: 'radial-gradient(circle at 36% 25%, #fdf8e8 0%, #e0c870 55%, #b89830 100%)',
              boxShadow: '0 6px 30px rgba(0,0,0,0.5), inset 0 2px 8px rgba(255,255,255,0.2)',
              clipPath: 'polygon(0% 28%, 8% 16%, 18% 30%, 30% 14%, 42% 26%, 54% 12%, 66% 26%, 78% 14%, 90% 24%, 100% 16%, 100% 100%, 0% 100%)',
            }} />
            {/* Shell top half — tilted and drifting */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 6,
              width: 118,
              height: 78,
              borderRadius: '59px 59px 0 0',
              background: 'radial-gradient(circle at 36% 50%, #fdf8e8 0%, #e0c870 55%, #b89830 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 2px 6px rgba(255,255,255,0.15)',
              animation: 'shellDrift 3.2s ease-in-out infinite',
              transformOrigin: 'bottom right',
            }} />
            {/* Baby peeking */}
            <div style={{
              position: 'absolute',
              bottom: 58,
              left: '50%',
              fontSize: 46,
              lineHeight: 1,
              animation: 'babyBob 2.4s ease-in-out infinite',
              zIndex: 2,
              transform: 'translateX(-50%)',
            }}>
              🐣
            </div>
          </div>

          {/* Headline */}
          <div className="land-fadein">
            <h1 className="text-5xl sm:text-6xl font-extrabold mb-3 tracking-tight" style={GRADIENT_TEXT}>
              Tamagostrich
            </h1>
            <p className="text-xl font-semibold text-lc-white mb-3">
              {es
                ? 'Tu mascota digital en Nostr'
                : 'Your digital pet on Nostr'}
            </p>
            <p className="text-base text-lc-muted max-w-xs mx-auto leading-relaxed">
              {es
                ? 'Zaps, reacciones y seguidores la mantienen viva. Nori te espera del otro lado del huevo.'
                : 'Zaps, reactions and followers keep it alive. Nori is waiting on the other side of the egg.'}
            </p>
          </div>

          <div className="land-fadein2">
            <ConnectButton onClick={() => setShowLogin(true)}>
              {es ? 'Conectar con Nostr' : 'Connect with Nostr'}
            </ConnectButton>
          </div>

          <p className="land-fadein3 text-xs text-lc-muted/50">
            {es
              ? 'Con extensión, nsec o Nostr Connect — sin contraseña'
              : 'With extension, nsec or Nostr Connect — no password'}
          </p>
        </section>

        {/* ── FEATURES ───────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                emoji: '⚡',
                titleEs: 'Vive de tu actividad',
                titleEn: 'Powered by your activity',
                descEs:  'Cada zap, reacción o nuevo seguidor que recibas en Nostr sube la energía y felicidad de tu mascota en tiempo real.',
                descEn:  'Every zap, reaction or new follower you receive on Nostr boosts your pet\'s energy and happiness in real time.',
              },
              {
                emoji: '🎨',
                titleEs: 'Completamente tuya',
                titleEn: 'Fully yours',
                descEs:  'Elegí entre 9 animales 3D y personalizá el color. Tu progreso se guarda en la red Nostr — sin servidores centrales.',
                descEn:  'Choose from 9 3D animals and customise the colour. Progress saves to the Nostr network — no central servers.',
              },
              {
                emoji: '🏆',
                titleEs: 'Niveles y sats reales',
                titleEn: 'Levels & real sats',
                descEs:  'Subí de nivel y desbloqueá logros. Al llegar al nivel 10 o al máximo recibís sats directo en tu wallet vía Lightning.',
                descEn:  'Level up and unlock achievements. Reach level 10 or max level and receive sats straight to your Lightning wallet.',
              },
            ].map((f) => (
              <div
                key={f.emoji}
                className="lc-card p-5 flex flex-col gap-3 hover:border-lc-border transition-colors duration-200"
                style={{ background: 'rgba(255,255,255,0.025)' }}
              >
                <span className="text-3xl">{f.emoji}</span>
                <h3 className="font-bold text-lc-white text-sm">{es ? f.titleEs : f.titleEn}</h3>
                <p className="text-xs text-lc-muted leading-relaxed">{es ? f.descEs : f.descEn}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SATS REWARDS ───────────────────────────────────────── */}
        <section className="max-w-xl mx-auto px-6 pb-20">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#b4f953' }}>
            {es ? 'Premios en sats' : 'Sats rewards'}
          </p>
          <p className="text-center text-sm text-lc-muted mb-7">
            {es
              ? 'Alcanzá estos niveles y recibís sats reales en tu wallet Lightning'
              : 'Reach these levels and get real sats sent to your Lightning wallet'}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { level: 10, sats: 210,  emoji: '⚡', tag: null },
              { level: 21, sats: 420,  emoji: '🏆', tag: es ? 'Nivel máximo' : 'Max level' },
            ].map(({ level, sats, emoji, tag }) => (
              <div
                key={level}
                className="lc-card p-5 flex flex-col items-center gap-2 text-center"
                style={{ background: 'rgba(180,249,83,0.04)', borderColor: 'rgba(180,249,83,0.2)' }}
              >
                <span className="text-4xl">{emoji}</span>
                <div>
                  <span className="text-[11px] font-bold text-lc-muted uppercase tracking-wider">
                    {es ? `Nivel ${level}` : `Level ${level}`}
                  </span>
                  {tag && (
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                      {tag}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black" style={{ color: '#b4f953' }}>
                  {sats} <span className="text-sm font-semibold text-lc-muted">sats</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-lc-muted/40 mt-4">
            {es
              ? 'Pagado automáticamente a tu lightning address (lud16) al reclamar'
              : 'Automatically paid to your lightning address (lud16) on claim'}
          </p>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8" style={{ color: '#b4f953' }}>
            {es ? '¿Cómo funciona?' : 'How does it work?'}
          </p>
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-4 items-start justify-center">
            {([
              { n: '1', emoji: '🔑', es: 'Conectá tu clave Nostr',     en: 'Connect your Nostr key'       },
              { n: '2', emoji: '🥚', es: 'Nori nace del huevo',         en: 'Nori hatches from the egg'    },
              { n: '3', emoji: '💚', es: 'Tu actividad la mantiene viva', en: 'Your activity keeps it alive' },
            ] as const).map((step, i) => (
              <div key={step.n} className="flex-1 flex sm:flex-col items-center sm:items-center gap-4 sm:gap-2 text-left sm:text-center">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                  style={{ background: 'rgba(180,249,83,0.1)', border: '1.5px solid rgba(180,249,83,0.3)', color: '#b4f953' }}
                >
                  {step.n}
                </div>
                <div>
                  <div className="text-2xl mb-1">{step.emoji}</div>
                  <p className="text-xs text-lc-muted leading-relaxed">{es ? step.es : step.en}</p>
                </div>
                {i < 2 && (
                  <div className="hidden sm:block absolute" style={{ display: 'none' }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── PREVIEW (frozen stats) ─────────────────────────────── */}
        <section className="max-w-xs mx-auto px-6 pb-20">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] mb-5" style={{ color: '#b4f953' }}>
            {es ? 'Vista previa' : 'Preview'}
          </p>
          <div
            className="lc-card p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.025)' }}
          >
            {([
              { label: es ? 'Felicidad' : 'Happiness', value: 78, color: '#4ade80' },
              { label: es ? 'Energía'   : 'Energy',    value: 55, color: '#38bdf8' },
              { label: es ? 'Social'    : 'Social',    value: 91, color: '#a78bfa' },
            ] as const).map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-lc-muted w-16 text-right uppercase tracking-wider shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${value}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}88)`,
                      boxShadow: `0 0 8px ${color}55`,
                      animation: 'statFill 1.4s ease-out forwards',
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold w-7 tabular-nums text-lc-white shrink-0">{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-3 border-t border-lc-border/20">
              <span className="text-lg">🎉</span>
              <span className="text-xs font-semibold" style={{ color: '#f97316' }}>
                {es ? 'Emocionada' : 'Excited'}
              </span>
              <span className="text-[10px] text-lc-muted ml-auto tabular-nums">
                {es ? 'ahora mismo' : 'just now'}
              </span>
            </div>
          </div>
          <p className="text-center text-[10px] text-lc-muted/40 mt-3">
            {es ? 'Así se ve cuando tu mascota está activa' : 'This is what it looks like when your pet is active'}
          </p>
        </section>

        {/* ── FOOTER CTA ─────────────────────────────────────────── */}
        <section className="text-center px-6 pb-24">
          <div
            className="max-w-sm mx-auto rounded-2xl p-8 border border-lc-border/30 flex flex-col items-center gap-5"
            style={{ background: 'rgba(147,112,219,0.06)' }}
          >
            <p className="text-lg font-bold text-lc-white">
              {es ? '¿Lista para conocer a Nori?' : 'Ready to meet Nori?'}
            </p>
            <p className="text-sm text-lc-muted">
              {es
                ? 'Conectá tu identidad Nostr y hacé nacer tu mascota en segundos.'
                : 'Connect your Nostr identity and hatch your pet in seconds.'}
            </p>
            <ConnectButton onClick={() => setShowLogin(true)}>
              {es ? 'Comenzar ahora' : 'Start now'}
            </ConnectButton>
          </div>
        </section>

      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
