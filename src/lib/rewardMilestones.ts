// Milestone rewards — shared between API route and UI
export const REWARD_MILESTONES = [
  { id: 'level_10', requiredLevel: 10, sats: 210, emoji: '⚡' },
  { id: 'level_21', requiredLevel: 21, sats: 420, emoji: '🏆' },
] as const;

export type MilestoneId = typeof REWARD_MILESTONES[number]['id'];
