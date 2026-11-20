// NIP-57 zaps sent from the app ("feed a friend's pet").
// 1. Sign a zap request (kind 9734) with the current signer
// 2. Ask the recipient's LNURL server for an invoice that carries it
// 3. Pay with WebLN when available, otherwise show the invoice (QR / lightning: link)
// 4. Wait for the zap receipt (kind 9735) — the same receipt that feeds their pet
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import {
  fetchLnurlPayData, lnurlEncode, signWithCurrentSigner, getPopularRelays, connectNDK,
} from '@/lib/nostr';
import { bolt11ToMsats } from '@/lib/bolt11';

export interface PreparedZap {
  invoice: string;
  amountSats: number;
}

export async function prepareZap(opts: {
  recipientPubkey: string;
  lud16?: string;
  lud06?: string;
  amountSats: number;
  comment: string;
  onSigningPending?: () => void;
}): Promise<PreparedZap> {
  const pay = await fetchLnurlPayData(opts.lud16, opts.lud06);
  if (!pay.allowsNostr || !pay.nostrPubkey) {
    throw new Error('This lightning address does not support Nostr zaps');
  }
  const msats = opts.amountSats * 1000;
  if (msats < pay.minSendable || msats > pay.maxSendable) {
    throw new Error(`Amount out of range (${pay.minSendable / 1000}–${pay.maxSendable / 1000} sats)`);
  }

  const lnurl = lnurlEncode(pay.endpoint);
  const zapRequest = await signWithCurrentSigner({
    kind: 9734,
    content: opts.comment,
    tags: [
      ['relays', ...getPopularRelays()],
      ['amount', String(msats)],
      ['lnurl', lnurl],
      ['p', opts.recipientPubkey],
    ],
  }, opts.onSigningPending);

  const url = new URL(pay.callback);
  url.searchParams.set('amount', String(msats));
  url.searchParams.set('nostr', JSON.stringify(zapRequest));
  url.searchParams.set('lnurl', lnurl);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  const data = await res.json() as { pr?: string; status?: string; reason?: string };
  if (data.status === 'ERROR') throw new Error(data.reason ?? 'Could not get invoice');
  if (!data.pr) throw new Error('No invoice returned');
  // Never pay an invoice for a different amount than the user chose.
  if (bolt11ToMsats(data.pr) !== msats) throw new Error('Invoice amount mismatch');

  return { invoice: data.pr, amountSats: opts.amountSats };
}

// Pay through a WebLN wallet (Alby extension, etc.). Returns false when no WebLN is available
// or the user cancelled, so the caller can fall back to showing the invoice.
export async function payWithWebLN(invoice: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.webln) return false;
  try {
    await window.webln.enable();
    await window.webln.sendPayment(invoice);
    return true;
  } catch {
    return false;
  }
}

// Resolves true when a zap receipt for this exact invoice shows up on relays.
export async function waitForZapReceipt(
  recipientPubkey: string,
  invoice: string,
  timeoutMs = 120_000,
): Promise<boolean> {
  const ndk = await connectNDK();
  const target = invoice.toLowerCase();
  return new Promise((resolve) => {
    const sub = ndk.subscribe(
      { kinds: [9735], '#p': [recipientPubkey], since: Math.floor(Date.now() / 1000) - 300 },
      { closeOnEose: false },
    );
    const finish = (ok: boolean) => { clearTimeout(timer); sub.stop(); resolve(ok); };
    const timer = setTimeout(() => finish(false), timeoutMs);
    sub.on('event', (ev: NDKEvent) => {
      const bolt11 = ev.tags.find((t) => t[0] === 'bolt11')?.[1]?.toLowerCase();
      if (bolt11 === target) finish(true);
    });
  });
}
