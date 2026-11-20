import { NextRequest, NextResponse } from 'next/server';
import { queryLatest } from '@/lib/relayQuery';
import { checkIdentity } from '@/lib/identityChecks';

export const maxDuration = 15;

// GET /api/eligibility?pubkey=<hex> → identity checklist for sats rewards
// (lightning address, verified NIP-05, minimum followers). Same rules as /api/claim-reward.
export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get('pubkey') ?? '';
  if (!/^[0-9a-f]{64}$/.test(pubkey)) {
    return NextResponse.json({ error: 'Invalid pubkey' }, { status: 400 });
  }
  const profileEvent = await queryLatest({ kinds: [0], authors: [pubkey], limit: 1 }, { author: pubkey });
  const report = await checkIdentity(pubkey, profileEvent?.content);
  return NextResponse.json(report, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
