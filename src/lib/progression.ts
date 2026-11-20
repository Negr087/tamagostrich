// Pure progression rules (XP, levels) — no React/Zustand imports so they can be
// shared between the client store and server-side API routes.

export const XP_PER_ACTION: Record<string, number> = {
  zap_received:      20,
  note_published:    10,
  reaction_received: 15,
  repost_received:   15,
  mention_received:  12,
  new_follower:       8,
};

// XP needed to reach each level (index 0 = level 1)
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2000, 2800, 3700, 5000,
  6600, 8500, 10800, 13500, 16800, 20800, 25500, 31000, 37500, 45000, 54000,
];
export const MAX_LEVEL = LEVEL_THRESHOLDS.length; // 21

export function xpToLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

export function levelProgress(xp: number, level: number) {
  const from = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const to = level >= MAX_LEVEL ? LEVEL_THRESHOLDS[MAX_LEVEL - 1] : LEVEL_THRESHOLDS[level];
  const current = xp - from;
  const needed = to - from;
  return { current, needed, pct: Math.min(100, needed > 0 ? (current / needed) * 100 : 100) };
}

// Maximum XP that the given action counts could have produced.
// XP can be lower (level loss on death) but never higher.
export function maxXpFromCounts(actionCounts: Record<string, unknown> | undefined): number {
  if (!actionCounts) return 0;
  let total = 0;
  for (const [action, xp] of Object.entries(XP_PER_ACTION)) {
    const n = actionCounts[action];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) total += Math.floor(n) * xp;
  }
  return total;
}

// Sanity-check a self-reported progression. This does NOT prove the progress is real
// (the payload is signed by the user), it only rejects internally inconsistent states.
export function isProgressConsistent(goals: {
  xp?: unknown; level?: unknown; actionCounts?: Record<string, unknown>;
}): boolean {
  const { xp, level } = goals;
  if (typeof xp !== 'number' || typeof level !== 'number') return false;
  if (!Number.isFinite(xp) || xp < 0) return false;
  if (xpToLevel(xp) !== level) return false;
  return xp <= maxXpFromCounts(goals.actionCounts);
}
