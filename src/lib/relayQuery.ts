// Server-side relay queries (API routes). Uses `ws` directly to avoid NDK on the server.
// Every returned event has a verified signature — relays are untrusted.
import WebSocket from 'ws';
import { verifyEvent, type Event as NostrEvent, type Filter } from 'nostr-tools';

export const SERVER_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://purplepag.es',
];

function queryRelay(relayUrl: string, filter: Filter, timeoutMs: number): Promise<NostrEvent[]> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      resolve([]);
      return;
    }

    const subId = `q-${Math.random().toString(36).slice(2, 10)}`;
    const events: NostrEvent[] = [];
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch {}
      resolve(events);
    };

    const timer = setTimeout(done, timeoutMs);

    ws.on('open', () => ws.send(JSON.stringify(['REQ', subId, filter])));
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as unknown[];
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          const ev = msg[2] as NostrEvent;
          if (verifyEvent(ev)) events.push(ev);
        } else if (msg[0] === 'EOSE' && msg[1] === subId) {
          done();
        }
      } catch {}
    });
    ws.on('error', done);
    ws.on('close', done);
  });
}

// All matching events from all relays, deduplicated by id and signature-verified.
export async function queryEvents(
  filter: Filter,
  { relays = SERVER_RELAYS, timeoutMs = 5000 }: { relays?: string[]; timeoutMs?: number } = {},
): Promise<NostrEvent[]> {
  const results = await Promise.all(relays.map((r) => queryRelay(r, filter, timeoutMs)));
  const byId = new Map<string, NostrEvent>();
  for (const ev of results.flat()) byId.set(ev.id, ev);
  return [...byId.values()];
}

// Most recent matching event across all relays (for replaceable events like kind 0 / 30078).
// Pass `author` to also enforce the event pubkey (filters are only a hint to the relay).
export async function queryLatest(
  filter: Filter,
  opts: { relays?: string[]; timeoutMs?: number; author?: string } = {},
): Promise<NostrEvent | null> {
  let events = await queryEvents(filter, opts);
  if (opts.author) events = events.filter((e) => e.pubkey === opts.author);
  if (events.length === 0) return null;
  return events.reduce((best, ev) => (ev.created_at > best.created_at ? ev : best));
}

// Keep only the newest event per pubkey (replaceable events from many authors).
export function latestPerAuthor(events: NostrEvent[]): NostrEvent[] {
  const byPubkey = new Map<string, NostrEvent>();
  for (const ev of events) {
    const existing = byPubkey.get(ev.pubkey);
    if (!existing || ev.created_at > existing.created_at) byPubkey.set(ev.pubkey, ev);
  }
  return [...byPubkey.values()];
}

// Publish many events over ONE connection per relay. Resolves with, per event id, how many
// relays accepted it (OK true). Never rejects.
export async function publishEvents(
  events: NostrEvent[],
  { relays = SERVER_RELAYS, timeoutMs = 8000 }: { relays?: string[]; timeoutMs?: number } = {},
): Promise<Map<string, number>> {
  const accepted = new Map<string, number>(events.map((e) => [e.id, 0]));
  if (events.length === 0) return accepted;

  await Promise.all(relays.map((relayUrl) => new Promise<void>((resolve) => {
    let ws: WebSocket;
    try { ws = new WebSocket(relayUrl); } catch { resolve(); return; }
    const pending = new Set(events.map((e) => e.id));
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch {}
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    ws.on('open', () => { for (const ev of events) ws.send(JSON.stringify(['EVENT', ev])); });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as unknown[];
        if (msg[0] !== 'OK' || typeof msg[1] !== 'string' || !pending.has(msg[1])) return;
        pending.delete(msg[1]);
        if (msg[2] === true) accepted.set(msg[1], (accepted.get(msg[1]) ?? 0) + 1);
        if (pending.size === 0) done();
      } catch {}
    });
    ws.on('error', done);
    ws.on('close', done);
  })));

  return accepted;
}
