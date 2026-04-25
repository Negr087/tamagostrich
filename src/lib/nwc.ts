import WebSocket from 'ws';
import { nip04, finalizeEvent } from 'nostr-tools';

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
}

interface NwcConfig {
  walletPubkey: string;
  relayUrl: string;
  secret: string;
}

function parseNwcString(nwcString: string): NwcConfig {
  const withoutScheme = nwcString.replace('nostr+walletconnect://', 'https://');
  const url = new URL(withoutScheme);
  return {
    walletPubkey: url.hostname,
    relayUrl: url.searchParams.get('relay')!,
    secret: url.searchParams.get('secret')!,
  };
}

interface AttemptResult {
  ok: boolean;
  error?: string;
  delivered: boolean;
}

function wsAttempt(
  reqEvent: ReturnType<typeof finalizeEvent>,
  relayUrl: string,
  walletPubkey: string,
  secret: string,
  sendRequest: boolean,
  timeoutMs: number,
): Promise<AttemptResult> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      resolve({ ok: false, error: 'Cannot connect to NWC relay', delivered: false });
      return;
    }

    // Optimistic delivered: set true on send, cleared to false if relay explicitly rejects
    let delivered = false;
    let settled = false;

    function settle(r: AttemptResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch {}
      resolve(r);
    }

    const timer = setTimeout(
      () => settle({ ok: false, error: 'NWC timeout — wallet did not respond in time', delivered }),
      timeoutMs,
    );

    ws.on('open', () => {
      const since = reqEvent.created_at - 1;
      // Primary: strict filter by request event id (NIP-47 compliant wallets)
      ws.send(JSON.stringify([
        'REQ', 'nwc-r',
        { kinds: [23195], '#e': [reqEvent.id], authors: [walletPubkey], limit: 1 },
      ]));
      // Fallback: broad filter — catches wallets that omit the #e tag in responses
      ws.send(JSON.stringify([
        'REQ', 'nwc-r2',
        { kinds: [23195], authors: [walletPubkey], since, limit: 5 },
      ]));
      if (sendRequest) {
        ws.send(JSON.stringify(['EVENT', reqEvent]));
        delivered = true; // optimistic until relay sends OK false
        console.log('[nwc] event sent, id:', reqEvent.id);
      }
    });

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as unknown[];
        const type = msg[0] as string;

        // Relay confirmed or rejected our event
        if (type === 'OK' && sendRequest && msg[1] === reqEvent.id) {
          if (msg[2] === false) {
            const reason = (msg[3] as string) ?? 'unknown';
            console.error('[nwc] relay rejected event:', reason);
            delivered = false;
            settle({ ok: false, error: `Relay rejected payment event: ${reason}`, delivered: false });
          } else {
            console.log('[nwc] relay accepted event — waiting for wallet response');
          }
          return;
        }

        // Relay requires NIP-42 auth — we don't support it
        if (type === 'AUTH') {
          console.error('[nwc] relay requires NIP-42 authentication — not supported');
          settle({ ok: false, error: 'NWC relay requires authentication (NIP-42) — use a different relay', delivered: false });
          return;
        }

        // Poll mode: EOSE on primary sub means response is not on relay yet
        if (type === 'EOSE' && msg[1] === 'nwc-r' && !sendRequest) {
          settle({ ok: false, error: 'Payment response not found on relay', delivered });
          return;
        }

        if (type !== 'EVENT' || (msg[2] as Record<string, unknown>)?.kind !== 23195) return;

        const ev = msg[2] as Record<string, unknown>;
        const decrypted = await nip04.decrypt(secret, walletPubkey, ev.content as string);
        const response = JSON.parse(decrypted) as Record<string, unknown>;

        if ((response.result as Record<string, unknown>)?.preimage) {
          console.log('[nwc] payment confirmed by wallet');
          settle({ ok: true, delivered });
        } else {
          const errMsg = (response.error as Record<string, unknown>)?.message as string
            ?? 'Payment rejected by wallet';
          console.error('[nwc] wallet error:', errMsg);
          settle({ ok: false, error: errMsg, delivered });
        }
      } catch (e: unknown) {
        settle({ ok: false, error: `NWC error: ${e instanceof Error ? e.message : String(e)}`, delivered });
      }
    });

    ws.on('error', (err) => {
      console.error('[nwc] websocket error:', err.message);
      settle({ ok: false, error: err.message, delivered });
    });
    ws.on('close', () => {
      settle({ ok: false, error: 'NWC relay connection closed unexpectedly', delivered });
    });
  });
}

export async function payInvoiceViaNwc(invoice: string, nwcString: string): Promise<void> {
  const { walletPubkey, relayUrl, secret } = parseNwcString(nwcString);
  const secretBytes = hexToBytes(secret);

  const encrypted = await nip04.encrypt(
    secret, walletPubkey,
    JSON.stringify({ method: 'pay_invoice', params: { invoice } }),
  );

  const reqEvent = finalizeEvent(
    { kind: 23194, created_at: Math.floor(Date.now() / 1000), tags: [['p', walletPubkey]], content: encrypted },
    secretBytes,
  );

  console.log('[nwc] paying invoice via relay:', relayUrl);
  console.log('[nwc] wallet pubkey:', walletPubkey);

  // Primary attempt: send payment and wait for confirmation
  const first = await wsAttempt(reqEvent, relayUrl, walletPubkey, secret, true, 12000);
  console.log('[nwc] primary result — ok:', first.ok, '| delivered:', first.delivered, '| error:', first.error);
  if (first.ok) return;

  // If event reached relay, poll briefly for a delayed wallet response
  if (first.delivered) {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await wsAttempt(reqEvent, relayUrl, walletPubkey, secret, false, 6000);
    console.log('[nwc] poll result — ok:', poll.ok, '| error:', poll.error);
    if (poll.ok) return;
    // Propagate real wallet rejections (not just timeouts/network gaps)
    if (poll.error && !poll.error.includes('not found') && !poll.error.includes('timeout') && !poll.error.includes('closed')) {
      throw new Error(poll.error);
    }
  }

  throw new Error(first.error ?? 'Payment failed');
}
