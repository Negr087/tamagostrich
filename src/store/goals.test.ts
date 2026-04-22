import { describe, it, expect } from 'vitest';
import {
  xpToLevel,
  levelProgress,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  XP_PER_ACTION,
  ACHIEVEMENTS,
} from './goals';

// ─── Pure function tests ───────────────────────────────────────────

describe('xpToLevel', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(xpToLevel(0)).toBe(1);
  });

  it('reaches each level exactly at its threshold', () => {
    LEVEL_THRESHOLDS.forEach((threshold, i) => {
      if (i === 0) return;
      expect(xpToLevel(threshold)).toBe(i + 1);
    });
  });

  it('stays at level 1 just below threshold 2', () => {
    expect(xpToLevel(LEVEL_THRESHOLDS[1] - 1)).toBe(1);
  });

  it('caps at MAX_LEVEL (21) even with huge XP', () => {
    expect(xpToLevel(999999)).toBe(MAX_LEVEL);
    expect(MAX_LEVEL).toBe(21);
  });

  it('level 2 at 100 XP', () => {
    expect(xpToLevel(100)).toBe(2);
  });

  it('level 3 at 250 XP', () => {
    expect(xpToLevel(250)).toBe(3);
  });

  it('level 11 at 6600 XP', () => {
    expect(xpToLevel(6600)).toBe(11);
  });

  it('level 21 at 54000 XP', () => {
    expect(xpToLevel(54000)).toBe(21);
  });
});

describe('levelProgress', () => {
  it('returns 0% at the start of a level', () => {
    const { pct } = levelProgress(0, 1);
    expect(pct).toBe(0);
  });

  it('returns 100% at MAX_LEVEL', () => {
    const { pct } = levelProgress(LEVEL_THRESHOLDS[MAX_LEVEL - 1], MAX_LEVEL);
    expect(pct).toBe(100);
  });

  it('returns correct percent midway through level 1 (0→100)', () => {
    const { pct, current, needed } = levelProgress(50, 1);
    expect(needed).toBe(100);
    expect(current).toBe(50);
    expect(pct).toBeCloseTo(50);
  });

  it('returns correct percent midway through level 2 (100→250)', () => {
    const { pct } = levelProgress(175, 2);
    expect(pct).toBeCloseTo(50);
  });

  it('clamps pct to 100 even if XP slightly over threshold', () => {
    const { pct } = levelProgress(LEVEL_THRESHOLDS[MAX_LEVEL - 1] + 500, MAX_LEVEL);
    expect(pct).toBe(100);
  });
});

// ─── XP_PER_ACTION sanity ──────────────────────────────────────────

describe('XP_PER_ACTION', () => {
  it('zap gives the most XP', () => {
    const values = Object.values(XP_PER_ACTION) as number[];
    expect(XP_PER_ACTION.zap_received).toBe(Math.max(...values));
  });

  it('all defined values are positive integers', () => {
    for (const v of Object.values(XP_PER_ACTION) as number[]) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

// ─── Achievements helpers ──────────────────────────────────────────

const BASE_COUNTS = {
  zap_received: 0, note_published: 0, reaction_received: 0,
  repost_received: 0, mention_received: 0, new_follower: 0,
  totalSatsReceived: 0, maxSingleZap: 0,
};
const base = { level: 1, actionCounts: { ...BASE_COUNTS }, streakDays: 0 };

function counts(overrides: Partial<typeof BASE_COUNTS>) {
  return { ...base, actionCounts: { ...BASE_COUNTS, ...overrides } };
}

describe('ACHIEVEMENTS — meta', () => {
  it('every achievement has unique id', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every achievement has both es and en strings', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.nameEs.length).toBeGreaterThan(0);
      expect(a.nameEn.length).toBeGreaterThan(0);
      expect(a.descEs.length).toBeGreaterThan(0);
      expect(a.descEn.length).toBeGreaterThan(0);
    }
  });

  it('no achievements unlock with zero activity', () => {
    const unlocked = ACHIEVEMENTS.filter(a => a.check(base));
    expect(unlocked).toHaveLength(0);
  });
});

describe('ACHIEVEMENTS — primeros pasos', () => {
  it('first_note unlocks at 1 note', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'first_note')!;
    expect(a.check(counts({ note_published: 1 }))).toBe(true);
  });

  it('first_zap unlocks at 1 zap', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'first_zap')!;
    expect(a.check(counts({ zap_received: 1 }))).toBe(true);
  });

  it('first_reaction unlocks at 1 reaction', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'first_reaction')!;
    expect(a.check(counts({ reaction_received: 1 }))).toBe(true);
  });

  it('first_follower unlocks at 1 follower', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'first_follower')!;
    expect(a.check(counts({ new_follower: 1 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — notas', () => {
  it('note_10 does NOT unlock at 9', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'note_10')!;
    expect(a.check(counts({ note_published: 9 }))).toBe(false);
  });

  it('note_10 unlocks at 10', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'note_10')!;
    expect(a.check(counts({ note_published: 10 }))).toBe(true);
  });

  it('note_25 unlocks at 25', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'note_25')!;
    expect(a.check(counts({ note_published: 24 }))).toBe(false);
    expect(a.check(counts({ note_published: 25 }))).toBe(true);
  });

  it('note_100 unlocks at 100', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'note_100')!;
    expect(a.check(counts({ note_published: 99 }))).toBe(false);
    expect(a.check(counts({ note_published: 100 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — zaps (cantidad)', () => {
  it('zap_5 at 5', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'zap_5')!;
    expect(a.check(counts({ zap_received: 4 }))).toBe(false);
    expect(a.check(counts({ zap_received: 5 }))).toBe(true);
  });

  it('zap_25 at 25', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'zap_25')!;
    expect(a.check(counts({ zap_received: 25 }))).toBe(true);
  });

  it('zap_50 at 50', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'zap_50')!;
    expect(a.check(counts({ zap_received: 49 }))).toBe(false);
    expect(a.check(counts({ zap_received: 50 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — zaps (montos)', () => {
  it('zap_1k at maxSingleZap >= 1000', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'zap_1k')!;
    expect(a.check(counts({ maxSingleZap: 999 }))).toBe(false);
    expect(a.check(counts({ maxSingleZap: 1000 }))).toBe(true);
  });

  it('zap_5k at maxSingleZap >= 5000', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'zap_5k')!;
    expect(a.check(counts({ maxSingleZap: 4999 }))).toBe(false);
    expect(a.check(counts({ maxSingleZap: 5000 }))).toBe(true);
  });

  it('zap_10k at maxSingleZap >= 10000', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'zap_10k')!;
    expect(a.check(counts({ maxSingleZap: 9999 }))).toBe(false);
    expect(a.check(counts({ maxSingleZap: 10000 }))).toBe(true);
  });

  it('total_10k at totalSatsReceived >= 10000', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'total_10k')!;
    expect(a.check(counts({ totalSatsReceived: 9999 }))).toBe(false);
    expect(a.check(counts({ totalSatsReceived: 10000 }))).toBe(true);
  });

  it('total_100k at totalSatsReceived >= 100000', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'total_100k')!;
    expect(a.check(counts({ totalSatsReceived: 99999 }))).toBe(false);
    expect(a.check(counts({ totalSatsReceived: 100000 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — reacciones', () => {
  it('reaction_10 at 10', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'reaction_10')!;
    expect(a.check(counts({ reaction_received: 9 }))).toBe(false);
    expect(a.check(counts({ reaction_received: 10 }))).toBe(true);
  });

  it('reaction_100 at 100', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'reaction_100')!;
    expect(a.check(counts({ reaction_received: 100 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — reposts y menciones', () => {
  it('repost_5 at 5', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'repost_5')!;
    expect(a.check(counts({ repost_received: 5 }))).toBe(true);
  });

  it('repost_25 at 25', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'repost_25')!;
    expect(a.check(counts({ repost_received: 25 }))).toBe(true);
  });

  it('mention_25 at 25', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'mention_25')!;
    expect(a.check(counts({ mention_received: 24 }))).toBe(false);
    expect(a.check(counts({ mention_received: 25 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — seguidores', () => {
  it('follower_10 at 10', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'follower_10')!;
    expect(a.check(counts({ new_follower: 10 }))).toBe(true);
  });

  it('follower_100 at 100', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'follower_100')!;
    expect(a.check(counts({ new_follower: 99 }))).toBe(false);
    expect(a.check(counts({ new_follower: 100 }))).toBe(true);
  });
});

describe('ACHIEVEMENTS — rachas', () => {
  it('streak_1 at 1 day', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_1')!;
    expect(a.check({ ...base, streakDays: 0 })).toBe(false);
    expect(a.check({ ...base, streakDays: 1 })).toBe(true);
  });

  it('streak_3 at 3 days', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_3')!;
    expect(a.check({ ...base, streakDays: 2 })).toBe(false);
    expect(a.check({ ...base, streakDays: 3 })).toBe(true);
  });

  it('streak_7 at 7 days', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_7')!;
    expect(a.check({ ...base, streakDays: 6 })).toBe(false);
    expect(a.check({ ...base, streakDays: 7 })).toBe(true);
  });

  it('streak_14 at 14 days', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_14')!;
    expect(a.check({ ...base, streakDays: 13 })).toBe(false);
    expect(a.check({ ...base, streakDays: 14 })).toBe(true);
  });

  it('streak_30 at 30 days', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_30')!;
    expect(a.check({ ...base, streakDays: 29 })).toBe(false);
    expect(a.check({ ...base, streakDays: 30 })).toBe(true);
  });
});

describe('ACHIEVEMENTS — niveles', () => {
  it('level_3 at level 3', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'level_3')!;
    expect(a.check({ ...base, level: 2 })).toBe(false);
    expect(a.check({ ...base, level: 3 })).toBe(true);
  });

  it('level_10 at level 10', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'level_10')!;
    expect(a.check({ ...base, level: 9 })).toBe(false);
    expect(a.check({ ...base, level: 10 })).toBe(true);
  });

  it('level_15 at level 15', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'level_15')!;
    expect(a.check({ ...base, level: 14 })).toBe(false);
    expect(a.check({ ...base, level: 15 })).toBe(true);
  });

  it('level_21 (max) only at level 21', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'level_21')!;
    expect(a.check({ ...base, level: 20 })).toBe(false);
    expect(a.check({ ...base, level: 21 })).toBe(true);
  });
});

describe('ACHIEVEMENTS — especiales', () => {
  it('all_interactions requires all 5 types', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'all_interactions')!;
    // Missing repost
    expect(a.check(counts({ zap_received: 1, reaction_received: 1, mention_received: 1, new_follower: 1 }))).toBe(false);
    // All present
    expect(a.check(counts({ zap_received: 1, reaction_received: 1, repost_received: 1, mention_received: 1, new_follower: 1 }))).toBe(true);
  });

  it('social_pack requires 10+ of reactions, reposts and mentions', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'social_pack')!;
    expect(a.check(counts({ reaction_received: 10, repost_received: 10, mention_received: 9 }))).toBe(false);
    expect(a.check(counts({ reaction_received: 10, repost_received: 10, mention_received: 10 }))).toBe(true);
  });

  it('sats_collector at 50 zaps', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'sats_collector')!;
    expect(a.check(counts({ zap_received: 49 }))).toBe(false);
    expect(a.check(counts({ zap_received: 50 }))).toBe(true);
  });
});
