// Server-side identity checks used to make sybil attacks on rewards expensive.
// Throwaway keys are free; a verified NIP-05 and real followers are not.
import { queryEvents } from '@/lib/relayQuery';
import { parseLightningAddress } from '@/lib/lnurl';

const NIP05_RE = /^([a-z0-9._-]+)@([a-z0-9.-]+\.[a-z]{2,})$/i;

// NIP-05: GET https://<domain>/.well-known/nostr.json?name=<local> must map name → pubkey.
export async function verifyNip05(nip05: string | undefined, pubkey: string): Promise<boolean> {
  if (!nip05) return false;
  const m = nip05.trim().toLowerCase().match(NIP05_RE);
  if (!m) return false;
  const [, name, domain] = m;
  try {
    const res = await fetch(
      `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`,
      { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { names?: Record<string, string> };
    return data.names?.[name]?.toLowerCase() === pubkey;
  } catch {
    return false;
  }
}

// Distinct authors whose contact list (kind 3) includes `pubkey`.
// Relays cap results, so this is a lower bound — enough for a minimum-threshold check.
export async function countFollowers(pubkey: string, atLeast: number): Promise<number> {
  const events = await queryEvents(
    { kinds: [3], '#p': [pubkey], limit: Math.max(atLeast * 3, 50) },
    { timeoutMs: 5000 },
  );
  const followers = new Set<string>();
  for (const ev of events) {
    if (ev.pubkey !== pubkey && ev.tags.some((t) => t[0] === 'p' && t[1] === pubkey)) {
      followers.add(ev.pubkey);
    }
  }
  return followers.size;
}

// ── Reward eligibility (shared by /api/eligibility and /api/claim-reward) ──

export const REWARD_RULES = {
  requireNip05: process.env.REWARDS_REQUIRE_NIP05 !== 'false',
  minFollowers: Number(process.env.REWARDS_MIN_FOLLOWERS ?? 10),
  dailyCapSats: Number(process.env.REWARDS_DAILY_CAP_SATS ?? 2100),
};

export interface IdentityReport {
  lud16: string | null;      // valid lightning address from kind 0, or null
  nip05: string | null;      // NIP-05 identifier as declared in kind 0
  nip05Verified: boolean;
  followers: number;         // lower bound (relays cap results)
  requireNip05: boolean;
  minFollowers: number;
  eligible: boolean;
}

export async function checkIdentity(
  pubkey: string,
  profileContent: string | undefined,
): Promise<IdentityReport> {
  let profile: Record<string, unknown> = {};
  try { if (profileContent) profile = JSON.parse(profileContent) as Record<string, unknown>; } catch {}

  const rawLud16 = typeof profile.lud16 === 'string' ? profile.lud16.trim() : '';
  const lud16 = rawLud16 && parseLightningAddress(rawLud16) ? rawLud16 : null;
  const nip05 = typeof profile.nip05 === 'string' && profile.nip05.trim() ? profile.nip05.trim() : null;
  const { requireNip05, minFollowers } = REWARD_RULES;

  const [nip05Verified, followers] = await Promise.all([
    verifyNip05(nip05 ?? undefined, pubkey),
    minFollowers > 0 ? countFollowers(pubkey, minFollowers) : Promise.resolve(0),
  ]);

  const eligible = !!lud16 && (!requireNip05 || nip05Verified) && followers >= minFollowers;
  return { lud16, nip05, nip05Verified, followers, requireNip05, minFollowers, eligible };
}
