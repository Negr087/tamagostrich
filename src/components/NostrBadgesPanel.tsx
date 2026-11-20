'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { useGoalsStore } from '@/store/goals';
import { flushSync, waitForSyncComplete } from '@/store/nori';
import { useBadgesCache } from '@/store/badgesCache';

interface AwardedBadge { id: string; a: string; eventId: string }

const STR = {
  es: {
    title: 'Badges en Nostr (NIP-58)',
    subtitle: 'Convertí tus logros en badges firmados que cualquier cliente Nostr puede verificar',
    issue: (n: number) => `Emitir mis badges (${n} logros)`,
    issuing: 'Emitiendo...',
    issued: (n: number, total: number) => n > 0 ? `✓ ${n} badges nuevos emitidos (${total} en total)` : `✓ Tenés ${total} badges emitidos`,
    showOnProfile: 'Mostrar en mi perfil',
    showing: 'Publicando...',
    shown: '✓ Badges visibles en tu perfil Nostr',
    none: 'Desbloqueá logros para recibir badges.',
    error: 'No se pudieron emitir los badges.',
  },
  en: {
    title: 'Nostr badges (NIP-58)',
    subtitle: 'Turn your achievements into signed badges any Nostr client can verify',
    issue: (n: number) => `Issue my badges (${n} achievements)`,
    issuing: 'Issuing...',
    issued: (n: number, total: number) => n > 0 ? `✓ ${n} new badges issued (${total} total)` : `✓ You have ${total} badges issued`,
    showOnProfile: 'Show on my profile',
    showing: 'Publishing...',
    shown: '✓ Badges visible on your Nostr profile',
    none: 'Unlock achievements to receive badges.',
    error: 'Could not issue badges.',
  },
};

export default function NostrBadgesPanel() {
  const { lang } = useLang();
  const s = STR[lang];
  const { profile, loginMethod } = useAuthStore();
  const unlocked = useGoalsStore(st => st.unlockedAchievements);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [issueState, setIssueState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ awarded: AwardedBadge[]; all: AwardedBadge[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/badges')
      .then(r => r.json())
      .then((d: { configured?: boolean }) => setConfigured(!!d.configured))
      .catch(() => setConfigured(false));
  }, []);

  if (configured === false || !profile?.pubkey) return null;
  if (configured === null) {
    return <div className="lc-card p-4 mb-8"><div className="lc-skeleton h-4 w-48 rounded mb-2" /><div className="lc-skeleton h-3 w-64 rounded" /></div>;
  }

  async function handleIssue() {
    if (!profile?.pubkey) return;
    setIssueState('loading');
    setErrorMsg('');
    try {
      // Make sure the server sees the latest achievements on Nostr
      if (loginMethod !== 'amber') {
        await waitForSyncComplete();
        await flushSync();
        await new Promise(r => setTimeout(r, 2000));
      }
      const res = await fetch('/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey: profile.pubkey }),
      });
      const data = await res.json() as { error?: string; awarded?: AwardedBadge[]; all?: AwardedBadge[] };
      if (!res.ok || !data.all) throw new Error(data.error ?? s.error);
      setResult({ awarded: data.awarded ?? [], all: data.all });
      setIssueState('done');
      useBadgesCache.getState().reset(); // refresh the Badges section on next visit
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : s.error);
      setIssueState('error');
    }
  }

  // NIP-58 profile badges (kind 30008): ordered a/e pairs. Keep the user's other badges.
  async function handleShowOnProfile() {
    if (!profile?.pubkey || !result?.all.length) return;
    setProfileState('loading');
    setErrorMsg('');
    try {
      const { getNDK, connectNDK, publishEvent, AmberIntentRedirect } = await import('@/lib/nostr');
      await connectNDK();
      const existing = await Promise.race([
        getNDK().fetchEvent({ kinds: [30008], authors: [profile.pubkey], '#d': ['profile_badges'] }),
        new Promise<null>(r => setTimeout(() => r(null), 6000)),
      ]);

      const pairs: [string, string][] = [];
      const seen = new Set<string>();
      const tags = existing?.tags ?? [];
      for (let i = 0; i < tags.length; i++) {
        if (tags[i][0] === 'a' && tags[i + 1]?.[0] === 'e' && !seen.has(tags[i][1])) {
          pairs.push([tags[i][1], tags[i + 1][1]]);
          seen.add(tags[i][1]);
        }
      }
      for (const b of result.all) if (!seen.has(b.a)) { pairs.push([b.a, b.eventId]); seen.add(b.a); }

      try {
        await publishEvent({
          kind: 30008,
          content: '',
          tags: [['d', 'profile_badges'], ...pairs.flatMap(([a, e]) => [['a', a], ['e', e]])],
        });
      } catch (e) {
        if (e instanceof AmberIntentRedirect) return; // Amber will publish and redirect back
        throw e;
      }
      setProfileState('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : s.error);
      setProfileState('error');
    }
  }

  return (
    <div className="lc-card p-4 mb-8">
      <div className="text-sm font-bold text-lc-white flex items-center gap-2">🏅 {s.title}</div>
      <div className="text-[11px] text-lc-muted mt-0.5 mb-3">{s.subtitle}</div>

      {unlocked.length === 0 ? (
        <p className="text-xs text-lc-muted">{s.none}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleIssue}
            disabled={issueState === 'loading'}
            className="lc-pill-primary px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {issueState === 'loading' ? s.issuing : s.issue(unlocked.length)}
          </button>
          {result && result.all.length > 0 && (
            <button
              onClick={handleShowOnProfile}
              disabled={profileState === 'loading' || profileState === 'done'}
              className="lc-pill-secondary px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              {profileState === 'loading' ? s.showing : s.showOnProfile}
            </button>
          )}
        </div>
      )}

      {issueState === 'done' && result && (
        <p className="text-xs mt-3" style={{ color: '#b4f953' }}>{s.issued(result.awarded.length, result.all.length)}</p>
      )}
      {profileState === 'done' && <p className="text-xs mt-1" style={{ color: '#b4f953' }}>{s.shown}</p>}
      {(issueState === 'error' || profileState === 'error') && (
        <p className="text-xs mt-3 text-red-400 break-all">{errorMsg || s.error}</p>
      )}
    </div>
  );
}
