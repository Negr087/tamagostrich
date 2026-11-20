import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceFromLightningAddress } from '@/lib/lnurl';
import { payInvoiceViaNwc, NwcPaymentError } from '@/lib/nwc';
import { REWARD_MILESTONES, REWARDS_ENABLED } from '@/lib/rewardMilestones';
import { queryLatest } from '@/lib/relayQuery';
import { isProgressConsistent } from '@/lib/progression';
import { checkIdentity, REWARD_RULES } from '@/lib/identityChecks';
import * as ledger from '@/lib/rewardLedger';

// Vercel Pro: up to 60s. Hobby: capped at 10s regardless of this value.
export const maxDuration = 30;

const MILESTONE_MAP = Object.fromEntries(REWARD_MILESTONES.map((m) => [m.id, m]));
const PUBKEY_RE = /^[0-9a-f]{64}$/;


function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/claim-reward?pubkey=<hex> → milestones already claimed (server ledger is the
// source of truth; the client merges this into its local state).
export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get('pubkey') ?? '';
  if (!PUBKEY_RE.test(pubkey)) return error('Invalid pubkey', 400);
  if (!ledger.isLedgerConfigured()) return NextResponse.json({ claimed: [] });
  try {
    const claims = await ledger.getClaims(pubkey);
    return NextResponse.json({ claimed: Object.keys(claims) });
  } catch {
    return error('Ledger unavailable', 503);
  }
}

export async function POST(req: NextRequest) {
  if (!REWARDS_ENABLED) return error('Sats rewards are paused', 503);
  const nwcString = process.env.NWC_CONNECTION_STRING;
  // Without a ledger there is no way to prevent double payments — refuse to pay.
  if (!nwcString || !ledger.isLedgerConfigured()) {
    return error('Rewards not configured on this server', 503);
  }

  let body: { pubkey?: unknown; milestone?: unknown };
  try {
    body = await req.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const { pubkey, milestone } = body;
  if (typeof pubkey !== 'string' || !PUBKEY_RE.test(pubkey)) return error('Invalid pubkey', 400);
  if (typeof milestone !== 'string' || !(milestone in MILESTONE_MAP)) return error('Unknown milestone', 400);

  const config = MILESTONE_MAP[milestone];

  // Cheap early exit before hitting relays.
  try {
    const claims = await ledger.getClaims(pubkey);
    if (claims[milestone]) return error('You already claimed this reward', 409);
  } catch {
    return error('Ledger unavailable, try again later', 503);
  }

  // ── 1. Fetch pet state + profile (signatures verified, author enforced) ──
  const [petEvent, profileEvent] = await Promise.all([
    queryLatest({ kinds: [30078], authors: [pubkey], '#d': ['tamagostrich-pet-state'], limit: 1 }, { author: pubkey }),
    queryLatest({ kinds: [0], authors: [pubkey], limit: 1 }, { author: pubkey }),
  ]);

  if (!petEvent) {
    return error('No pet state found on Nostr. Keep playing to sync your progress!', 403);
  }

  let goals: Record<string, unknown> | undefined;
  try {
    goals = (JSON.parse(petEvent.content) as { goals?: Record<string, unknown> }).goals;
  } catch {
    return error('Could not parse pet state', 422);
  }

  const userLevel = typeof goals?.level === 'number' ? goals.level : 0;
  const userStreak = typeof goals?.streakDays === 'number' ? goals.streakDays : 0;

  if (config.requiredLevel !== undefined) {
    if (userLevel < config.requiredLevel) {
      return error(`You need level ${config.requiredLevel} (you are level ${userLevel})`, 403);
    }
    // Reject hand-crafted states where level/XP don't add up.
    if (!goals || !isProgressConsistent(goals as Parameters<typeof isProgressConsistent>[0])) {
      return error('Pet state is inconsistent', 403);
    }
  }
  if (config.requiredStreak !== undefined && userStreak < config.requiredStreak) {
    return error(`You need a ${config.requiredStreak}-day streak (you have ${userStreak})`, 403);
  }

  // ── 2. Identity checks (anti-sybil) ──────────────────────────────
  const identity = await checkIdentity(pubkey, profileEvent?.content);
  if (!identity.lud16) {
    return error(
      'No lightning address (lud16) found in your Nostr profile. Add one in your profile settings to receive sats.',
      400,
    );
  }
  if (identity.requireNip05 && !identity.nip05Verified) {
    return error('A verified NIP-05 identifier is required to claim rewards', 403);
  }
  if (identity.followers < identity.minFollowers) {
    return error(
      `You need at least ${identity.minFollowers} followers to claim rewards (found ${identity.followers})`,
      403,
    );
  }
  const lud16 = identity.lud16;

  // ── 3. Atomically reserve the claim + daily budget ───────────────
  let reservation: ledger.ReserveResult;
  try {
    reservation = await ledger.reserveClaim(pubkey, milestone, config.sats, REWARD_RULES.dailyCapSats);
  } catch {
    return error('Ledger unavailable, try again later', 503);
  }
  if (reservation === 'already_claimed') return error('You already claimed this reward', 409);
  if (reservation === 'daily_cap_reached') {
    return error('Daily reward budget reached — try again tomorrow', 429);
  }

  // ── 4. Resolve LNURL → BOLT11 invoice (amount verified) ──────────
  let invoice: string;
  try {
    invoice = await getInvoiceFromLightningAddress(lud16, config.sats);
  } catch (e: unknown) {
    await ledger.release(pubkey, milestone, config.sats).catch(() => {});
    const msg = e instanceof Error ? e.message : String(e);
    return error(`Could not get invoice: ${msg}`, 502);
  }

  // ── 5. Pay via NWC ───────────────────────────────────────────────
  try {
    await payInvoiceViaNwc(invoice, nwcString);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof NwcPaymentError && !e.maybePaid) {
      await ledger.release(pubkey, milestone, config.sats).catch(() => {});
      return error(`Payment failed: ${msg}`, 502);
    }
    // Outcome unknown: keep the claim locked so it can never be paid twice.
    await ledger.markUncertain(pubkey, milestone, config.sats, msg).catch(() => {});
    return NextResponse.json(
      { pending: true, message: 'Payment is being processed. If you do not receive it, contact the organizers.' },
      { status: 202 },
    );
  }

  await ledger.markPaid(pubkey, milestone, config.sats).catch((e) => {
    console.error('[claim-reward] paid but could not update ledger (claim stays pending):', e);
  });
  return NextResponse.json({ success: true, sats: config.sats, lud16 });
}
