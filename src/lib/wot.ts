// Web of Trust (client-side).
//
// Interactions only feed the pet when they come from someone inside the user's social graph:
//   hop 1 — someone the user follows (kind 3)
//   hop 2 — someone followed by at least one of the user's follows
// Throwaway keys and sock-puppet accounts are outside the graph, so they can't farm XP.
//
// Hop 2 is resolved lazily per sender (one relay query asking "does any of my follows list
// this pubkey?") instead of downloading the follows of every follow, which can be 100k+ keys.
import type NDK from '@nostr-dev-kit/ndk';
import type { NDKEvent } from '@nostr-dev-kit/ndk';

export type TrustLevel = 'self' | 'follow' | 'friend-of-friend' | 'untrusted';

const AUTHORS_PER_QUERY = 250; // relays commonly cap `authors` filter size
const QUERY_TIMEOUT_MS = 6000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export class WebOfTrust {
  private follows = new Set<string>();
  private cache = new Map<string, Promise<TrustLevel>>();
  private ready: Promise<void>;

  constructor(private ndk: NDK, readonly owner: string) {
    this.ready = this.loadFollows();
  }

  private async loadFollows() {
    const events = await withTimeout(
      this.ndk.fetchEvents({ kinds: [3], authors: [this.owner], limit: 1 }),
      10000,
      new Set<NDKEvent>(),
    );
    // Newest contact list wins (kind 3 is replaceable)
    let latest: NDKEvent | null = null;
    for (const ev of events) if (!latest || (ev.created_at ?? 0) > (latest.created_at ?? 0)) latest = ev;
    for (const t of latest?.tags ?? []) {
      if (t[0] === 'p' && /^[0-9a-f]{64}$/.test(t[1] ?? '') && t[1] !== this.owner) this.follows.add(t[1]);
    }
  }

  async followCount(): Promise<number> {
    await this.ready;
    return this.follows.size;
  }

  trustLevel(pubkey: string | undefined): Promise<TrustLevel> {
    if (!pubkey) return Promise.resolve('untrusted'); // anonymous (e.g. anon zaps)
    if (pubkey === this.owner) return Promise.resolve('self');
    let cached = this.cache.get(pubkey);
    if (!cached) {
      cached = this.resolve(pubkey);
      this.cache.set(pubkey, cached);
      // Don't cache network failures forever — allow a retry after a minute
      cached.then((lvl) => { if (lvl === 'untrusted') setTimeout(() => this.cache.delete(pubkey), 60_000); });
    }
    return cached;
  }

  // An interaction counts when it comes from inside the graph. Self-interactions don't count
  // (otherwise reacting to your own notes would farm XP).
  async isTrusted(pubkey: string | undefined): Promise<boolean> {
    const lvl = await this.trustLevel(pubkey);
    return lvl === 'follow' || lvl === 'friend-of-friend';
  }

  private async resolve(pubkey: string): Promise<TrustLevel> {
    await this.ready;
    if (this.follows.has(pubkey)) return 'follow';
    if (this.follows.size === 0) return 'untrusted';

    const all = [...this.follows];
    const chunks: string[][] = [];
    for (let i = 0; i < all.length; i += AUTHORS_PER_QUERY) chunks.push(all.slice(i, i + AUTHORS_PER_QUERY));

    const results = await Promise.all(chunks.map((authors) =>
      withTimeout(
        this.ndk.fetchEvents({ kinds: [3], authors, '#p': [pubkey], limit: 1 }),
        QUERY_TIMEOUT_MS,
        new Set<NDKEvent>(),
      ),
    ));
    const vouched = results.some((set) =>
      [...set].some((ev) => this.follows.has(ev.pubkey) && ev.tags.some((t) => t[0] === 'p' && t[1] === pubkey)),
    );
    return vouched ? 'friend-of-friend' : 'untrusted';
  }
}

// Shared instance per logged-in user (UI lookups like "how do I know this person?").
let shared: WebOfTrust | null = null;
export function getWebOfTrust(ndk: NDK, owner: string): WebOfTrust {
  if (!shared || shared.owner !== owner) shared = new WebOfTrust(ndk, owner);
  return shared;
}
