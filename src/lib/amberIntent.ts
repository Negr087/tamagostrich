'use client';

// Amber intent (nostrsigner:) integration for Android.
// Instead of relay-based NIP-46, this opens Amber directly via Android deep link.
// Amber signs the event and redirects back to the app with the result in the URL.

const PENDING_KEY = 'amber_intent_pending';

export interface AmberPending {
  action: 'login' | 'sign';
  source?: string; // e.g. 'share_modal'
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

// Build a clean callback URL without query params (Amber appends ?pubkey=... or ?event=...)
function callbackUrl(action: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?amber_cb=${action}`;
}

export function openAmberLogin() {
  savePending({ action: 'login', timestamp: Date.now() });
  window.location.href = `nostrsigner:get_public_key?callbackUrl=${encodeURIComponent(callbackUrl('login'))}`;
}

// btoa() only handles Latin1; encode as UTF-8 bytes first to support emojis and accents
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export function openAmberSign(unsignedEvent: object, source = 'unknown') {
  const payload = toBase64(JSON.stringify(unsignedEvent));
  savePending({ action: 'sign', source, unsignedEvent, timestamp: Date.now() });
  window.location.href = `nostrsigner:sign_event?payload=${payload}&callbackUrl=${encodeURIComponent(callbackUrl('sign'))}`;
}

// Parse what Amber returned in the URL. Called on app load to detect callbacks.
export interface AmberCallbackResult {
  action: string;
  pubkey?: string;   // hex pubkey, for 'login'
  event?: object;    // signed event object, for 'sign'
}

export function parseAmberCallback(): AmberCallbackResult | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const action = params.get('amber_cb');
  if (!action) return null;

  let pubkey: string | undefined;
  let event: object | undefined;

  // Amber can use 'pubkey', 'result', or 'npub' for get_public_key
  const pubkeyRaw = params.get('pubkey') ?? params.get('result') ?? undefined;
  if (pubkeyRaw) {
    // Might be npub-encoded — decode to hex if needed
    if (pubkeyRaw.startsWith('npub')) {
      try {
        const { nip19 } = require('nostr-tools');
        const decoded = nip19.decode(pubkeyRaw);
        pubkey = decoded.type === 'npub' ? (decoded.data as string) : pubkeyRaw;
      } catch { pubkey = pubkeyRaw; }
    } else {
      pubkey = pubkeyRaw;
    }
  }

  // Amber can use 'event' or 'result' for sign_event
  const eventRaw = params.get('event') ?? params.get('result') ?? undefined;
  if (eventRaw && action === 'sign') {
    try {
      // Decode UTF-8 base64 (handles emojis and non-Latin1 chars)
      const bytes = Uint8Array.from(atob(eventRaw), c => c.charCodeAt(0));
      event = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      try { event = JSON.parse(atob(eventRaw)); } catch {
        try { event = JSON.parse(eventRaw); } catch {}
      }
    }
  }

  return { action, pubkey, event };
}

// Remove Amber params from the URL without a page reload
export function cleanAmberUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  ['amber_cb', 'pubkey', 'event', 'result', 'npub'].forEach(k => url.searchParams.delete(k));
  window.history.replaceState({}, '', url.toString());
}
