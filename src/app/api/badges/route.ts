import { NextRequest, NextResponse } from 'next/server';
import type { Event as NostrEvent } from 'nostr-tools';
import { queryEvents, queryLatest, publishEvents } from '@/lib/relayQuery';
import { isProgressConsistent } from '@/lib/progression';
import { eligibleAchievements, INITIAL_COUNTS, type ActionCounts } from '@/lib/achievements';
import {
  getIssuerPubkey, badgeD, badgeAddress, achievementFromD, findAchievement,
  buildBadgeDefinition, buildBadgeAward,
} from '@/lib/badgeIssuer';
import { markOnce, unmarkOnce } from '@/lib/rewardLedger';

export const maxDuration = 30;

const PUBKEY_RE = /^[0-9a-f]{64}$/;

export interface AwardedBadge {
  id: string;      // achievement id
  a: string;       // 30009:<issuer>:<d>
  eventId: string; // kind 8 award event id
}

// GET /api/badges → issuer info (so the client knows whether badges are enabled)
export async function GET() {
  const issuer = getIssuerPubkey();
  return NextResponse.json({ configured: !!issuer, issuer });
}

// Existing awards from this issuer to `pubkey`, keyed by achievement id.
async function existingAwards(issuer: string, pubkey: string): Promise<Map<string, AwardedBadge>> {
  const events = await queryEvents({ kinds: [8], authors: [issuer], '#p': [pubkey] });
  const out = new Map<string, AwardedBadge>();
  for (const ev of events) {
    if (ev.pubkey !== issuer) continue;
    const a = ev.tags.find((t) => t[0] === 'a')?.[1];
    const id = a ? achievementFromD(a.split(':').slice(2).join(':')) : null;
    if (a && id && !out.has(id)) out.set(id, { id, a, eventId: ev.id });
  }
  return out;
}

// POST /api/badges { pubkey } → award NIP-58 badges for every achievement the user's signed
// pet state backs. Idempotent: already-awarded badges are returned, not re-issued.
export async function POST(req: NextRequest) {
  const issuer = getIssuerPubkey();
  if (!issuer) return NextResponse.json({ error: 'Badges not configured on this server' }, { status: 503 });

  let pubkey: unknown;
  try { ({ pubkey } = await req.json()); } catch {}
  if (typeof pubkey !== 'string' || !PUBKEY_RE.test(pubkey)) {
    return NextResponse.json({ error: 'Invalid pubkey' }, { status: 400 });
  }

  const [petEvent, already] = await Promise.all([
    queryLatest({ kinds: [30078], authors: [pubkey], '#d': ['tamagostrich-pet-state'], limit: 1 }, { author: pubkey }),
    existingAwards(issuer, pubkey),
  ]);
  if (!petEvent) return NextResponse.json({ error: 'No pet state found on Nostr' }, { status: 404 });

  let goals: Record<string, unknown> | undefined;
  try { goals = (JSON.parse(petEvent.content) as { goals?: Record<string, unknown> }).goals; } catch {}
  if (!goals || !isProgressConsistent(goals as Parameters<typeof isProgressConsistent>[0])) {
    return NextResponse.json({ error: 'Pet state is inconsistent' }, { status: 422 });
  }

  // Only achievements the user claims AND whose rule holds for their counts/level/streak.
  const counts: ActionCounts = { ...INITIAL_COUNTS };
  for (const [k, v] of Object.entries((goals.actionCounts as Record<string, unknown>) ?? {})) {
    if (k in counts && typeof v === 'number' && Number.isFinite(v)) counts[k] = v;
  }
  const backed = new Set(eligibleAchievements({
    level: goals.level as number,
    actionCounts: counts,
    streakDays: typeof goals.streakDays === 'number' ? goals.streakDays : 0,
  }));
  const claimed = Array.isArray(goals.unlockedAchievements) ? goals.unlockedAchievements as unknown[] : [];
  const toAward = claimed
    .filter((id): id is string => typeof id === 'string' && backed.has(id) && !already.has(id))
    .filter((id, i, arr) => arr.indexOf(id) === i);

  // Reserve each award so concurrent requests don't double-issue.
  const reserved: string[] = [];
  for (const id of toAward) {
    try { if (await markOnce('badges', pubkey, id)) reserved.push(id); } catch { /* ledger down: skip */ }
  }

  // Publish missing definitions first, then the awards.
  const origin = req.nextUrl.origin;
  const defs = reserved.length
    ? await queryEvents({ kinds: [30009], authors: [issuer], '#d': reserved.map(badgeD) })
    : [];
  const definedDs = new Set(defs.filter((e) => e.pubkey === issuer).map((e) => e.tags.find((t) => t[0] === 'd')?.[1]));

  const definitionEvents: NostrEvent[] = [];
  for (const id of reserved) {
    const a = findAchievement(id);
    if (a && !definedDs.has(badgeD(id))) definitionEvents.push(buildBadgeDefinition(a, origin));
  }
  if (definitionEvents.length) await publishEvents(definitionEvents);

  const awardEvents = reserved.map((id) => ({ id, ev: buildBadgeAward(issuer, id, pubkey as string) }));
  const accepted = await publishEvents(awardEvents.map((x) => x.ev));

  const awarded: AwardedBadge[] = [];
  for (const { id, ev } of awardEvents) {
    if ((accepted.get(ev.id) ?? 0) > 0) {
      awarded.push({ id, a: badgeAddress(issuer, id), eventId: ev.id });
    } else {
      await unmarkOnce('badges', pubkey, id).catch(() => {}); // let the user retry
    }
  }

  return NextResponse.json({
    issuer,
    awarded,
    all: [...already.values(), ...awarded],
  });
}
