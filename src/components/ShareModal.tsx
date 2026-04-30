'use client';

import { useState, useEffect } from 'react';
import { publishEvent, AmberIntentRedirect } from '@/lib/nostr';
import { isAndroid, openAmberSign } from '@/lib/amberIntent';
import { useLang } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { ANIMAL_META } from '@/lib/petModels';
import type { AnimalType } from '@/lib/petModels';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  streakDays: number;
  happiness: number;
  energy: number;
  social: number;
  animalType: string;
}

function buildDraft(opts: {
  lang: 'es' | 'en';
  level: number;
  streakDays: number;
  happiness: number;
  energy: number;
  social: number;
  animalType: string;
  appUrl: string;
}): string {
  const { lang, level, streakDays, happiness, energy, social, animalType, appUrl } = opts;
  const safeAnimal = (animalType in ANIMAL_META ? animalType : 'nori') as AnimalType;
  const meta = ANIMAL_META[safeAnimal];
  const emoji = meta.emoji;

  const round = (n: number) => Math.round(n);

  if (lang === 'es') {
    const streakLine = streakDays > 0 ? `🔥 ${streakDays} días de racha\n` : '';
    return `${emoji} Mi Tamagostrich llegó al Nivel ${level}!\n${streakLine}\n📊 Felicidad ${round(happiness)}% · Energía ${round(energy)}% · Social ${round(social)}%\n\n¿Tenés el tuyo? 👉 ${appUrl}\n\n#tamagostrich #nostr`;
  }

  const streakLine = streakDays > 0 ? `🔥 ${streakDays}-day streak\n` : '';
  return `${emoji} My Tamagostrich reached Level ${level}!\n${streakLine}\n📊 Happiness ${round(happiness)}% · Energy ${round(energy)}% · Social ${round(social)}%\n\nGet yours! 👉 ${appUrl}\n\n#tamagostrich #nostr`;
}

export default function ShareModal({ isOpen, onClose, level, streakDays, happiness, energy, social, animalType }: Props) {
  const { t, lang } = useLang();
  const loginMethod = useAuthStore(s => s.loginMethod);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [amberPending, setAmberPending] = useState(false);

  useEffect(() => {
    if (!isOpen) { setStatus('idle'); setErrorMsg(''); setAmberPending(false); return; }
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tamagostrich.vercel.app';
    setDraft(buildDraft({ lang, level, streakDays, happiness, energy, social, animalType, appUrl }));
  }, [isOpen, lang, level, streakDays, happiness, energy, social, animalType]);

  async function handlePublish() {
    // Android + Amber: redirect SYNCHRONOUSLY inside the gesture handler so Chrome
    // doesn't block the nostrsigner: custom scheme navigation (gesture timeout).
    if ((loginMethod === 'bunker' || loginMethod === 'amber') && isAndroid()) {
      const hexPubkey = useAuthStore.getState().profile?.pubkey;
      if (hexPubkey) {
        openAmberSign({
          kind: 1,
          content: draft,
          tags: [['t', 'tamagostrich'], ['t', 'nostr']],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: hexPubkey,
        }, 'share', hexPubkey);
        onClose();
        return;
      }
    }

    setStatus('loading');
    setErrorMsg('');
    setAmberPending(false);
    try {
      await publishEvent({
        kind: 1,
        content: draft,
        tags: [['t', 'tamagostrich'], ['t', 'nostr']],
        onSigningPending: () => setAmberPending(true),
      });
      setStatus('success');
      setAmberPending(false);
    } catch (e: unknown) {
      if (e instanceof AmberIntentRedirect) { onClose(); return; }
      setAmberPending(false);
      setErrorMsg(e instanceof Error ? e.message : t.shareError);
      setStatus('error');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-lc-dark border border-lc-border rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-lc-border">
          <div>
            <div className="font-bold text-lc-white">{t.shareModalTitle}</div>
            <div className="text-xs text-lc-muted mt-0.5">{t.shareModalSubtitle}</div>
          </div>
          <button onClick={onClose} className="text-lc-muted hover:text-lc-white transition p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {status === 'success' ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="font-semibold text-lc-white">{t.shareSuccess}</p>
              <button onClick={onClose} className="lc-pill-primary px-6 py-2 text-sm font-bold"
                style={{ background: 'linear-gradient(90deg,#b4f953,#84cc16)' }}>
                OK
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={8}
                className="w-full bg-lc-black/60 border border-lc-border rounded-xl px-4 py-3 text-sm text-lc-white resize-none focus:outline-none focus:border-lc-green/50 font-mono leading-relaxed"
                placeholder={t.shareEditPlaceholder}
                disabled={status === 'loading'}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-lc-muted">{draft.length} chars</span>
                <div className="flex gap-2">
                  <button onClick={onClose} className="lc-pill-secondary px-4 py-2 text-sm font-medium">
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={status === 'loading' || draft.trim().length === 0}
                    className="lc-pill-primary px-5 py-2 text-sm font-bold disabled:opacity-50"
                    style={{ background: 'linear-gradient(90deg,#b4f953,#84cc16)' }}
                  >
                    {status === 'loading' ? t.sharePublishing : t.sharePublish}
                  </button>
                </div>
              </div>
              {/* NIP-46 (Amber) pending: tell the user to open Amber to approve */}
              {amberPending && loginMethod === 'bunker' && (
                <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(180,249,83,0.08)', border: '1px solid rgba(180,249,83,0.25)' }}>
                  <span className="text-xl mt-0.5">📱</span>
                  <div>
                    <p className="font-semibold text-lc-green">{t.shareAmberPending}</p>
                    <p className="text-lc-muted text-xs mt-0.5">{t.shareAmberPendingSub}</p>
                  </div>
                </div>
              )}
              {status === 'error' && (
                <p className="text-xs text-red-400">{errorMsg || t.shareError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
