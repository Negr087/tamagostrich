import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NoriAction } from './nori';

import { XP_PER_ACTION, LEVEL_THRESHOLDS, xpToLevel } from '@/lib/progression';

export { XP_PER_ACTION, LEVEL_THRESHOLDS, MAX_LEVEL, xpToLevel, levelProgress } from '@/lib/progression';

import { ACHIEVEMENTS, INITIAL_COUNTS, type ActionCounts } from '@/lib/achievements';

export { ACHIEVEMENTS, INITIAL_COUNTS } from '@/lib/achievements';
export type { ActionCounts, Achievement } from '@/lib/achievements';

interface GoalsState {
  xp: number;
  level: number;
  unlockedAchievements: string[];
  actionCounts: ActionCounts;
  lastActiveDay: string | null;
  streakDays: number;
  justLeveledUp: boolean;
  recentUnlocks: string[];
  claimedRewards: string[];
  // Monotonic death counter. Needed so a level lost on death isn't undone by a
  // Math.max(xp) merge with another device that hasn't seen the death yet.
  deaths: number;

  recordAction: (action: NoriAction, detail?: string) => void;
  loseLevel: () => void;
  markRewardClaimed: (milestone: string) => void;
  loadFromSync: (remote: { xp: number; level: number; unlockedAchievements: string[]; actionCounts: Record<string, number>; lastActiveDay: string | null; streakDays: number; claimedRewards?: string[]; deaths?: number }) => void;
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

function parseSats(detail?: string): number {
  if (!detail) return 0;
  const match = detail.match(/^(\d+)\s*sats?$/i);
  return match ? parseInt(match[1], 10) : 0;
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
      claimedRewards: [],
      deaths: 0,

      recordAction: (action, detail) => {
        const s = get();
        const xpGain = XP_PER_ACTION[action] ?? 0;
        if (xpGain === 0) return;

        const newXP = s.xp + xpGain;
        const newLevel = xpToLevel(newXP);
        const leveledUp = newLevel > s.level;

        const newCounts = { ...s.actionCounts };
        if (action in newCounts) newCounts[action as keyof ActionCounts]++;

        if (action === 'zap_received') {
          const sats = parseSats(detail);
          if (sats > 0) {
            newCounts.totalSatsReceived += sats;
            newCounts.maxSingleZap = Math.max(newCounts.maxSingleZap, sats);
          }
        }

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

      loseLevel: () => {
        const s = get();
        const deaths = s.deaths + 1;
        if (s.level <= 1) { set({ deaths }); return; }
        const newLevel = s.level - 1;
        // Drop XP to the exact floor of the new level so ranking reflects it immediately
        const newXP = LEVEL_THRESHOLDS[newLevel - 1];
        set({ level: newLevel, xp: newXP, deaths });
      },

      markRewardClaimed: (milestone) => {
        const s = get();
        if (s.claimedRewards.includes(milestone)) return;
        set({ claimedRewards: [...s.claimedRewards, milestone] });
      },

      loadFromSync: (remote) => {
        const s = get();
        const remoteDeaths = remote.deaths ?? 0;
        // Whoever has seen more deaths has the authoritative XP (it already applied the
        // penalty). With equal deaths, both devices only gained XP → take the max.
        const newXP = remoteDeaths > s.deaths ? remote.xp
          : remoteDeaths < s.deaths ? s.xp
          : Math.max(s.xp, remote.xp);
        const newDeaths = Math.max(s.deaths, remoteDeaths);
        const remoteHasNewClaimed = (remote.claimedRewards ?? []).some(id => !s.claimedRewards.includes(id));
        if (newXP === s.xp && newDeaths === s.deaths
          && remote.unlockedAchievements.every(id => s.unlockedAchievements.includes(id))
          && !remoteHasNewClaimed) return;

        const newLevel = xpToLevel(newXP);
        const newCounts = { ...s.actionCounts };
        for (const [k, v] of Object.entries(remote.actionCounts)) {
          if (k in newCounts) newCounts[k as keyof ActionCounts] = Math.max(newCounts[k as keyof ActionCounts], v);
        }
        const allAchievements = [...new Set([...s.unlockedAchievements, ...remote.unlockedAchievements])];
        const newStreak = Math.max(s.streakDays, remote.streakDays);
        const newLastActive = (!s.lastActiveDay || (remote.lastActiveDay && remote.lastActiveDay > s.lastActiveDay))
          ? remote.lastActiveDay
          : s.lastActiveDay;
        const allClaimed = [...new Set([...s.claimedRewards, ...(remote.claimedRewards ?? [])])];

        set({
          xp: newXP,
          level: newLevel,
          actionCounts: newCounts,
          unlockedAchievements: allAchievements,
          streakDays: newStreak,
          lastActiveDay: newLastActive,
          claimedRewards: allClaimed,
          deaths: newDeaths,
        });
      },

      clearNotifications: () => set({ justLeveledUp: false, recentUnlocks: [] }),

      reset: () => set({
        xp: 0, level: 1, unlockedAchievements: [], actionCounts: INITIAL_COUNTS,
        lastActiveDay: null, streakDays: 0, justLeveledUp: false, recentUnlocks: [],
        claimedRewards: [], deaths: 0,
      }),
    }),
    {
      name: 'tamagostrich-goals',
      partialize: s => ({
        xp: s.xp, level: s.level, unlockedAchievements: s.unlockedAchievements,
        actionCounts: s.actionCounts, lastActiveDay: s.lastActiveDay, streakDays: s.streakDays,
        claimedRewards: s.claimedRewards, deaths: s.deaths,
      }),
    }
  )
);
