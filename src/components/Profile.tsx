'use client';

import { useEffect, useState, ImgHTMLAttributes } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { useAuthStore } from '@/store/auth';
import {
  connectNDK,
  fetchFollowersCount,
  fetchFollowing,
  fetchUserNotes,
  fetchZapsReceived,
  getNDK,
  parseProfile,
  formatTimestamp,
  type ZapReceived,
  type NostrProfile,
} from '@/lib/nostr';
import { useLang } from '@/lib/i18n';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|avif|bmp)(\?[^\s]*)?$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|ogv|ogg)(\?[^\s]*)?$/i;
const URL_REGEX  = /https?:\/\/[^\s<>"]+/g;

function NoteContent({ content }: { content: string }) {
  type Segment = { type: 'text' | 'image' | 'video' | 'link'; value: string };
  const segments: Segment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;

  while ((m = URL_REGEX.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, m.index) });
    }
    const url = m[0].replace(/[.,!?;:]+$/, ''); // strip trailing punctuation
    if (IMAGE_EXT.test(url))      segments.push({ type: 'image', value: url });
    else if (VIDEO_EXT.test(url)) segments.push({ type: 'video', value: url });
    else                          segments.push({ type: 'link',  value: url });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return (
    <div className="break-words leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'image') {
          return (
            <img
              key={i}
              src={seg.value}
              alt=""
              loading="lazy"
              className="mt-2 rounded-xl max-w-full block"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          );
        }
        if (seg.type === 'video') {
          return (
            <video
              key={i}
              src={seg.value}
              controls
              className="mt-2 rounded-xl max-w-full block"
              style={{ maxHeight: '400px' }}
            />
          );
        }
        if (seg.type === 'link') {
          return (
            <a key={i} href={seg.value} target="_blank" rel="noopener noreferrer"
              className="text-lc-green hover:underline break-all">
              {seg.value}
            </a>
          );
        }
        return <span key={i} className="whitespace-pre-wrap text-lc-white/85">{seg.value}</span>;
      })}
    </div>
  );
}

function SkeletonImg(props: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="lc-img-skeleton w-full h-full">
      <img
        {...props}
        className={`${props.className || ''} ${loaded ? 'loaded' : ''}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pt-16">
      {/* Banner skeleton */}
      <div className="h-52 lc-skeleton" style={{ borderRadius: 0 }} />

      <div className="max-w-2xl mx-auto px-6">
        {/* Avatar skeleton */}
        <div className="relative -mt-16 mb-6">
          <div className="w-32 h-32 lc-skeleton-rounded border-4 border-lc-black" />
        </div>

        {/* Name skeleton */}
        <div className="mb-4 space-y-2">
          <div className="lc-skeleton h-8 w-48" />
          <div className="lc-skeleton h-4 w-32" />
        </div>

        {/* Bio skeleton */}
        <div className="space-y-2 mb-5">
          <div className="lc-skeleton h-4 w-full" />
          <div className="lc-skeleton h-4 w-3/4" />
        </div>

        {/* Stats skeleton */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 py-3 px-4 bg-lc-dark rounded-xl text-center border border-lc-border/50">
              <div className="lc-skeleton h-6 w-10 mx-auto mb-1" />
              <div className="lc-skeleton h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>

        {/* Pubkey skeleton */}
        <div className="p-4 bg-lc-dark rounded-xl mb-6 border border-lc-border/50">
          <div className="lc-skeleton h-3 w-16 mb-2" />
          <div className="lc-skeleton h-4 w-full" />
        </div>

        {/* Tabs skeleton */}
        <div className="border-b border-lc-border mb-6">
          <div className="flex gap-4 pb-3">
            <div className="lc-skeleton h-4 w-12" />
            <div className="lc-skeleton h-4 w-14" />
            <div className="lc-skeleton h-4 w-10" />
          </div>
        </div>

        {/* Notes skeleton */}
        <div className="space-y-3 pb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="lc-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 lc-skeleton-rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="lc-skeleton h-4 w-28" />
                  <div className="lc-skeleton h-3 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="lc-skeleton h-4 w-full" />
                <div className="lc-skeleton h-4 w-5/6" />
                <div className="lc-skeleton h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { isConnected, profile } = useAuthStore();
  const { t } = useLang();
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [following, setFollowing] = useState<string[]>([]);
  const [notes, setNotes] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState({ followers: true, following: true, notes: true });
  const [activeTab, setActiveTab] = useState<'posts' | 'zaps' | 'likes'>('posts');
  const [zaps, setZaps] = useState<ZapReceived[]>([]);
  const [zapProfiles, setZapProfiles] = useState<Record<string, NostrProfile | null>>({});
  const [zapsLoading, setZapsLoading] = useState(false);
  const [zapsLoaded, setZapsLoaded] = useState(false);

  useEffect(() => {
    if (isConnected && profile) {
      loadProfileData();
    }
  }, [isConnected, profile]);

  const loadProfileData = async () => {
    if (!profile) return;

    setLoading(true);
    setStatsLoading({ followers: true, following: true, notes: true });
    try {
      await connectNDK();
      setLoading(false);

      // Load each stat independently so they show as they arrive
      fetchFollowing(profile.pubkey).then((data) => {
        setFollowing(data);
        setStatsLoading((s) => ({ ...s, following: false }));
      });

      fetchFollowersCount(profile.pubkey).then((count) => {
        setFollowersCount(count);
        setStatsLoading((s) => ({ ...s, followers: false }));
      });

      fetchUserNotes(profile.pubkey, 50).then((data) => {
        setNotes(data);
        setStatsLoading((s) => ({ ...s, notes: false }));
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
      setLoading(false);
      setStatsLoading({ followers: false, following: false, notes: false });
    }
  };

  const loadZaps = async () => {
    if (!profile || zapsLoaded) return;
    setZapsLoading(true);
    try {
      const data = await fetchZapsReceived(profile.pubkey, 30);
      setZaps(data);

      const uniquePubkeys = [...new Set(data.map((z) => z.senderPubkey))];
      const ndk = getNDK();
      const profileMap: Record<string, NostrProfile | null> = {};

      await Promise.all(
        uniquePubkeys.slice(0, 25).map(async (pk) => {
          try {
            const user = ndk.getUser({ pubkey: pk });
            await Promise.race([
              user.fetchProfile(),
              new Promise<void>((resolve) => setTimeout(resolve, 5000)),
            ]);
            profileMap[pk] = parseProfile(user);
          } catch {
            profileMap[pk] = null;
          }
        })
      );

      setZapProfiles(profileMap);
      setZapsLoaded(true);
    } catch (error) {
      console.error('Error loading zaps:', error);
    } finally {
      setZapsLoading(false);
    }
  };

  const handleTabChange = (tab: 'posts' | 'zaps' | 'likes') => {
    setActiveTab(tab);
    if (tab === 'zaps' && !zapsLoaded) {
      loadZaps();
    }
  };

  if (!isConnected || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-8 bg-lc-green/10 rounded-2xl flex items-center justify-center lc-glow">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b4f953" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-lc-white mb-3 tracking-tight">
            {t.profileConnectTitle}
          </h1>
          <p className="text-lg text-lc-muted mb-8">
            {t.profileConnectDesc}
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-lc-muted/70">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lc-green/60" />
              Extension
            </span>
            <span className="text-lc-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lc-green/60" />
              nsec
            </span>
            <span className="text-lc-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lc-green/60" />
              Bunker
            </span>
          </div>
          <div className="mt-12 text-xs text-lc-muted/40 font-mono">
            Powered by La Crypta
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Banner */}
      <div className="h-52 lc-banner-gradient relative overflow-hidden">
        {profile.banner ? (
          <SkeletonImg
            src={profile.banner}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 lc-grid-bg opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lc-black via-transparent to-transparent" />
      </div>

      {/* Profile Header */}
      <div className="max-w-2xl mx-auto px-6">
        <div className="relative -mt-16 mb-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-2xl border-4 border-lc-black bg-lc-dark overflow-hidden shadow-2xl">
            {profile.picture ? (
              <SkeletonImg
                src={profile.picture}
                alt={profile.name || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-lc-olive flex items-center justify-center text-lc-green text-4xl font-bold">
                {(profile.name || profile.displayName || 'N')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-4">
          <h1 className="text-3xl font-extrabold text-lc-white tracking-tight">
            {profile.displayName || profile.name || 'Anonymous'}
          </h1>
          {profile.name && profile.displayName && profile.name !== profile.displayName && (
            <div className="text-lc-muted mt-0.5">@{profile.name}</div>
          )}
          {profile.nip05 && (
            <div className="text-lc-green text-sm flex items-center gap-1.5 mt-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{profile.nip05}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.about && (
          <p className="text-lc-white/80 mb-5 whitespace-pre-wrap leading-relaxed">{profile.about}</p>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-4 text-sm text-lc-muted mb-5">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-lc-green transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
              <span>{profile.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {profile.lud16 && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>{profile.lud16}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-1 mb-6">
          {[
            { label: t.profileFollowing, value: following.length.toLocaleString(), loading: statsLoading.following },
            { label: t.profileFollowers, value: followersCount.toLocaleString(), loading: statsLoading.followers },
            { label: t.profileNotes,     value: notes.length >= 50 ? '50+' : notes.length, loading: statsLoading.notes },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 py-3 px-4 bg-lc-dark rounded-xl text-center border border-lc-border/50">
              {stat.loading ? (
                <div className="flex justify-center items-center h-7">
                  <div className="lc-spinner" />
                </div>
              ) : (
                <div className="text-xl font-bold text-lc-white">{stat.value}</div>
              )}
              <div className="text-xs text-lc-muted mt-0.5 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pubkey */}
        <div className="p-4 bg-lc-dark rounded-xl mb-6 border border-lc-border/50">
          <div className="text-xs text-lc-muted mb-1.5 uppercase tracking-wider font-medium">{t.profilePublicKey}</div>
          <div className="text-sm text-lc-white/70 font-mono break-all leading-relaxed">
            {profile.npub}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-lc-border mb-6">
          <div className="flex gap-0">
            {([
              { id: 'posts' as const, label: t.profilePosts },
              { id: 'zaps'  as const, label: t.profileZaps  },
              { id: 'likes' as const, label: t.profileLikes },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`pb-3 px-5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === id
                    ? 'text-lc-green border-lc-green'
                    : 'text-lc-muted border-transparent hover:text-lc-white hover:border-lc-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="space-y-3 pb-12">

          {/* POSTS */}
          {activeTab === 'posts' && (
            notes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 bg-lc-dark rounded-xl flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <p className="text-lc-muted text-sm">{t.profileNoNotes}</p>
              </div>
            ) : (
              <>{notes.map((note) => (
                <div key={note.id} className="lc-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    {profile.picture ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden">
                        <SkeletonImg src={profile.picture} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-lc-olive flex items-center justify-center text-lc-green font-semibold text-sm">
                        {(profile.name || 'N')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lc-white text-sm truncate">
                        {profile.displayName || profile.name || 'Anonymous'}
                      </div>
                      <div className="text-xs text-lc-muted">{formatTimestamp(note.created_at || 0)}</div>
                    </div>
                  </div>
                  <NoteContent content={note.content} />
                </div>
              ))}</>
            )
          )}

          {/* ZAPS */}
          {activeTab === 'zaps' && (
            zapsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="lc-card p-4 flex items-center gap-3">
                    <div className="w-11 h-11 lc-skeleton-rounded flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="lc-skeleton h-4 w-32" />
                      <div className="lc-skeleton h-3 w-20" />
                    </div>
                    <div className="lc-skeleton h-6 w-16 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : zaps.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto mb-4 bg-lc-dark rounded-2xl flex items-center justify-center border border-lc-border/50">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <p className="text-lc-muted text-sm mb-1">{t.profileZapsEmpty}</p>
                <p className="text-lc-muted/60 text-xs">{t.profileZapsEmptyDesc}</p>
              </div>
            ) : (
              <>{zaps.map((zap) => {
                const sender = zapProfiles[zap.senderPubkey];
                const initials = ((sender?.displayName || sender?.name || '?')[0]).toUpperCase();
                return (
                  <div key={zap.id} className="lc-card p-4 flex items-center gap-3">
                    {/* Avatar */}
                    {sender?.picture ? (
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                        <SkeletonImg src={sender.picture} alt={sender.name || ''} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-lc-olive flex items-center justify-center text-lc-green font-semibold flex-shrink-0">
                        {initials}
                      </div>
                    )}

                    {/* Name + message */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lc-white text-sm truncate">
                        {sender?.displayName || sender?.name || `${zap.senderPubkey.slice(0, 8)}…`}
                      </div>
                      {zap.message ? (
                        <div className="text-xs text-lc-muted truncate mt-0.5">{zap.message}</div>
                      ) : (
                        <div className="text-xs text-lc-muted mt-0.5">{formatTimestamp(zap.createdAt)}</div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 rounded-lg px-2.5 py-1 flex-shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      <span className="text-amber-400 text-xs font-bold">
                        {zap.amountSats > 0 ? zap.amountSats.toLocaleString() : '?'} {t.profileSats}
                      </span>
                    </div>
                  </div>
                );
              })}</>
            )
          )}

          {/* LIKES — placeholder */}
          {activeTab === 'likes' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 bg-lc-dark rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
              <p className="text-lc-muted text-sm">{t.profileLikes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
