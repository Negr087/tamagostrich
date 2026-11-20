// Master switch for sats rewards (paid from the operator's NWC wallet).
// Off by default: set NEXT_PUBLIC_REWARDS_ENABLED=true (and fund the wallet) to turn them on.
// NEXT_PUBLIC_ so the same flag hides the UI and blocks the API.
export const REWARDS_ENABLED = process.env.NEXT_PUBLIC_REWARDS_ENABLED === 'true';

// Milestone rewards — shared between API route and UI.
// Each milestone has either requiredLevel OR requiredStreak (not both).
export interface RewardMilestone {
  id: string;
  sats: number;
  emoji: string;
  labelEs: string;
  labelEn: string;
  requiredLevel?: number;
  requiredStreak?: number;
}

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    id: 'level_3',
    sats: 21,
    emoji: '🌱',
    labelEs: 'Nivel 3',
    labelEn: 'Level 3',
    requiredLevel: 3,
  },
  {
    id: 'level_5',
    sats: 50,
    emoji: '🌿',
    labelEs: 'Nivel 5',
    labelEn: 'Level 5',
    requiredLevel: 5,
  },
  {
    id: 'streak_7',
    sats: 77,
    emoji: '🔥',
    labelEs: '7 días seguidos',
    labelEn: '7-day streak',
    requiredStreak: 7,
  },
  {
    id: 'level_10',
    sats: 210,
    emoji: '⚡',
    labelEs: 'Nivel 10',
    labelEn: 'Level 10',
    requiredLevel: 10,
  },
  {
    id: 'streak_14',
    sats: 140,
    emoji: '📅',
    labelEs: '14 días seguidos',
    labelEn: '14-day streak',
    requiredStreak: 14,
  },
  {
    id: 'level_15',
    sats: 300,
    emoji: '💫',
    labelEs: 'Nivel 15',
    labelEn: 'Level 15',
    requiredLevel: 15,
  },
  {
    id: 'streak_21',
    sats: 210,
    emoji: '🗓️',
    labelEs: '21 días seguidos',
    labelEn: '21-day streak',
    requiredStreak: 21,
  },
  {
    id: 'level_21',
    sats: 420,
    emoji: '🏆',
    labelEs: 'Nivel máximo',
    labelEn: 'Max level',
    requiredLevel: 21,
  },
];

export type MilestoneId = (typeof REWARD_MILESTONES)[number]['id'];
