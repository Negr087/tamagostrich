import { describe, it, expect, beforeEach } from 'vitest';
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

  it('caps at MAX_LEVEL even with huge XP', () => {
    expect(xpToLevel(999999)).toBe(MAX_LEVEL);
  });

  it('level 2 at 100 XP', () => {
    expect(xpToLevel(100)).toBe(2);
  });

  it('level 3 at 250 XP', () => {
    expect(xpToLevel(250)).toBe(3);
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
    // level 2: from 100 to 250, range = 150. At xp=175, current = 75
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

// ─── Achievements ─────────────────────────────────────────────────

describe('ACHIEVEMENTS', () => {
  const base = { level: 1, actionCounts: { zap_received: 0, note_published: 0, reaction_received: 0, repost_received: 0, mention_received: 0, new_follower: 0 }, streakDays: 0 };

  it('no achievements unlock with zero activity', () => {
    const unlocked = ACHIEVEMENTS.filter(a => a.check(base));
    expect(unlocked).toHaveLength(0);
  });

  it('first_note unlocks after 1 published note', () => {
    const s = { ...base, actionCounts: { ...base.actionCounts, note_published: 1 } };
    const a = ACHIEVEMENTS.find(a => a.id === 'first_note')!;
    expect(a.check(s)).toBe(true);
  });

  it('first_zap unlocks after 1 zap', () => {
    const s = { ...base, actionCounts: { ...base.actionCounts, zap_received: 1 } };
    const a = ACHIEVEMENTS.find(a => a.id === 'first_zap')!;
    expect(a.check(s)).toBe(true);
  });

  it('note_10 does NOT unlock at 9 notes', () => {
    const s = { ...base, actionCounts: { ...base.actionCounts, note_published: 9 } };
    const a = ACHIEVEMENTS.find(a => a.id === 'note_10')!;
    expect(a.check(s)).toBe(false);
  });

  it('note_10 unlocks at 10 notes', () => {
    const s = { ...base, actionCounts: { ...base.actionCounts, note_published: 10 } };
    const a = ACHIEVEMENTS.find(a => a.id === 'note_10')!;
    expect(a.check(s)).toBe(true);
  });

  it('streak_3 unlocks at 3 days', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_3')!;
    expect(a.check({ ...base, streakDays: 2 })).toBe(false);
    expect(a.check({ ...base, streakDays: 3 })).toBe(true);
  });

  it('streak_7 unlocks at 7 days', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'streak_7')!;
    expect(a.check({ ...base, streakDays: 6 })).toBe(false);
    expect(a.check({ ...base, streakDays: 7 })).toBe(true);
  });

  it('level_3 unlocks when level >= 3', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'level_3')!;
    expect(a.check({ ...base, level: 2 })).toBe(false);
    expect(a.check({ ...base, level: 3 })).toBe(true);
  });

  it('level_10 only unlocks at MAX_LEVEL', () => {
    const a = ACHIEVEMENTS.find(a => a.id === 'level_10')!;
    expect(a.check({ ...base, level: 9 })).toBe(false);
    expect(a.check({ ...base, level: 10 })).toBe(true);
  });

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
});
