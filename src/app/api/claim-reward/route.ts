import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';
import { getInvoiceFromLightningAddress } from '@/lib/lnurl';
import { payInvoiceViaNwc } from '@/lib/nwc';
import { REWARD_MILESTONES } from '@/lib/rewardMilestones';

const MILESTONE_MAP = Object.fromEntries(REWARD_MILESTONES.map((m) => [m.id, m]));

// In-memory lock: prevents concurrent duplicate claims for the same pubkey+milestone.
// Cleared on server restart, but the NIP-78 check below handles that case.
const processing = new Set<string>();

// Fetch the most recent Nostr event matching a filter from multiple relays.
async function fetchNostrEvent(filter: object): Promise<Record<string, unknown> | null> {
  const relays = ['wss://relay.primal.net', 'wss://relay.nostr.band', 'wss://nos.lol'];

  for (const relayUrl of relays) {
    const event = await fetchFromRelay(relayUrl, filter);
    if (event) return event;
  }
  return null;
}

function fetchFromRelay(
  relayUrl: string,
  filter: object,
  timeoutMs = 8000,
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      resolve(null);
      return;
    }

    const subId = `q-${Math.random().toString(36).slice(2, 8)}`;
    let best: Record<string, unknown> | null = null;

    const done = () => {
      clearTimeout(timer);
      try { ws.terminate(); } catch {}
      resolve(best);
    };

    const timer = setTimeout(done, timeoutMs);

    ws.on('open', () => ws.send(JSON.stringify(['REQ', subId, filter])));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as unknown[];
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          const ev = msg[2] as Record<string, unknown>;
          if (!best || (ev.created_at as number) > (best.created_at as number)) best = ev;
        } else if (msg[0] === 'EOSE') {
          done();
        }
      } catch {}
    });

    ws.on('error', () => done());
    ws.on('close', () => done());
  });
}

export async function POST(req: NextRequest) {
  const nwcString = process.env.NWC_CONNECTION_STRING;
  if (!nwcString) {
    return NextResponse.json({ error: 'Rewards not configured on this server' }, { status: 503 });
  }

  let body: { pubkey?: string; milestone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pubkey, milestone } = body;

  if (!pubkey || typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/.test(pubkey)) {
    return NextResponse.json({ error: 'Invalid pubkey' }, { status: 400 });
  }
  if (!milestone || !(milestone in MILESTONE_MAP)) {
    return NextResponse.json({ error: 'Unknown milestone' }, { status: 400 });
  }

  const config = MILESTONE_MAP[milestone];
  const lockKey = `${pubkey}:${milestone}`;

  if (processing.has(lockKey)) {
    return NextResponse.json({ error: 'Request already in progress' }, { status: 429 });
  }
  processing.add(lockKey);

  try {
    // ── 1. Verify level via NIP-78 pet state on Nostr ────────────────
    const petEvent = await fetchNostrEvent({
      kinds: [30078],
      authors: [pubkey],
      '#d': ['tamagostrich-pet-state'],
      limit: 1,
    });

    if (!petEvent) {
      return NextResponse.json(
        { error: 'No pet state found on Nostr. Keep playing to sync your progress!' },
        { status: 403 },
      );
    }

    let petPayload: Record<string, unknown>;
    try {
      petPayload = JSON.parse(petEvent.content as string);
    } catch {
      return NextResponse.json({ error: 'Could not parse pet state' }, { status: 500 });
    }

    const goals = petPayload?.goals as Record<string, unknown> | undefined;
    const userLevel = (goals?.level as number) ?? 0;

    if (userLevel < config.requiredLevel) {
      return NextResponse.json(
        { error: `You need level ${config.requiredLevel} (you are level ${userLevel})` },
        { status: 403 },
      );
    }

    const alreadyClaimed = (goals?.claimedRewards as string[]) ?? [];
    if (alreadyClaimed.includes(milestone)) {
      return NextResponse.json({ error: 'You already claimed this reward' }, { status: 409 });
    }

    // ── 2. Get user's lightning address from kind-0 profile ──────────
    const profileEvent = await fetchNostrEvent({ kinds: [0], authors: [pubkey], limit: 1 });

    let lud16: string | undefined;
    if (profileEvent?.content) {
      try {
        const profile = JSON.parse(profileEvent.content as string) as Record<string, string>;
        lud16 = profile.lud16;
      } catch {}
    }

    if (!lud16) {
      return NextResponse.json(
        {
          error:
            'No lightning address (lud16) found in your Nostr profile. ' +
            'Add one in your profile settings to receive sats.',
        },
        { status: 400 },
      );
    }

    // ── 3. Resolve LNURL → BOLT11 invoice ────────────────────────────
    let invoice: string;
    try {
      invoice = await getInvoiceFromLightningAddress(lud16, config.sats);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Could not get invoice: ${msg}` }, { status: 502 });
    }

    // ── 4. Pay via NWC ────────────────────────────────────────────────
    try {
      await payInvoiceViaNwc(invoice, nwcString);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Payment failed: ${msg}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, sats: config.sats, lud16 });
  } finally {
    processing.delete(lockKey);
  }
}
