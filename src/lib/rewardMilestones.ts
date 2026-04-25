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
    id: 'level_5',
    sats: 50,
    emoji: '🌱',
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
    id: 'streak_21',
    sats: 210,
    emoji: '📅',
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
