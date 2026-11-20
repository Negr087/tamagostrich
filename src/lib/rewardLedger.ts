// Server-side reward ledger — the single source of truth for "was this reward paid?".
//
// The pet state on Nostr is signed by the user, so it can never be trusted to say whether a
// reward was already claimed. This ledger lives in Redis (Upstash REST API, works on Vercel
// serverless without extra deps) and uses HSETNX so concurrent requests on different
// instances can't both reserve the same claim.
//
// Env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//      (or KV_REST_API_URL + KV_REST_API_TOKEN, as set by the Vercel Marketplace integration)

export type ClaimStatus = 'pending' | 'paid' | 'uncertain';

interface ClaimRecord {
  status: ClaimStatus;
  sats: number;
  at: number; // unix seconds
  note?: string;
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function isLedgerConfigured(): boolean {
  return redisConfig() !== null;
}

async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const cfg = redisConfig();
  if (!cfg) throw new Error('Reward ledger not configured');
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const data = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(`Ledger error: ${data.error ?? res.status}`);
  return data.result as T;
}

const claimsKey = (pubkey: string) => `tg:claims:${pubkey}`;
const dailyKey = (day = new Date().toISOString().slice(0, 10)) => `tg:paid:${day}`;

// Milestones already claimed (paid, in progress, or with an uncertain payment outcome).
export async function getClaims(pubkey: string): Promise<Record<string, ClaimRecord>> {
  const flat = await redis<string[]>('HGETALL', claimsKey(pubkey));
  const out: Record<string, ClaimRecord> = {};
  for (let i = 0; i + 1 < (flat?.length ?? 0); i += 2) {
    try { out[flat[i]] = JSON.parse(flat[i + 1]) as ClaimRecord; } catch {}
  }
  return out;
}

export type ReserveResult = 'reserved' | 'already_claimed' | 'daily_cap_reached';

// Atomically reserve a claim and the daily budget. Must be followed by markPaid /
// markUncertain / release.
export async function reserveClaim(
  pubkey: string,
  milestone: string,
  sats: number,
  dailyCapSats: number,
): Promise<ReserveResult> {
  const record: ClaimRecord = { status: 'pending', sats, at: Math.floor(Date.now() / 1000) };
  const set = await redis<number>('HSETNX', claimsKey(pubkey), milestone, JSON.stringify(record));
  if (set !== 1) return 'already_claimed';

  const key = dailyKey();
  const total = await redis<number>('INCRBY', key, sats);
  await redis('EXPIRE', key, 60 * 60 * 48);
  if (total > dailyCapSats) {
    await release(pubkey, milestone, sats);
    return 'daily_cap_reached';
  }
  return 'reserved';
}

async function update(pubkey: string, milestone: string, record: ClaimRecord) {
  await redis('HSET', claimsKey(pubkey), milestone, JSON.stringify(record));
}

export async function markPaid(pubkey: string, milestone: string, sats: number) {
  await update(pubkey, milestone, { status: 'paid', sats, at: Math.floor(Date.now() / 1000) });
}

// Payment may or may not have gone through (e.g. NWC timeout after the request reached the
// wallet). Keep the claim locked so it can't be paid twice; resolve manually if needed.
export async function markUncertain(pubkey: string, milestone: string, sats: number, note: string) {
  await update(pubkey, milestone, { status: 'uncertain', sats, at: Math.floor(Date.now() / 1000), note });
}

// Payment definitely did not happen — free the claim and the daily budget so the user can retry.
export async function release(pubkey: string, milestone: string, sats: number) {
  await redis('HDEL', claimsKey(pubkey), milestone);
  await redis('DECRBY', dailyKey(), sats);
}

// ── Generic "only once" markers (used for NIP-58 badge awards) ──────────

// Returns true if this caller got the marker (first time), false if it already existed.
// Without a configured ledger, always returns true (callers must dedupe some other way).
export async function markOnce(namespace: string, pubkey: string, id: string): Promise<boolean> {
  if (!isLedgerConfigured()) return true;
  const set = await redis<number>('HSETNX', `tg:${namespace}:${pubkey}`, id, String(Math.floor(Date.now() / 1000)));
  return set === 1;
}

export async function unmarkOnce(namespace: string, pubkey: string, id: string): Promise<void> {
  if (!isLedgerConfigured()) return;
  await redis('HDEL', `tg:${namespace}:${pubkey}`, id);
}
