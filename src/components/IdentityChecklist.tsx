'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';

interface IdentityReport {
  lud16: string | null;
  nip05: string | null;
  nip05Verified: boolean;
  followers: number;
  requireNip05: boolean;
  minFollowers: number;
  eligible: boolean;
}

const STR = {
  es: {
    title: 'Identidad verificada',
    subtitle: 'Para que los premios lleguen a personas reales y no a claves descartables',
    lud16: 'Lightning address en tu perfil',
    lud16Missing: 'Agregá un lud16 (ej: vos@walletofsatoshi.com) a tu perfil Nostr',
    nip05: 'NIP-05 verificado',
    nip05Missing: 'Agregá un identificador NIP-05 a tu perfil (ej: vos@lacrypta.ar)',
    nip05Invalid: (id: string) => `${id} no apunta a tu pubkey — revisá tu nostr.json`,
    followers: (n: number, min: number) => `${Math.min(n, min)}/${min} seguidores`,
    followersHint: 'Seguidores reales en Nostr (contact lists que te incluyen)',
    optional: 'opcional',
    ok: 'Cumplís todos los requisitos para cobrar ⚡',
    retry: 'Volver a verificar',
    error: 'No se pudo verificar tu identidad ahora.',
  },
  en: {
    title: 'Verified identity',
    subtitle: 'So rewards reach real people instead of throwaway keys',
    lud16: 'Lightning address on your profile',
    lud16Missing: 'Add a lud16 (e.g. you@walletofsatoshi.com) to your Nostr profile',
    nip05: 'Verified NIP-05',
    nip05Missing: 'Add a NIP-05 identifier to your profile (e.g. you@lacrypta.ar)',
    nip05Invalid: (id: string) => `${id} does not point to your pubkey — check your nostr.json`,
    followers: (n: number, min: number) => `${Math.min(n, min)}/${min} followers`,
    followersHint: 'Real followers on Nostr (contact lists that include you)',
    optional: 'optional',
    ok: 'You meet every requirement to claim ⚡',
    retry: 'Check again',
    error: 'Could not verify your identity right now.',
  },
};

function Row({ ok, label, hint, optional }: { ok: boolean; label: string; hint?: string; optional?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
        style={ok
          ? { background: 'rgba(180,249,83,0.15)', color: '#b4f953', border: '1px solid rgba(180,249,83,0.4)' }
          : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
      >
        {ok ? '✓' : '✕'}
      </span>
      <div className="min-w-0">
        <div className="text-sm text-lc-white font-medium break-all">
          {label}
          {optional && <span className="ml-2 text-[10px] text-lc-muted uppercase tracking-wider">{optional}</span>}
        </div>
        {hint && !ok && <div className="text-[11px] text-lc-muted mt-0.5 leading-relaxed">{hint}</div>}
      </div>
    </div>
  );
}

export default function IdentityChecklist({ pubkey }: { pubkey: string }) {
  const { lang } = useLang();
  const s = STR[lang];
  const [report, setReport] = useState<IdentityReport | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/eligibility?pubkey=${pubkey}`, nonce ? { cache: 'reload' } : undefined)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: IdentityReport) => { if (!cancelled) setReport(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [pubkey, nonce]);

  return (
    <div className="lc-card p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-bold text-lc-white flex items-center gap-2">🪪 {s.title}</div>
          <div className="text-[11px] text-lc-muted mt-0.5">{s.subtitle}</div>
        </div>
        <button
          onClick={() => { setReport(null); setError(false); setNonce(n => n + 1); }}
          disabled={!report && !error}
          className="text-[11px] text-lc-muted hover:text-lc-green transition shrink-0 disabled:opacity-40"
        >
          ↻ {s.retry}
        </button>
      </div>

      {!report && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="lc-skeleton w-5 h-5 rounded-full" />
              <div className="lc-skeleton h-3 w-48 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{s.error}</p>}

      {report && (
        <div className="space-y-2.5">
          <Row ok={!!report.lud16} label={report.lud16 ?? s.lud16} hint={s.lud16Missing} />
          <Row
            ok={report.nip05Verified}
            label={report.nip05 ? `${s.nip05}: ${report.nip05}` : s.nip05}
            hint={report.nip05 ? s.nip05Invalid(report.nip05) : s.nip05Missing}
            optional={report.requireNip05 ? undefined : s.optional}
          />
          {report.minFollowers > 0 && (
            <Row
              ok={report.followers >= report.minFollowers}
              label={s.followers(report.followers, report.minFollowers)}
              hint={s.followersHint}
            />
          )}
          {report.eligible && (
            <p className="text-xs font-semibold pt-1" style={{ color: '#b4f953' }}>{s.ok}</p>
          )}
        </div>
      )}
    </div>
  );
}
