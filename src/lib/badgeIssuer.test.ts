import { describe, it, expect, beforeAll } from 'vitest';
import { generateSecretKey, getPublicKey, verifyEvent, nip19 } from 'nostr-tools';

const sk = generateSecretKey();
beforeAll(() => { process.env.BADGE_ISSUER_NSEC = nip19.nsecEncode(sk); });

describe('badge issuer (NIP-58)', () => {
  it('derives the issuer pubkey from BADGE_ISSUER_NSEC', async () => {
    const { getIssuerPubkey } = await import('./badgeIssuer');
    expect(getIssuerPubkey()).toBe(getPublicKey(sk));
  });

  it('builds a valid, signed kind-30009 definition', async () => {
    const { buildBadgeDefinition, findAchievement, badgeD } = await import('./badgeIssuer');
    const ev = buildBadgeDefinition(findAchievement('first_note')!, 'https://example.com');
    expect(ev.kind).toBe(30009);
    expect(verifyEvent(ev)).toBe(true);
    expect(ev.tags).toContainEqual(['d', badgeD('first_note')]);
    expect(ev.tags.find(t => t[0] === 'image')?.[1]).toBe('https://example.com/api/badge-image/first_note');
  });

  it('builds a valid kind-8 award pointing at the definition', async () => {
    const { buildBadgeAward, badgeAddress, achievementFromD } = await import('./badgeIssuer');
    const issuer = getPublicKey(sk);
    const recipient = 'e'.repeat(64);
    const ev = buildBadgeAward(issuer, 'first_note', recipient);
    expect(ev.kind).toBe(8);
    expect(verifyEvent(ev)).toBe(true);
    expect(ev.tags).toEqual([['a', badgeAddress(issuer, 'first_note')], ['p', recipient]]);
    expect(achievementFromD('tamagostrich-first_note')).toBe('first_note');
  });
});
