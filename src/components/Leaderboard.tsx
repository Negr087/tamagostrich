'use client';

import { useEffect, useState } from 'react';
import { getNDK } from '@/lib/nostr';
import { useLang } from '@/lib/i18n';
import { ANIMAL_META } from '@/lib/petModels';
import type { AnimalType } from '@/lib/petModels';
import { nip19 } from 'nostr-tools';

interface LeaderboardEntry {
  pubkey: string;
  level: number;
  streak: number;
  animalType: string;
  updatedAt: number;
}

interface Profile {
  name?: string;
  displayName?: string;
  picture?: string;
}

const RANK_STYLES = [
  { bg: 'rgba(245,197,24,0.15)', border: 'rgba(245,197,24,0.5)', text: '#F5C518', medal: '🥇' },
  { bg: 'rgba(180,180,180,0.1)', border: 'rgba(180,180,180,0.4)', text: '#c0c0c0', medal: '🥈' },
  { bg: 'rgba(180,100,30,0.12)', border: 'rgba(180,100,30,0.4)', text: '#cd7f32', medal: '🥉' },
];

function timeAgo(unixSec: number, lang: 'es' | 'en'): string {
  const diffMs = Date.now() - unixSec * 1000;
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (h < 1) return lang === 'es' ? 'ahora mismo' : 'just now';
  if (h < 24) return lang === 'es' ? `hace ${h}h` : `${h}h ago`;
  return lang === 'es' ? `hace ${d}d` : `${d}d ago`;
}

export default function Leaderboard() {
  const { t, lang } = useLang();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then((data: { entries?: LeaderboardEntry[]; error?: string }) => {
        if (data.entries) {
          setEntries(data.entries);
        } else {
          setError(data.error ?? t.leaderboardError);
        }
      })
      .catch(() => setError(t.leaderboardError))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load Nostr profiles for visible entries
  useEffect(() => {
    if (entries.length === 0) return;
    const ndk = getNDK();
    const pubkeys = entries.map(e => e.pubkey);

    Promise.race([
      ndk.fetchEvents({ kinds: [0], authors: pubkeys, limit: pubkeys.length }),
      new Promise<null>(r => setTimeout(() => r(null), 8000)),
    ]).then(result => {
      if (!result) return;
      const newProfiles: Record<string, Profile> = {};
      for (const ev of result) {
        try {
          const c = JSON.parse(ev.content) as Record<string, string>;
          newProfiles[ev.pubkey] = {
            name: c.name || c.display_name || c.displayName,
            displayName: c.display_name || c.displayName,
            picture: c.picture || c.image,
          };
        } catch {}
      }
      setProfiles(newProfiles);
    }).catch(() => {});
  }, [entries]);

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-2xl mx-auto px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-lc-white tracking-tight">{t.leaderboardTitle}</h1>
          <p className="text-lc-muted mt-1">{t.leaderboardSubtitle}</p>
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="lc-card p-4 flex items-center gap-4">
                <div className="lc-skeleton w-8 h-8 rounded-full" />
                <div className="lc-skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="lc-skeleton h-3 w-32 rounded" />
                  <div className="lc-skeleton h-2 w-20 rounded" />
                </div>
                <div className="lc-skeleton w-12 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-400 text-center py-8">{error}</p>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-lc-muted text-center py-12">{t.leaderboardEmpty}</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-2 pb-12">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const style = RANK_STYLES[idx] ?? null;
              const profile = profiles[entry.pubkey];
              const safeAnimalType = (entry.animalType in ANIMAL_META ? entry.animalType : 'nori') as AnimalType;
              const animalMeta = ANIMAL_META[safeAnimalType];
              const displayName = profile?.name || profile?.displayName
                || nip19.npubEncode(entry.pubkey).slice(0, 12) + '…';

              return (
                <div
                  key={entry.pubkey}
                  className="lc-card p-4 flex items-center gap-3 transition-all"
                  style={style ? { background: style.bg, borderColor: style.border } : undefined}
                >
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {style ? (
                      <span className="text-xl">{style.medal}</span>
                    ) : (
                      <span className="text-sm font-bold text-lc-muted">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {profile?.picture ? (
                      <img
                        src={profile.picture}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover"
                        style={{ border: style ? `2px solid ${style.border}` : '1px solid #262626' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ background: '#171717', border: style ? `2px solid ${style.border}` : '1px solid #262626' }}
                      >
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 text-sm leading-none"
                      title={lang === 'es' ? animalMeta.nameEs : animalMeta.nameEn}
                    >
                      {animalMeta.emoji}
                    </span>
                  </div>

                  {/* Name + streak */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lc-white text-sm truncate"
                      style={style ? { color: style.text } : undefined}>
                      {displayName}
                    </div>
                    <div className="text-xs text-lc-muted mt-0.5 flex items-center gap-2">
                      {entry.streak > 0 && (
                        <span>🔥 {entry.streak}{lang === 'es' ? 'd' : 'd'}</span>
                      )}
                      <span className="opacity-60">{timeAgo(entry.updatedAt, lang)}</span>
                    </div>
                  </div>

                  {/* Level badge */}
                  <div
                    className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl"
                    style={{ background: style ? style.bg : 'rgba(180,249,83,0.08)', border: `1px solid ${style ? style.border : 'rgba(180,249,83,0.2)'}` }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: style ? style.text : '#b4f953' }}>
                      {t.leaderboardLevel}
                    </span>
                    <span className="text-2xl font-black leading-tight" style={{ color: style ? style.text : '#b4f953' }}>
                      {entry.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
