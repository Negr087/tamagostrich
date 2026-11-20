'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { nip19 } from 'nostr-tools';
import { QRCodeSVG } from 'qrcode.react';
import { usePetViewer } from '@/store/petViewer';
import { useAuthStore } from '@/store/auth';
import { DECAY_PER_MINUTE } from '@/store/nori';
import { useLang } from '@/lib/i18n';
import { ANIMAL_META, type AnimalType } from '@/lib/petModels';
import { getNDK, connectNDK, fetchPetState, verifyNip05, formatNip05, SigningUnavailableError } from '@/lib/nostr';
import type { FetchedPetState } from '@/lib/nostr';
import { getWebOfTrust, WebOfTrust, type TrustLevel } from '@/lib/wot';
import { prepareZap, payWithWebLN, waitForZapReceipt } from '@/lib/zap';

const PetViewer = dynamic(() => import('./PetViewer'), { ssr: false });

interface OtherProfile {
  name?: string;
  picture?: string;
  nip05?: string;
  lud16?: string;
  lud06?: string;
  about?: string;
}

type FeedStage = 'idle' | 'signing' | 'invoice' | 'waiting' | 'done' | 'error';

const FEED_AMOUNTS = [21, 100, 500];

const STR = {
  es: {
    loading: 'Cargando mascota...',
    noPet: 'Todavía no tiene un Tamagostrich. ¡Invitalo!',
    level: 'Nivel', streak: 'racha', achievements: 'logros', deaths: 'revividas',
    dead: 'Esta mascota murió por falta de actividad 💀',
    updated: 'Último sync',
    trust: {
      self: 'Esta es tu mascota',
      follow: '🤝 Lo seguís',
      'friend-of-friend': '🔗 Amigo de un amigo',
      untrusted: '⚠️ Fuera de tu red de confianza',
    } as Record<TrustLevel, string>,
    feedTitle: 'Alimentar con un zap ⚡',
    feedSubtitle: 'Tu zap le da felicidad, energía y XP a su mascota',
    feedComment: '🍎 ¡Alimenté a tu Tamagostrich!',
    feedNoLn: 'No tiene lightning address con soporte de zaps.',
    feedOutsideWot: 'Ojo: su mascota solo cuenta zaps de su red de confianza. Si no te sigue (ni ningún amigo suyo), tu zap llega pero no la alimenta.',
    signing: 'Firmando el zap...',
    scan: 'Pagá este invoice desde tu wallet',
    copy: 'Copiar', copied: '¡Copiado!', openWallet: 'Abrir wallet',
    waiting: 'Esperando el recibo del zap...',
    done: (n: number) => `¡Le diste ${n} sats de comida! 🎉`,
    amberUnsupported: 'Tu sesión de Amber no puede firmar zaps en segundo plano. Usá una extensión (Alby) o un bunker.',
    error: 'No se pudo enviar el zap.',
    retry: 'Reintentar',
    copyNpub: 'Copiar npub',
  },
  en: {
    loading: 'Loading pet...',
    noPet: "They don't have a Tamagostrich yet. Invite them!",
    level: 'Level', streak: 'streak', achievements: 'achievements', deaths: 'revivals',
    dead: 'This pet died from lack of activity 💀',
    updated: 'Last sync',
    trust: {
      self: 'This is your pet',
      follow: '🤝 You follow them',
      'friend-of-friend': '🔗 Friend of a friend',
      untrusted: '⚠️ Outside your web of trust',
    } as Record<TrustLevel, string>,
    feedTitle: 'Feed with a zap ⚡',
    feedSubtitle: 'Your zap gives their pet happiness, energy and XP',
    feedComment: '🍎 I fed your Tamagostrich!',
    feedNoLn: 'No lightning address with zap support.',
    feedOutsideWot: "Heads up: their pet only counts zaps from its web of trust. If they (or their friends) don't follow you, the zap arrives but won't feed it.",
    signing: 'Signing the zap...',
    scan: 'Pay this invoice from your wallet',
    copy: 'Copy', copied: 'Copied!', openWallet: 'Open wallet',
    waiting: 'Waiting for the zap receipt...',
    done: (n: number) => `You fed them ${n} sats! 🎉`,
    amberUnsupported: "Your Amber session can't sign zaps in the background. Use an extension (Alby) or a bunker.",
    error: 'Could not send the zap.',
    retry: 'Retry',
    copyNpub: 'Copy npub',
  },
};

function estimateStats(pet: FetchedPetState) {
  if (pet.isDead) return { happiness: 0, energy: 0, social: 0 };
  const minutes = Math.max(0, (Date.now() - pet.lastDecayTime) / 60000);
  const dec = (v: number) => Math.max(0, Math.min(100, v - minutes * DECAY_PER_MINUTE));
  return { happiness: dec(pet.stats.happiness), energy: dec(pet.stats.energy), social: dec(pet.stats.social) };
}

export default function PetProfileModal() {
  const pubkey = usePetViewer(s => s.pubkey);
  const close = usePetViewer(s => s.close);
  if (!pubkey) return null;
  return <PetProfileModalInner key={pubkey} pubkey={pubkey} onClose={close} />;
}

function PetProfileModalInner({ pubkey, onClose }: { pubkey: string; onClose: () => void }) {
  const { lang } = useLang();
  const s = STR[lang];
  const me = useAuthStore(st => st.profile?.pubkey);
  const [pet, setPet] = useState<FetchedPetState | null | undefined>(undefined);
  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [nip05Ok, setNip05Ok] = useState(false);
  const [trust, setTrust] = useState<TrustLevel | null>(null);
  const [theirViewOfMe, setTheirViewOfMe] = useState<TrustLevel | null>(null);
  const [feedStage, setFeedStage] = useState<FeedStage>('idle');
  const [feedAmount, setFeedAmount] = useState(21);
  const [invoice, setInvoice] = useState('');
  const [feedError, setFeedError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const npub = nip19.npubEncode(pubkey);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ndk = await connectNDK();
      fetchPetState(pubkey).then(p => { if (!cancelled) setPet(p); }).catch(() => { if (!cancelled) setPet(null); });

      const user = ndk.getUser({ pubkey });
      const prof = await Promise.race([
        user.fetchProfile().catch(() => null),
        new Promise<null>(r => setTimeout(() => r(null), 8000)),
      ]);
      if (cancelled) return;
      const p: OtherProfile = {
        name: (prof?.displayName || prof?.display_name || prof?.name) as string | undefined,
        picture: (prof?.picture || prof?.image) as string | undefined,
        nip05: prof?.nip05 as string | undefined,
        lud16: prof?.lud16 as string | undefined,
        lud06: prof?.lud06 as string | undefined,
        about: prof?.about as string | undefined,
      };
      setProfile(p);
      if (p.nip05) verifyNip05(p.nip05, pubkey).then(ok => { if (!cancelled) setNip05Ok(ok); });
    })();

    if (me) {
      getWebOfTrust(getNDK(), me).trustLevel(pubkey).then(t => { if (!cancelled) setTrust(t); });
    }
    return () => { cancelled = true; };
  }, [pubkey, me]);

  // Before zapping, check whether MY zap would count for THEIR pet (am I in their WoT?).
  useEffect(() => {
    if (!me || me === pubkey) return;
    let cancelled = false;
    new WebOfTrust(getNDK(), pubkey).trustLevel(me).then(t => { if (!cancelled) setTheirViewOfMe(t); });
    return () => { cancelled = true; };
  }, [me, pubkey]);

  async function handleFeed(amount: number) {
    if (!profile) return;
    setFeedAmount(amount);
    setFeedError('');
    setInvoice('');
    setFeedStage('signing');
    try {
      const { invoice: pr } = await prepareZap({
        recipientPubkey: pubkey,
        lud16: profile.lud16,
        lud06: profile.lud06,
        amountSats: amount,
        comment: s.feedComment,
      });
      setInvoice(pr);
      const receipt = waitForZapReceipt(pubkey, pr);
      const paidByWebLN = await payWithWebLN(pr);
      setFeedStage(paidByWebLN ? 'waiting' : 'invoice');
      const ok = await receipt;
      if (ok) {
        setFeedStage('done');
        setPlayKey(k => k + 1);
      } else if (paidByWebLN) {
        setFeedStage('done'); // paid, receipt just didn't reach our relays in time
      }
    } catch (e) {
      setFeedError(e instanceof SigningUnavailableError ? s.amberUnsupported : (e instanceof Error ? e.message : s.error));
      setFeedStage('error');
    }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  const safeAnimal = (pet?.appearance?.animalType && pet.appearance.animalType in ANIMAL_META
    ? pet.appearance.animalType : 'nori') as AnimalType;
  const meta = ANIMAL_META[safeAnimal];
  const stats = pet ? estimateStats(pet) : null;
  const goals = pet?.goals;
  const displayName = profile?.name || `${npub.slice(0, 12)}…`;
  const canFeed = !!pet && me !== pubkey && !pet.isDead;
  const hasLn = !!(profile?.lud16 || profile?.lud06);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-lc-dark border border-lc-border rounded-2xl shadow-2xl">

        {/* Header: identity */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-lc-border">
          {profile?.picture ? (
            <img src={profile.picture} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 bg-lc-border"
              onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
          ) : (
            <div className="w-12 h-12 rounded-full shrink-0 lc-skeleton" />
          )}
          <div className="flex-1 min-w-0">
            {profile ? (
              <div className="font-bold text-lc-white truncate">{displayName}</div>
            ) : (
              <div className="lc-skeleton h-4 w-32 rounded" />
            )}
            {profile?.nip05 && (
              <div className="text-xs truncate" style={{ color: nip05Ok ? '#b4f953' : '#a3a3a3' }}>
                {nip05Ok ? '✓ ' : ''}{formatNip05(profile.nip05)}
              </div>
            )}
            <button onClick={() => copy(npub)} className="text-[11px] text-lc-muted hover:text-lc-white font-mono truncate block max-w-full">
              {npub.slice(0, 16)}…{npub.slice(-6)} · {copied ? s.copied : s.copyNpub}
            </button>
          </div>
          <button onClick={onClose} className="text-lc-muted hover:text-lc-white transition p-1 self-start" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {trust && (
            <div className="text-[11px] inline-block px-2.5 py-1 rounded-full"
              style={trust === 'untrusted'
                ? { background: 'rgba(249,115,22,0.1)', color: '#fdba74', border: '1px solid rgba(249,115,22,0.3)' }
                : { background: 'rgba(180,249,83,0.1)', color: '#b4f953', border: '1px solid rgba(180,249,83,0.25)' }}>
              {s.trust[trust]}
            </div>
          )}

          {pet === undefined && (
            <div className="space-y-3">
              <div className="lc-skeleton h-64 w-full rounded-xl" />
              <div className="lc-skeleton h-4 w-40 rounded" />
              <div className="lc-skeleton h-3 w-full rounded" />
            </div>
          )}

          {pet === null && <p className="text-sm text-lc-muted text-center py-8">{s.noPet}</p>}

          {pet && stats && (
            <>
              <PetViewer
                animalType={safeAnimal}
                bodyColor={pet.appearance?.bodyColor || meta.defaultColor}
                idle={pet.isDead ? 'sleep' : 'bob'}
                playKey={playKey}
              />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-lc-white">{meta.emoji} {lang === 'es' ? meta.nameEs : meta.nameEn}</div>
                  <div className="text-xs text-lc-muted mt-0.5">
                    {goals?.streakDays ? `🔥 ${goals.streakDays}d ${s.streak} · ` : ''}
                    🏅 {goals?.unlockedAchievements?.length ?? 0} {s.achievements}
                    {goals?.deaths ? ` · 💀 ${goals.deaths} ${s.deaths}` : ''}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl"
                  style={{ background: 'rgba(180,249,83,0.08)', border: '1px solid rgba(180,249,83,0.2)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-lc-green">{s.level}</span>
                  <span className="text-2xl font-black leading-tight text-lc-green">{goals?.level ?? 1}</span>
                </div>
              </div>

              {pet.isDead ? (
                <p className="text-sm text-red-400">{s.dead}</p>
              ) : (
                <div className="space-y-2">
                  {([
                    [lang === 'es' ? 'Felicidad' : 'Happiness', stats.happiness, '#f472b6'],
                    [lang === 'es' ? 'Energía' : 'Energy', stats.energy, '#facc15'],
                    ['Social', stats.social, '#60a5fa'],
                  ] as const).map(([label, v, color]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-lc-muted w-20">{label}</span>
                      <div className="flex-1 h-2 bg-lc-border/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: color }} />
                      </div>
                      <span className="text-xs text-lc-muted tabular-nums w-8 text-right">{Math.round(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-lc-muted/60">
                {s.updated}: {new Date(pet.nostrCreatedAt * 1000).toLocaleString(lang === 'es' ? 'es-AR' : 'en-US')}
              </div>

              {/* Feed with a zap */}
              {canFeed && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(180,249,83,0.05)', border: '1px solid rgba(180,249,83,0.2)' }}>
                  <div>
                    <div className="text-sm font-bold text-lc-white">{s.feedTitle}</div>
                    <div className="text-[11px] text-lc-muted">{s.feedSubtitle}</div>
                  </div>

                  {!hasLn ? (
                    <p className="text-xs text-lc-muted">{s.feedNoLn}</p>
                  ) : feedStage === 'idle' || feedStage === 'error' ? (
                    <>
                      <div className="flex gap-2">
                        {FEED_AMOUNTS.map(n => (
                          <button key={n} onClick={() => handleFeed(n)}
                            className="flex-1 lc-pill-primary px-3 py-2 text-xs font-bold">
                            🍎 {n} sats
                          </button>
                        ))}
                      </div>
                      {theirViewOfMe === 'untrusted' && (
                        <p className="text-[11px] leading-relaxed" style={{ color: '#fdba74' }}>{s.feedOutsideWot}</p>
                      )}
                      {feedStage === 'error' && <p className="text-xs text-red-400 break-words">{feedError}</p>}
                    </>
                  ) : feedStage === 'signing' ? (
                    <div className="flex items-center gap-2 text-xs text-lc-muted"><div className="lc-spinner" /> {s.signing}</div>
                  ) : feedStage === 'invoice' ? (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-xs text-lc-muted">{s.scan} · {feedAmount} sats</p>
                      <div className="bg-white p-3 rounded-xl">
                        <QRCodeSVG value={invoice.toUpperCase()} size={180} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => copy(invoice)} className="lc-pill-secondary px-4 py-2 text-xs font-medium">
                          {copied ? s.copied : s.copy}
                        </button>
                        <a href={`lightning:${invoice}`} className="lc-pill-primary px-4 py-2 text-xs font-bold">{s.openWallet}</a>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-lc-muted"><div className="lc-spinner" /> {s.waiting}</div>
                    </div>
                  ) : feedStage === 'waiting' ? (
                    <div className="flex items-center gap-2 text-xs text-lc-muted"><div className="lc-spinner" /> {s.waiting}</div>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: '#b4f953' }}>{s.done(feedAmount)}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
