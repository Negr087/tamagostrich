import { describe, it, expect } from 'vitest';
import type NDK from '@nostr-dev-kit/ndk';
import { WebOfTrust } from './wot';

const hex = (c: string) => c.repeat(64);
const ME = hex('a'), ALICE = hex('b'), BOB = hex('c'), SYBIL = hex('d');

// Fake NDK: ME follows ALICE; ALICE follows BOB. SYBIL is followed by nobody.
const contactLists: Record<string, string[]> = { [ME]: [ALICE], [ALICE]: [BOB] };
let queries = 0;
const fakeNdk = {
  fetchEvents: async (f: { authors?: string[]; '#p'?: string[] }) => {
    queries++;
    const out = new Set<unknown>();
    for (const author of f.authors ?? []) {
      const follows = contactLists[author] ?? [];
      if (f['#p'] && !f['#p'].some(p => follows.includes(p))) continue;
      out.add({ pubkey: author, created_at: 1, tags: follows.map(p => ['p', p]) });
    }
    return out;
  },
} as unknown as NDK;

describe('WebOfTrust', () => {
  const wot = new WebOfTrust(fakeNdk, ME);

  it('classifies hop 1, hop 2, self and strangers', async () => {
    expect(await wot.trustLevel(ALICE)).toBe('follow');
    expect(await wot.trustLevel(BOB)).toBe('friend-of-friend');
    expect(await wot.trustLevel(ME)).toBe('self');
    expect(await wot.trustLevel(SYBIL)).toBe('untrusted');
    expect(await wot.trustLevel(undefined)).toBe('untrusted');
  });

  it('only follows and friends-of-friends feed the pet (not self)', async () => {
    expect(await wot.isTrusted(ALICE)).toBe(true);
    expect(await wot.isTrusted(BOB)).toBe(true);
    expect(await wot.isTrusted(ME)).toBe(false);
    expect(await wot.isTrusted(SYBIL)).toBe(false);
  });

  it('caches lookups per sender', async () => {
    const before = queries;
    await wot.trustLevel(BOB);
    await wot.trustLevel(BOB);
    expect(queries).toBe(before);
  });

  it('trusts nobody when the user follows nobody', async () => {
    const lonely = new WebOfTrust(fakeNdk, SYBIL);
    expect(await lonely.followCount()).toBe(0);
    expect(await lonely.isTrusted(ALICE)).toBe(false);
  });
});
