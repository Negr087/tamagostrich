import { NextResponse } from 'next/server';
import { queryEvents, latestPerAuthor } from '@/lib/relayQuery';
import { isProgressConsistent } from '@/lib/progression';

export const maxDuration = 15;
// Cache the response for 60 s — every request used to open 5 relay connections.
export const revalidate = 60;

interface Entry {
  pubkey: string;
  level: number;
  streak: number;
  animalType: string;
  updatedAt: number;
}

export async function GET() {
  const events = await queryEvents(
    { kinds: [30078], '#d': ['tamagostrich-pet-state'], limit: 500 },
    { timeoutMs: 6000 },
  );

  const entries: Entry[] = [];
  for (const ev of latestPerAuthor(events)) {
    try {
      const payload = JSON.parse(ev.content) as Record<string, unknown>;
      const goals = payload.goals as Record<string, unknown> | undefined;
      const appearance = payload.appearance as Record<string, unknown> | undefined;
      const level = typeof goals?.level === 'number' ? goals.level : 1;
      const streak = typeof goals?.streakDays === 'number' ? goals.streakDays : 0;
      const animalType = typeof appearance?.animalType === 'string' ? appearance.animalType : 'ostrich';
      if (level <= 1 && streak === 0) continue;
      // Skip hand-crafted states whose level isn't backed by their action counts.
      if (!goals || !isProgressConsistent(goals as Parameters<typeof isProgressConsistent>[0])) continue;
      entries.push({ pubkey: ev.pubkey, level, streak, animalType, updatedAt: ev.created_at });
    } catch { continue; }
  }

  entries.sort((a, b) => b.level - a.level || b.streak - a.streak);

  return NextResponse.json({ entries: entries.slice(0, 20) });
}
