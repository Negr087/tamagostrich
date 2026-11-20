// NIP-58 badge issuer (server-side only).
// The app has its own Nostr identity (BADGE_ISSUER_NSEC) that defines one badge per
// achievement (kind 30009) and awards it (kind 8) to users whose signed pet state backs it.
import { finalizeEvent, getPublicKey, nip19, type Event as NostrEvent } from 'nostr-tools';
import { ACHIEVEMENTS, type Achievement } from '@/lib/achievements';

const D_PREFIX = 'tamagostrich-';

function issuerSecret(): Uint8Array | null {
  const raw = process.env.BADGE_ISSUER_NSEC?.trim();
  if (!raw) return null;
  try {
    if (raw.startsWith('nsec')) {
      const decoded = nip19.decode(raw);
      return decoded.type === 'nsec' ? decoded.data : null;
    }
    if (/^[0-9a-f]{64}$/i.test(raw)) return Uint8Array.from(raw.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  } catch {}
  return null;
}

export function getIssuerPubkey(): string | null {
  const sk = issuerSecret();
  return sk ? getPublicKey(sk) : null;
}

export const badgeD = (achievementId: string) => `${D_PREFIX}${achievementId}`;
export const achievementFromD = (d: string) => (d.startsWith(D_PREFIX) ? d.slice(D_PREFIX.length) : null);
export const badgeAddress = (issuer: string, achievementId: string) => `30009:${issuer}:${badgeD(achievementId)}`;

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

function sign(template: { kind: number; tags: string[][]; content: string }): NostrEvent {
  const sk = issuerSecret();
  if (!sk) throw new Error('Badge issuer not configured');
  return finalizeEvent({ ...template, created_at: Math.floor(Date.now() / 1000) }, sk);
}

// kind 30009 — badge definition (parameterized replaceable, one per achievement)
export function buildBadgeDefinition(a: Achievement, origin: string): NostrEvent {
  const image = `${origin}/api/badge-image/${encodeURIComponent(a.id)}`;
  return sign({
    kind: 30009,
    content: '',
    tags: [
      ['d', badgeD(a.id)],
      ['name', `${a.emoji} ${a.nameEs} · ${a.nameEn}`],
      ['description', `${a.descEs} / ${a.descEn} — Tamagostrich`],
      ['image', image, '512x512'],
      ['thumb', `${image}?size=256`, '256x256'],
      ['t', 'tamagostrich'],
    ],
  });
}

// kind 8 — badge award
export function buildBadgeAward(issuer: string, achievementId: string, recipient: string): NostrEvent {
  return sign({
    kind: 8,
    content: '',
    tags: [
      ['a', badgeAddress(issuer, achievementId)],
      ['p', recipient],
    ],
  });
}
