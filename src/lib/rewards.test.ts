import { describe, it, expect, beforeEach } from 'vitest';
import { bolt11ToMsats, bolt11ToSats } from './bolt11';
import { isProgressConsistent, maxXpFromCounts, LEVEL_THRESHOLDS } from './progression';
import { parseLightningAddress } from './lnurl';
import { useGoalsStore } from '@/store/goals';

// BOLT11 spec test vector (2500u = 250,000 sats)
const INVOICE_2500U =
  'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kdzw5hydlzf03qdgm2hdq27cqv3agm2awhz5se903vruatfhq77w3ls4evs3ch9zw97j25emudupq63nyw24cg27h2rspfj9srp';

describe('bolt11', () => {
  it('decodes the spec test vector', () => {
    expect(bolt11ToSats(INVOICE_2500U)).toBe(250_000);
    expect(bolt11ToMsats(INVOICE_2500U)).toBe(250_000_000);
  });
  it('is case-insensitive', () => {
    expect(bolt11ToSats(INVOICE_2500U.toUpperCase())).toBe(250_000);
  });
  it('decodes small amounts exactly in msats', () => {
    expect(bolt11ToMsats('lnbc210n1pqqqqqq')).toBe(21_000);  // 21 sats
    expect(bolt11ToMsats('lnbc10p1pqqqqqq')).toBe(1);        // 1 msat
  });
  it('returns null for amountless or garbage invoices', () => {
    expect(bolt11ToMsats('lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq')).toBeNull();
    expect(bolt11ToMsats('not-an-invoice')).toBeNull();
  });
});

describe('isProgressConsistent', () => {
  const counts = { zap_received: 10, note_published: 10 }; // 200 + 100 = 300 XP max

  it('accepts a state whose XP is backed by its action counts', () => {
    expect(isProgressConsistent({ xp: 300, level: 3, actionCounts: counts })).toBe(true);
  });
  it('accepts XP below the max (level lost on death)', () => {
    expect(isProgressConsistent({ xp: 100, level: 2, actionCounts: counts })).toBe(true);
  });
  it('rejects level that does not match XP', () => {
    expect(isProgressConsistent({ xp: 300, level: 21, actionCounts: counts })).toBe(false);
  });
  it('rejects XP not backed by actions (hand-crafted state)', () => {
    expect(isProgressConsistent({ xp: 54000, level: 21, actionCounts: counts })).toBe(false);
    expect(isProgressConsistent({ xp: 54000, level: 21 })).toBe(false);
  });
  it('ignores non-numeric or negative counts', () => {
    expect(maxXpFromCounts({ zap_received: -5, note_published: 'x' as unknown as number })).toBe(0);
  });
});

describe('parseLightningAddress', () => {
  it('parses valid addresses', () => {
    expect(parseLightningAddress(' Satoshi@Example.com ')).toEqual({ user: 'satoshi', domain: 'example.com' });
  });
  it('rejects addresses that could point the server at odd hosts', () => {
    expect(parseLightningAddress('a@localhost')).toBeNull();
    expect(parseLightningAddress('a@evil.com/path')).toBeNull();
    expect(parseLightningAddress('a@b@c.com')).toBeNull();
    expect(parseLightningAddress('nope')).toBeNull();
  });
});

describe('goals loadFromSync — deaths', () => {
  const base = {
    unlockedAchievements: [], actionCounts: {}, lastActiveDay: null, streakDays: 0, claimedRewards: [],
  };
  beforeEach(() => useGoalsStore.getState().reset());

  it('a death on another device is not undone by local XP', () => {
    useGoalsStore.setState({ xp: 1000, level: 5, deaths: 0 });
    // remote device died: dropped to level 4 floor
    useGoalsStore.getState().loadFromSync({ ...base, xp: LEVEL_THRESHOLDS[3], level: 4, deaths: 1 });
    const s = useGoalsStore.getState();
    expect(s.xp).toBe(LEVEL_THRESHOLDS[3]);
    expect(s.level).toBe(4);
    expect(s.deaths).toBe(1);
  });

  it('a local death is kept when remote has not seen it', () => {
    useGoalsStore.setState({ xp: 1000, level: 5, deaths: 0 });
    useGoalsStore.getState().loseLevel();
    useGoalsStore.getState().loadFromSync({ ...base, xp: 1000, level: 5, deaths: 0 });
    const s = useGoalsStore.getState();
    expect(s.level).toBe(4);
    expect(s.deaths).toBe(1);
  });

  it('with equal deaths, takes the max XP', () => {
    useGoalsStore.setState({ xp: 300, level: 3, deaths: 2 });
    useGoalsStore.getState().loadFromSync({ ...base, xp: 600, level: 4, deaths: 2 });
    expect(useGoalsStore.getState().xp).toBe(600);
  });

  it('treats old remote events without `deaths` as 0', () => {
    useGoalsStore.setState({ xp: 300, level: 3, deaths: 0 });
    useGoalsStore.getState().loadFromSync({ ...base, xp: 600, level: 4 });
    expect(useGoalsStore.getState().xp).toBe(600);
  });

  it('dying at level 1 still counts the death', () => {
    useGoalsStore.getState().loseLevel();
    expect(useGoalsStore.getState().deaths).toBe(1);
    expect(useGoalsStore.getState().level).toBe(1);
  });
});

describe('achievements', () => {
  it('eligibleAchievements only returns achievements backed by the counts', async () => {
    const { eligibleAchievements, INITIAL_COUNTS } = await import('./achievements');
    const ids = eligibleAchievements({ level: 1, streakDays: 0, actionCounts: { ...INITIAL_COUNTS, note_published: 1 } });
    expect(ids).toContain('first_note');
    expect(ids).not.toContain('first_zap');
  });
});
