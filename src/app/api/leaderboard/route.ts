import { NextResponse } from 'next/server';
import WebSocket from 'ws';

export const maxDuration = 15;

function fetchFromRelay(
  relayUrl: string,
  filter: object,
  timeoutMs = 6000,
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      resolve([]);
      return;
    }

    const subId = `lb-${Math.random().toString(36).slice(2, 8)}`;
    const events: Record<string, unknown>[] = [];

    const done = () => {
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
          events.push(msg[2] as Record<string, unknown>);
        } else if (msg[0] === 'EOSE') {
          done();
        }
      } catch {}
    });

    ws.on('error', () => done());
    ws.on('close', () => done());
  });
}

export async function GET() {
  const relays = [
    'wss://relay.primal.net',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.damus.io',
    'wss://purplepag.es',
  ];

  const filter = {
    kinds: [30078],
    '#d': ['tamagostrich-pet-state'],
    limit: 200,
  };

  const results = await Promise.all(relays.map((r) => fetchFromRelay(r, filter)));
  const allEvents = results.flat();

  // Deduplicate — keep latest event per pubkey
  const byPubkey = new Map<string, Record<string, unknown>>();
  for (const ev of allEvents) {
    const pk = ev.pubkey as string;
    const existing = byPubkey.get(pk);
    if (!existing || (ev.created_at as number) > (existing.created_at as number)) {
      byPubkey.set(pk, ev);
    }
  }

  const entries: { pubkey: string; level: number; streak: number; animalType: string; updatedAt: number }[] = [];

  for (const [pubkey, ev] of byPubkey) {
    try {
      const payload = JSON.parse(ev.content as string) as Record<string, unknown>;
      const goals = payload.goals as Record<string, unknown> | undefined;
      const appearance = payload.appearance as Record<string, unknown> | undefined;
      const level = (goals?.level as number) ?? 1;
      const streak = (goals?.streakDays as number) ?? 0;
      const animalType = (appearance?.animalType as string) ?? 'ostrich';
      if (level <= 1 && streak === 0) continue;
      entries.push({ pubkey, level, streak, animalType, updatedAt: ev.created_at as number });
    } catch { continue; }
  }

  entries.sort((a, b) => b.level - a.level || b.streak - a.streak);

  return NextResponse.json({ entries: entries.slice(0, 20) });
}
