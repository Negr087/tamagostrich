'use client';

// Amber intent (NIP-55 / nostrsigner:) integration for Android.
// Ref: https://github.com/greenart7c3/amber + NIP-55 spec
//
// URL format Amber expects:
//   nostrsigner:<urlencoded-event-json>?returnType=event&type=sign_event&pubKey=<npub>&callbackUrl=<encoded-cb>
//
// IMPORTANT: Amber parses params by splitting the decoded URI on "?" first, then "&".
// If callbackUrl contains "?" or "&", Amber truncates it at those chars.
// Solution: use a hash-based callback URL — "#amber-sign" has no "?" or "&".
// Amber appends the result directly: callbackUrl + Uri.encode(result)
// → https://myapp.com/#amber-sign<url-encoded-event-json>
// We detect by checking window.location.hash.startsWith('#amber-sign').

const PENDING_KEY = 'amber_intent_pending';

export interface AmberPending {
  action: 'login' | 'sign';
  source?: string;
  unsignedEvent?: object;
  timestamp: number;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function savePending(pending: AmberPending) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function loadPending(): AmberPending | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearPending() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(PENDING_KEY);
}

const SIGN_HASH = '#amber-sign';
const LOGIN_HASH = '#amber-login';

function origin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function openAmberLogin() {
  // Callback: Amber appends the pubkey → https://myapp.com/#amber-login<hex-pubkey>
  const cb = `${origin()}/${LOGIN_HASH}`;
  savePending({ action: 'login', timestamp: Date.now() });
  window.location.href = `nostrsigner:?returnType=signature&type=get_public_key&callbackUrl=${encodeURIComponent(cb)}`;
}

// hexPubkey is passed as the "pubKey" query param so Amber selects the right account.
export function openAmberSign(unsignedEvent: object, source = 'unknown', hexPubkey?: string) {
  // Amber does Uri.decode(uri).split("?") to separate event JSON from query params.
  // Any "?" in the decoded content (including content from encodeURIComponent) breaks
  // the split. Escaping "?" as the JSON Unicode sequence ? is invisible to
  // split("?") but all JSON parsers decode it back to "?" correctly.
  const eventJson = JSON.stringify(unsignedEvent).replace(/\?/g, '\\u003F');
  // Callback: Amber appends the signed event → https://myapp.com/#amber-sign<url-encoded-json>
  const cb = `${origin()}/${SIGN_HASH}`;

  let pubKeyParam = '';
  if (hexPubkey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { nip19 } = require('nostr-tools');
      pubKeyParam = `&pubKey=${nip19.npubEncode(hexPubkey)}`;
    } catch {
      pubKeyParam = `&pubKey=${hexPubkey}`;
    }
  }

  savePending({ action: 'sign', source, unsignedEvent, timestamp: Date.now() });
  window.location.href =
    `nostrsigner:${encodeURIComponent(eventJson)}?returnType=event&type=sign_event${pubKeyParam}&callbackUrl=${encodeURIComponent(cb)}`;
}

export interface AmberCallbackResult {
  action: 'login' | 'sign';
  pubkey?: string;
  event?: object;
}

// Called on page load. Reads window.location.hash to detect an Amber callback.
export function parseAmberCallback(): AmberCallbackResult | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash; // e.g. "#amber-sign%7B%22id%22...%7D"

  if (hash.startsWith(SIGN_HASH)) {
    const raw = hash.slice(SIGN_HASH.length);
    if (!raw) return null;
    try {
      const event = JSON.parse(decodeURIComponent(raw));
      return { action: 'sign', event };
    } catch { return null; }
  }

  if (hash.startsWith(LOGIN_HASH)) {
    const raw = hash.slice(LOGIN_HASH.length);
    if (!raw) return null;
    try {
      let pubkey = decodeURIComponent(raw);
      if (pubkey.startsWith('npub')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { nip19 } = require('nostr-tools');
        const decoded = nip19.decode(pubkey);
        if (decoded.type === 'npub') pubkey = decoded.data as string;
      }
      return { action: 'login', pubkey };
    } catch { return null; }
  }

  return null;
}

// Remove the amber hash from the URL without a page reload.
export function cleanAmberUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', window.location.pathname + window.location.search);
}
