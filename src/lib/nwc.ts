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
  // true if the payment EVENT was delivered to the relay before any error occurred
  delivered: boolean;
}

// Single WebSocket attempt. When sendRequest=false it only subscribes and waits
// for an existing response (poll mode — used to recover after a dropped connection).
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
      () => settle({ ok: false, error: 'NWC payment timeout', delivered }),
      timeoutMs,
    );

    ws.on('open', () => {
      ws.send(JSON.stringify([
        'REQ', 'nwc-r',
        { kinds: [23195], '#e': [reqEvent.id], authors: [walletPubkey], limit: 1 },
      ]));
      if (sendRequest) {
        ws.send(JSON.stringify(['EVENT', reqEvent]));
        delivered = true;
      }
    });

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // In poll mode, EOSE means the response isn't on the relay yet
        if (msg[0] === 'EOSE' && !sendRequest) {
          settle({ ok: false, error: 'Payment response not found on relay', delivered });
          return;
        }

        if (msg[0] !== 'EVENT' || msg[2]?.kind !== 23195) return;

        const decrypted = await nip04.decrypt(secret, walletPubkey, msg[2].content);
        const response = JSON.parse(decrypted);

        if (response.result?.preimage) {
          settle({ ok: true, delivered });
        } else {
          settle({ ok: false, error: response.error?.message ?? 'Payment rejected by wallet', delivered });
        }
      } catch (e: unknown) {
        settle({ ok: false, error: `NWC response error: ${e instanceof Error ? e.message : String(e)}`, delivered });
      }
    });

    ws.on('error', (err) => settle({ ok: false, error: err.message, delivered }));
    ws.on('close', () => {
      // Closed without a proper response — settle only if not already settled
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

  // Primary attempt: send payment and wait for confirmation
  const first = await wsAttempt(reqEvent, relayUrl, walletPubkey, secret, true, 30000);
  if (first.ok) return;

  // If the payment event reached the relay but the connection dropped (e.g. 502),
  // the wallet may have already processed the payment. Wait briefly then poll.
  const shouldPoll = first.delivered || first.error?.includes('502') || first.error?.includes('closed');
  if (shouldPoll) {
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await wsAttempt(reqEvent, relayUrl, walletPubkey, secret, false, 10000);
    if (poll.ok) return;
  }

  throw new Error(first.error ?? 'Payment failed');
}
