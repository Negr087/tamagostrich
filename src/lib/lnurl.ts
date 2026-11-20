import { bolt11ToMsats } from '@/lib/bolt11';

const LUD16_RE = /^([a-z0-9._+-]+)@([a-z0-9.-]+\.[a-z]{2,})$/i;
const FETCH_TIMEOUT_MS = 8000;

export function parseLightningAddress(lud16: string): { user: string; domain: string } | null {
  const m = lud16.trim().toLowerCase().match(LUD16_RE);
  return m ? { user: m[1], domain: m[2] } : null;
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`LNURL request failed (${res.status})`);
  const data = (await res.json()) as Record<string, unknown>;
  if (data.status === 'ERROR') throw new Error(String(data.reason ?? 'LNURL error'));
  return data;
}

export async function getInvoiceFromLightningAddress(
  lud16: string,
  amountSats: number,
): Promise<string> {
  const addr = parseLightningAddress(lud16);
  if (!addr) throw new Error('Invalid lightning address format');

  const lnurlData = await fetchJson(
    `https://${addr.domain}/.well-known/lnurlp/${encodeURIComponent(addr.user)}`,
  );

  const amountMsats = amountSats * 1000;
  const min = Number(lnurlData.minSendable ?? 1000);
  const max = Number(lnurlData.maxSendable ?? 1_000_000_000_000);
  if (amountMsats < min || amountMsats > max) {
    throw new Error(`Amount ${amountSats} sats out of LNURL range (${min / 1000}–${max / 1000} sats)`);
  }

  let callback: URL;
  try {
    callback = new URL(String(lnurlData.callback));
  } catch {
    throw new Error('Invalid LNURL callback');
  }
  if (callback.protocol !== 'https:') throw new Error('LNURL callback must use https');
  callback.searchParams.set('amount', String(amountMsats));

  const callbackData = await fetchJson(callback.toString());
  const pr = callbackData.pr;
  if (typeof pr !== 'string' || !pr) throw new Error('No invoice returned by lightning address');

  // Never trust the remote server: the wallet pays whatever amount the invoice says.
  if (bolt11ToMsats(pr) !== amountMsats) {
    throw new Error('Invoice amount does not match the requested amount');
  }
  return pr;
}
