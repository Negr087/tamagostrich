'use client';

// Amber intent (NIP-55 / nostrsigner:) integration for Android.
// Ref: https://github.com/greenart7c3/amber + NIP-55 spec
//
// URL format:
//   nostrsigner:<urlencoded-event-json>?compressionType=none&returnType=event&type=sign_event&callbackUrl=<encoded-cb>
//
// Amber appends the result value directly to callbackUrl, so the callbackUrl
// must end with the param name and "=" (e.g. ".../?amber_cb=sign&event=").
// Amber returns: <callbackUrl><url-encoded-result>

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

function callbackBase(action: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?amber_cb=${action}`;
}

export function openAmberLogin() {
  // Callback: Amber appends the pubkey value → ?amber_cb=login&pubkey=<hex>
  const cb = callbackBase('login') + '&pubkey=';
  savePending({ action: 'login', timestamp: Date.now() });
  window.location.href = `nostrsigner:?compressionType=none&returnType=signature&type=get_public_key&callbackUrl=${encodeURIComponent(cb)}`;
}

export function openAmberSign(unsignedEvent: object, source = 'unknown') {
  // Event JSON goes after nostrsigner: (URL-encoded, not base64)
  // Callback: Amber appends the signed event JSON → ?amber_cb=sign&event=<url-encoded-json>
  const eventJson = JSON.stringify(unsignedEvent);
  const cb = callbackBase('sign') + '&event=';
  savePending({ action: 'sign', source, unsignedEvent, timestamp: Date.now() });
  window.location.href = `nostrsigner:${encodeURIComponent(eventJson)}?compressionType=none&returnType=event&type=sign_event&callbackUrl=${encodeURIComponent(cb)}`;
}

export interface AmberCallbackResult {
  action: string;
  pubkey?: string;
  event?: object;
}

export function parseAmberCallback(): AmberCallbackResult | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const action = params.get('amber_cb');
  if (!action) return null;

  let pubkey: string | undefined;
  let event: object | undefined;

  if (action === 'login') {
    const raw = params.get('pubkey') ?? undefined;
    if (raw) {
      if (raw.startsWith('npub')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { nip19 } = require('nostr-tools');
          const decoded = nip19.decode(raw);
          pubkey = decoded.type === 'npub' ? (decoded.data as string) : raw;
        } catch { pubkey = raw; }
      } else {
        pubkey = raw;
      }
    }
  }

  if (action === 'sign') {
    // URLSearchParams already URL-decodes the value — result is plain JSON
    const raw = params.get('event') ?? undefined;
    if (raw) {
      try {
        event = JSON.parse(raw);
      } catch {
        // fallback: older Amber versions may base64-encode the event
        try {
          const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
          event = JSON.parse(new TextDecoder().decode(bytes));
        } catch {}
      }
    }
  }

  return { action, pubkey, event };
}

export function cleanAmberUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  ['amber_cb', 'pubkey', 'event', 'result', 'npub'].forEach(k => url.searchParams.delete(k));
  window.history.replaceState({}, '', url.toString());
}
