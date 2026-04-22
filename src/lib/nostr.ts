import NDK, { NDKEvent, NDKUser, NDKNip07Signer, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { nip19, nip44, nip04, finalizeEvent, SimplePool } from 'nostr-tools';
import type { UnsignedEvent, Event } from 'nostr-tools';

// Popular relays (high availability)
const POPULAR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://purplepag.es',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://nostr.mom',
  'wss://nostr.bitcoiner.social',
  'wss://relay.nostrplebs.com',
];

// Global NDK instance
let ndkInstance: NDK | null = null;
let ndkConnectPromise: Promise<NDK> | null = null;
let userRelaysAdded = false;
let addUserRelaysPromise: Promise<void> | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: [...POPULAR_RELAYS],
    });
    // Pre-warm: start connecting as soon as NDK is first accessed, don't wait
    ndkConnectPromise = ndkInstance.connect(5000).then(() => ndkInstance!).catch(() => ndkInstance!);
  }
  return ndkInstance;
}

export async function connectNDK(): Promise<NDK> {
  const ndk = getNDK(); // triggers pre-warm if not already started
  await ndkConnectPromise;
  return ndk;
}

export function resetUserRelays(): void {
  userRelaysAdded = false;
  addUserRelaysPromise = null;
}

// Fetch user's preferred relays (NIP-65 kind 10002) and add them to NDK.
// Deduped: concurrent callers share the same in-flight fetch.
export async function addUserRelays(pubkey: string): Promise<void> {
  if (userRelaysAdded) return;
  if (!addUserRelaysPromise) {
    addUserRelaysPromise = _addUserRelays(pubkey);
  }
  return addUserRelaysPromise;
}

async function _addUserRelays(pubkey: string): Promise<void> {
  const ndk = getNDK();
  try {
    const relayListEvents = await withTimeout(
      ndk.fetchEvents({ kinds: [10002], authors: [pubkey], limit: 1 }),
      4000
    );
    const relayEvent = Array.from(relayListEvents)[0];
    if (relayEvent) {
      const relayTags = relayEvent.tags.filter(t => t[0] === 'r');
      for (const tag of relayTags) {
        const url = tag[1];
        if (url && url.startsWith('wss://')) {
          try {
            ndk.addExplicitRelay(url);
          } catch {
            // relay already added or invalid
          }
        }
      }
    }
    userRelaysAdded = true;
  } catch {
    // timeout or error — continue with default relays
    userRelaysAdded = true; // don't retry on next call, just use defaults
  }
}

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Login methods
export type LoginMethod = 'extension' | 'nsec' | 'bunker';

export async function loginWithExtension(): Promise<NDKUser | null> {
  if (typeof window === 'undefined') {
    throw new Error('NIP-07 login only works in the browser');
  }

  const ndk = getNDK();

  // Pass NDK to the signer so the returned user is bound to the same instance.
  const signer = new NDKNip07Signer(4000, ndk);
  ndk.signer = signer;

  try {
    // Explicitly request access and wait for the extension to be ready.
    const user = await signer.blockUntilReady();

    // fetchProfile can hang — add a timeout
    try {
      await Promise.race([
        user.fetchProfile(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
    } catch {
      // Profile fetch failed or timed out — continue with basic user info
      console.warn('Profile fetch timed out or failed, continuing with pubkey only');
    }

    return user;
  } catch (error) {
    if (!window.nostr) {
      throw new Error('No NIP-07 extension found. Install Alby or another Nostr extension.');
    }
    throw error;
  }
}

export async function loginWithNsec(nsec: string): Promise<NDKUser | null> {
  let privateKey: string;
  
  try {
    if (nsec.startsWith('nsec')) {
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') throw new Error('Invalid nsec');
      // Convert Uint8Array to hex string
      const bytes = decoded.data as Uint8Array;
      privateKey = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      privateKey = nsec;
    }
  } catch {
    throw new Error('Invalid nsec format');
  }
  
  const ndk = getNDK();
  const signer = new NDKPrivateKeySigner(privateKey);
  ndk.signer = signer;
  
  const user = await signer.user();
  await user.fetchProfile();
  
  return user;
}

// NIP-46 session for remote signing (set after loginWithRemoteSigner)
export interface Nip46Session {
  signerPubkey: string;
  clientSecretHex: string;
  relays: string[];
}

let nip46Session: Nip46Session | null = null;

export function getNip46Session(): Nip46Session | null {
  return nip46Session;
}

export function clearNip46Session(): void {
  nip46Session = null;
}

export function restoreNip46Session(session: Nip46Session): void {
  nip46Session = session;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function loginWithRemoteSigner(
  remotePubkey: string,
  options: Nip46Session
): Promise<NDKUser | null> {
  const ndk = getNDK();
  await ndk.connect(5000);

  // Store session for future signing
  nip46Session = options;

  // Build an NDKUser with the remote pubkey
  const user = ndk.getUser({ pubkey: remotePubkey });

  try {
    await withTimeout(user.fetchProfile(), 8000);
  } catch {
    console.warn('[NIP-46] Profile fetch timed out, continuing with pubkey only');
  }

  return user;
}

// Sign an event via NIP-46 remote signer (used after loginWithRemoteSigner)
export async function signEventViaNip46(
  unsignedEvent: UnsignedEvent
): Promise<Event | null> {
  if (!nip46Session) return null;

  const { signerPubkey, clientSecretHex, relays: sessionRelays } = nip46Session;
  const clientSecretBytes = hexToBytes(clientSecretHex);
  const clientPubkey = (await import('nostr-tools')).getPublicKey(clientSecretBytes);

  const reqId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const { pubkey: _pubkey, ...eventTemplate } = unsignedEvent as any;
  const request = JSON.stringify({ id: reqId, method: 'sign_event', params: [eventTemplate] });

  let encrypted: string;
  try {
    encrypted = nip44.encrypt(request, nip44.getConversationKey(clientSecretBytes, signerPubkey));
  } catch {
    encrypted = await nip04.encrypt(clientSecretHex, signerPubkey, request);
  }

  const pool = new SimplePool();
  const sinceTs = Math.floor(Date.now() / 1000) - 5;

  const reqEvent = finalizeEvent({
    kind: 24133,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', signerPubkey]],
    content: encrypted,
  }, clientSecretBytes);

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;

    const sub = pool.subscribeMany(
      sessionRelays,
      [{ kinds: [24133], '#p': [clientPubkey], since: sinceTs }] as any,
      {
        async onevent(event) {
          if (event.pubkey !== signerPubkey) return;
          try {
            let decrypted: string;
            try {
              decrypted = nip44.decrypt(event.content, nip44.getConversationKey(clientSecretBytes, signerPubkey));
            } catch {
              decrypted = await nip04.decrypt(clientSecretHex, signerPubkey, event.content);
            }
            const msg = JSON.parse(decrypted);
            if (msg.id === reqId && msg.result) {
              clearTimeout(timer);
              sub.close();
              pool.close(sessionRelays);
              resolve(msg.result as Event);
            }
          } catch {}
        },
      }
    );

    timer = setTimeout(() => {
      sub.close();
      pool.close(sessionRelays);
      resolve(null);
    }, 15000);

    Promise.allSettled(pool.publish(sessionRelays, reqEvent));
  });
}

export async function loginWithBunker(bunkerUrl: string): Promise<NDKUser | null> {
  // bunker://pubkey?relay=wss://relay.nsecbunker.com&secret=optional
  // NDK v3 accepts the full bunker:// URL string directly — don't parse it manually.
  const ndk = getNDK();
  await ndk.connect(5000);

  const { NDKNip46Signer } = await import('@nostr-dev-kit/ndk');

  const localSigner = NDKPrivateKeySigner.generate();
  // Pass the full URL; NDK extracts pubkey, relay, and secret internally.
  const bunkerSigner = new NDKNip46Signer(ndk, bunkerUrl.trim(), localSigner);

  await withTimeout(bunkerSigner.blockUntilReady(), 30000);
  ndk.signer = bunkerSigner;

  const user = await bunkerSigner.user();
  try {
    await withTimeout(user.fetchProfile(), 8000);
  } catch {
    console.warn('Profile fetch timed out or failed');
  }

  return user;
}

// Profile types
export interface NostrProfile {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
}

export function parseProfile(user: NDKUser): NostrProfile {
  const profile = user.profile || {};
  return {
    pubkey: user.pubkey,
    npub: user.npub,
    name: profile.name,
    displayName: (profile.displayName || profile.display_name) as string | undefined,
    about: profile.about as string | undefined,
    picture: (profile.image || profile.picture) as string | undefined,
    banner: profile.banner,
    nip05: profile.nip05,
    lud16: profile.lud16,
    website: profile.website,
  };
}

// Fetch followers count
// Uses nostr.band API (accurate, indexes full social graph) with relay fallback
export async function fetchFollowersCount(pubkey: string): Promise<number> {
  try {
    const npub = nip19.npubEncode(pubkey);
    const res = await fetch(`https://api.nostr.band/v0/stats/profile/${npub}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const count = data?.stats?.[npub]?.followers_pubkey_count;
      if (typeof count === 'number') return count;
    }
  } catch {
    // fall through to relay subscription
  }

  // Fallback: subscription-based count via relays that support #p on kind:3
  const ndk = getNDK();
  await addUserRelays(pubkey);

  return new Promise((resolve) => {
    let count = 0;

    const sub = ndk.subscribe(
      { kinds: [3], '#p': [pubkey] },
      { closeOnEose: false, groupable: false }
    );

    sub.on('event', () => { count++; });

    sub.on('eose', () => {
      clearTimeout(timer);
      sub.stop();
      resolve(count);
    });

    const timer = setTimeout(() => {
      sub.stop();
      resolve(count);
    }, 7000);
  });
}

export async function fetchFollowing(pubkey: string): Promise<string[]> {
  const ndk = getNDK();
  await addUserRelays(pubkey);

  try {
    const user = ndk.getUser({ pubkey });
    const followSet = await withTimeout(user.follows(), 10000);
    return Array.from(followSet).map((u) => u.pubkey);
  } catch {
    console.warn('fetchFollowing timed out');
    return [];
  }
}

// Fetch user's notes
export async function fetchUserNotes(pubkey: string, limit = 50): Promise<NDKEvent[]> {
  const ndk = getNDK();
  await addUserRelays(pubkey);

  return new Promise((resolve) => {
    const events: NDKEvent[] = [];

    const sub = ndk.subscribe(
      { kinds: [1], authors: [pubkey], limit },
      { closeOnEose: true, groupable: false }
    );

    sub.on('event', (event: NDKEvent) => {
      events.push(event);
    });

    sub.on('eose', () => {
      clearTimeout(timer);
      resolve(events.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
    });

    // Resolve with whatever we have after timeout
    const timer = setTimeout(() => {
      sub.stop();
      resolve(events.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
    }, 7000);
  });
}

// ─── PET STATE SYNC (NIP-78 / kind 30078) ────────────────────────

export interface PetStatePayload {
  version: 1;
  stats: { happiness: number; energy: number; social: number };
  lastEventTime: number;
  lastDecayTime: number;
  activityLog: Array<{
    id: string;
    timestamp: number;
    action: string;
    message: string;
    emoji: string;
    senderPubkey?: string;
  }>;
  goals?: {
    xp: number;
    level: number;
    unlockedAchievements: string[];
    actionCounts: Record<string, number>;
    lastActiveDay: string | null;
    streakDays: number;
  };
}

const PET_D_TAG = 'tamagostrich-pet-state';

export async function publishPetState(payload: PetStatePayload): Promise<void> {
  const ndk = getNDK();
  if (!ndk.signer) return;

  const event = new NDKEvent(ndk);
  event.kind = 30078;
  event.content = JSON.stringify(payload);
  event.tags = [['d', PET_D_TAG]];

  try {
    await event.publish();
  } catch (e) {
    console.warn('[pet-sync] publish failed:', e);
  }
}

export async function fetchPetState(pubkey: string): Promise<PetStatePayload | null> {
  const ndk = getNDK();
  try {
    const events = await withTimeout(
      ndk.fetchEvents({ kinds: [30078], '#d': [PET_D_TAG], authors: [pubkey], limit: 1 }),
      8000
    );
    const event = Array.from(events).sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
    if (!event) return null;
    const payload = JSON.parse(event.content) as PetStatePayload;
    if (payload?.version !== 1) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── NIP-57 ZAPS (kind 9735) ────────────────────────────────────────

export interface ZapReceived {
  id: string;
  senderPubkey: string;
  amountSats: number;
  message?: string;
  createdAt: number;
}

// Decode amount (in sats) from a bolt11 invoice's human-readable prefix.
// Format: ln<network><amount><multiplier>1...
// Multipliers relative to 1 BTC (= 100_000_000 sats):
//   m (milli)  = 0.001 BTC = 100_000 sats
//   u (micro)  = 0.000001 BTC = 100 sats
//   n (nano)   = 0.000000001 BTC = 0.1 sats
//   p (pico)   = 0.000000000001 BTC = 0.0001 sats
export function bolt11ToSats(bolt11: string): number {
  const m = bolt11.toLowerCase().match(/^ln[a-z]+?(\d+)([munp])?1/);
  if (!m) return 0;
  const v = parseInt(m[1], 10);
  switch (m[2]) {
    case 'm': return Math.round(v * 100_000);
    case 'u': return Math.round(v * 100);
    case 'n': return Math.round(v * 0.1);
    case 'p': return Math.round(v * 0.0001);
    default:  return v * 100_000_000; // no multiplier = whole BTC (extremely rare)
  }
}

// Parse a kind-9735 zap receipt: extract sender pubkey and amount in sats.
// Priority: description tag (zap request) → P tag; amount tag → bolt11.
export interface ZapParsed {
  senderPubkey: string | undefined;
  amountSats: number;
  message?: string;
}
export function parseZapReceipt(event: NDKEvent): ZapParsed {
  let senderPubkey: string | undefined;
  let amountSats = 0;
  let message: string | undefined;

  try {
    const descTag = event.tags.find((t) => t[0] === 'description');
    if (descTag) {
      const zapReq = JSON.parse(descTag[1]);
      senderPubkey = zapReq.pubkey;
      message = zapReq.content || undefined;
      const amountTag = (zapReq.tags as string[][])?.find((t) => t[0] === 'amount');
      if (amountTag) amountSats = Math.round(parseInt(amountTag[1], 10) / 1000);
    }
  } catch { /* malformed description */ }

  // Fallback for sender: uppercase P tag (some wallets add it as a shortcut)
  if (!senderPubkey) {
    senderPubkey = event.tags.find((t) => t[0] === 'P')?.[1];
  }

  // Fallback for amount: decode bolt11 invoice
  if (amountSats <= 0) {
    const bolt11 = event.tags.find((t) => t[0] === 'bolt11')?.[1];
    if (bolt11) amountSats = bolt11ToSats(bolt11);
  }

  return { senderPubkey, amountSats, message };
}

export async function fetchZapsReceived(pubkey: string, limit = 100): Promise<ZapReceived[]> {
  const ndk = await connectNDK();
  await addUserRelays(pubkey);

  try {
    const events = await Promise.race([
      ndk.fetchEvents({ kinds: [9735], '#p': [pubkey], limit }),
      new Promise<Set<NDKEvent>>((resolve) => setTimeout(() => resolve(new Set()), 8000)),
    ]);

    const zaps: ZapReceived[] = [];
    events.forEach((event: NDKEvent) => {
      const { senderPubkey, amountSats, message } = parseZapReceipt(event);
      zaps.push({
        id: event.id || '',
        senderPubkey: senderPubkey || '',
        amountSats,
        message,
        createdAt: event.created_at || 0,
      });
    });

    return zaps.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

// Batch-fetch kind-0 profiles for a list of pubkeys in a single subscription.
export async function fetchProfilesBatch(pubkeys: string[]): Promise<Record<string, NostrProfile>> {
  if (pubkeys.length === 0) return {};
  const ndk = getNDK();
  const map: Record<string, NostrProfile> = {};

  try {
    const events = await Promise.race([
      ndk.fetchEvents({ kinds: [0], authors: pubkeys }),
      new Promise<Set<NDKEvent>>((resolve) => setTimeout(() => resolve(new Set()), 7000)),
    ]);

    events.forEach((event: NDKEvent) => {
      try {
        const content = JSON.parse(event.content);
        // Build a minimal NDKUser-like object so parseProfile can read it
        const user = ndk.getUser({ pubkey: event.pubkey });
        user.profile = content;
        map[event.pubkey] = parseProfile(user);
      } catch {
        // skip malformed kind-0
      }
    });
  } catch {
    // timeout — return whatever we collected
  }

  return map;
}

// Format pubkey for display
export function formatPubkey(pubkey: string): string {
  const npub = nip19.npubEncode(pubkey);
  return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
}

// Format timestamp
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString();
}
