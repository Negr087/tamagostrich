import WebSocket from 'ws';
import { nip04, finalizeEvent, getPublicKey } from 'nostr-tools';

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

export async function payInvoiceViaNwc(invoice: string, nwcString: string): Promise<void> {
  const { walletPubkey, relayUrl, secret } = parseNwcString(nwcString);
  const secretBytes = hexToBytes(secret);
  const clientPubkey = getPublicKey(secretBytes);

  const requestContent = JSON.stringify({ method: 'pay_invoice', params: { invoice } });
  const encrypted = await nip04.encrypt(secret, walletPubkey, requestContent);

  const reqEvent = finalizeEvent(
    {
      kind: 23194,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', walletPubkey]],
      content: encrypted,
    },
    secretBytes,
  );

  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch (e) {
      reject(new Error(`Cannot connect to NWC relay: ${relayUrl}`));
      return;
    }

    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('NWC payment timeout (30s)'));
    }, 30000);

    ws.on('open', () => {
      // Subscribe to the wallet's response before publishing the request
      ws.send(
        JSON.stringify([
          'REQ',
          'nwc-resp',
          { kinds: [23195], '#e': [reqEvent.id], authors: [walletPubkey], limit: 1 },
        ]),
      );
      ws.send(JSON.stringify(['EVENT', reqEvent]));
    });

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] !== 'EVENT' || msg[2]?.kind !== 23195) return;

        const decrypted = await nip04.decrypt(secret, walletPubkey, msg[2].content);
        const response = JSON.parse(decrypted);

        clearTimeout(timeout);
        ws.terminate();

        if (response.result?.preimage) {
          resolve();
        } else {
          reject(new Error(response.error?.message ?? 'Payment rejected by wallet'));
        }
      } catch (e: any) {
        clearTimeout(timeout);
        ws.terminate();
        reject(new Error(`NWC response error: ${e.message}`));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`NWC WebSocket error: ${err.message}`));
    });
  });
}
