import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoriAction } from './nori';

export const XP_PER_ACTION: Partial<Record<NoriAction, number>> = {
  zap_received:      20,
  note_published:    10,
  reaction_received: 15,
  repost_received:   15,
  mention_received:  12,
  new_follower:       8,
};

// XP needed to reach each level (index 0 = level 1)
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3700, 5000];
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

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

export interface ActionCounts extends Record<string, number> {
  zap_received: number;
  note_published: number;
  reaction_received: number;
  repost_received: number;
  mention_received: number;
  new_follower: number;
}

const INITIAL_COUNTS: ActionCounts = {
  zap_received: 0, note_published: 0, reaction_received: 0,
  repost_received: 0, mention_received: 0, new_follower: 0,
};

export interface Achievement {
  id: string;
  emoji: string;
  nameEs: string;
  nameEn: string;
  descEs: string;
  descEn: string;
  check: (s: { level: number; actionCounts: ActionCounts; streakDays: number }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_note',     emoji: '📝', nameEs: 'Primera Nota',     nameEn: 'First Note',      descEs: 'Publicaste tu primera nota',         descEn: 'You published your first note',       check: s => s.actionCounts.note_published >= 1 },
  { id: 'first_zap',      emoji: '⚡', nameEs: 'Primera Zap',      nameEn: 'First Zap',       descEs: 'Recibiste tu primer zap',            descEn: 'You received your first zap',         check: s => s.actionCounts.zap_received >= 1 },
  { id: 'first_reaction', emoji: '🔥', nameEs: 'Primera Reacción', nameEn: 'First Reaction',  descEs: 'Alguien reaccionó a tu nota',        descEn: 'Someone reacted to your note',        check: s => s.actionCounts.reaction_received >= 1 },
  { id: 'first_repost',   emoji: '🔁', nameEs: 'Primer Repost',    nameEn: 'First Repost',    descEs: 'Alguien reposteó tu nota',           descEn: 'Someone reposted your note',          check: s => s.actionCounts.repost_received >= 1 },
  { id: 'first_mention',  emoji: '💬', nameEs: 'Primera Mención',  nameEn: 'First Mention',   descEs: 'Alguien te mencionó en Nostr',       descEn: 'Someone mentioned you on Nostr',      check: s => s.actionCounts.mention_received >= 1 },
  { id: 'first_follower', emoji: '🌟', nameEs: 'Primer Seguidor',  nameEn: 'First Follower',  descEs: 'Alguien te empezó a seguir',         descEn: 'Someone followed you',                check: s => s.actionCounts.new_follower >= 1 },
  { id: 'note_10',        emoji: '📖', nameEs: 'Escritor',         nameEn: 'Writer',          descEs: 'Publicaste 10 notas',                descEn: 'You published 10 notes',              check: s => s.actionCounts.note_published >= 10 },
  { id: 'zap_5',          emoji: '⚡', nameEs: 'Imán de Sats',     nameEn: 'Sats Magnet',     descEs: 'Recibiste 5 zaps',                   descEn: 'You received 5 zaps',                 check: s => s.actionCounts.zap_received >= 5 },
  { id: 'follower_10',    emoji: '👥', nameEs: 'Comunidad',        nameEn: 'Community',       descEs: '10 nuevos seguidores',               descEn: '10 new followers',                    check: s => s.actionCounts.new_follower >= 10 },
  { id: 'streak_3',       emoji: '🔥', nameEs: 'Racha de 3 Días',  nameEn: '3-Day Streak',    descEs: 'Activo 3 días seguidos',             descEn: 'Active 3 days in a row',              check: s => s.streakDays >= 3 },
  { id: 'streak_7',       emoji: '💪', nameEs: 'Racha de 7 Días',  nameEn: '7-Day Streak',    descEs: 'Activo 7 días seguidos',             descEn: 'Active 7 days in a row',              check: s => s.streakDays >= 7 },
  { id: 'level_3',        emoji: '🌱', nameEs: 'Plántula',         nameEn: 'Seedling',        descEs: 'Alcanzaste el nivel 3',              descEn: 'Reached level 3',                     check: s => s.level >= 3 },
  { id: 'level_5',        emoji: '🌿', nameEs: 'En Crecimiento',   nameEn: 'Growing Up',      descEs: 'Alcanzaste el nivel 5',              descEn: 'Reached level 5',                     check: s => s.level >= 5 },
  { id: 'level_10',       emoji: '🏆', nameEs: 'Leyenda Nostr',    nameEn: 'Nostr Legend',    descEs: 'Alcanzaste el nivel máximo',         descEn: 'Reached the maximum level',           check: s => s.level >= 10 },
];

interface GoalsState {
  xp: number;
  level: number;
  unlockedAchievements: string[];
  actionCounts: ActionCounts;
  lastActiveDay: string | null;
  streakDays: number;
  justLeveledUp: boolean;
  recentUnlocks: string[];

  recordAction: (action: NoriAction) => void;
  loadFromSync: (remote: { xp: number; level: number; unlockedAchievements: string[]; actionCounts: Record<string, number>; lastActiveDay: string | null; streakDays: number }) => void;
  clearNotifications: () => void;
  reset: () => void;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prevDayStr(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      unlockedAchievements: [],
      actionCounts: INITIAL_COUNTS,
      lastActiveDay: null,
      streakDays: 0,
      justLeveledUp: false,
      recentUnlocks: [],

      recordAction: (action) => {
        const s = get();
        const xpGain = XP_PER_ACTION[action] ?? 0;
        if (xpGain === 0) return;

        const newXP = s.xp + xpGain;
        const newLevel = xpToLevel(newXP);
        const leveledUp = newLevel > s.level;

        const newCounts = { ...s.actionCounts };
        if (action in newCounts) newCounts[action as keyof ActionCounts]++;

        const today = todayStr();
        let newStreak = s.streakDays;
        let newLastActive = s.lastActiveDay;
        if (s.lastActiveDay !== today) {
          newStreak = s.lastActiveDay === prevDayStr(today) ? s.streakDays + 1 : 1;
          newLastActive = today;
        }

        const snapshot = { level: newLevel, actionCounts: newCounts, streakDays: newStreak };
        const newAchievements = ACHIEVEMENTS
          .filter(a => !s.unlockedAchievements.includes(a.id) && a.check(snapshot))
          .map(a => a.id);

        set({
          xp: newXP,
          level: newLevel,
          actionCounts: newCounts,
          streakDays: newStreak,
          lastActiveDay: newLastActive,
          unlockedAchievements: [...s.unlockedAchievements, ...newAchievements],
          justLeveledUp: leveledUp,
          recentUnlocks: newAchievements,
        });
      },

      loadFromSync: (remote) => {
        const s = get();
        // Take max XP — whichever device is further ahead wins
        const newXP = Math.max(s.xp, remote.xp);
        if (newXP === s.xp && remote.unlockedAchievements.every(id => s.unlockedAchievements.includes(id))) return;

        const newLevel = xpToLevel(newXP);
        // Merge action counts: max per action
        const newCounts = { ...s.actionCounts };
        for (const [k, v] of Object.entries(remote.actionCounts)) {
          if (k in newCounts) newCounts[k as keyof ActionCounts] = Math.max(newCounts[k as keyof ActionCounts], v);
        }
        // Union achievements
        const allAchievements = [...new Set([...s.unlockedAchievements, ...remote.unlockedAchievements])];
        // Max streak + most recent active day
        const newStreak = Math.max(s.streakDays, remote.streakDays);
        const newLastActive = (!s.lastActiveDay || (remote.lastActiveDay && remote.lastActiveDay > s.lastActiveDay))
          ? remote.lastActiveDay
          : s.lastActiveDay;

        set({
          xp: newXP,
          level: newLevel,
          actionCounts: newCounts,
          unlockedAchievements: allAchievements,
          streakDays: newStreak,
          lastActiveDay: newLastActive,
        });
      },

      clearNotifications: () => set({ justLeveledUp: false, recentUnlocks: [] }),

      reset: () => set({
        xp: 0, level: 1, unlockedAchievements: [], actionCounts: INITIAL_COUNTS,
        lastActiveDay: null, streakDays: 0, justLeveledUp: false, recentUnlocks: [],
      }),
    }),
    {
      name: 'tamagostrich-goals',
      partialize: s => ({
        xp: s.xp, level: s.level, unlockedAchievements: s.unlockedAchievements,
        actionCounts: s.actionCounts, lastActiveDay: s.lastActiveDay, streakDays: s.streakDays,
      }),
    }
  )
);
