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

export interface ActionCounts extends Record<string, number> {
  zap_received: number;
  note_published: number;
  reaction_received: number;
  repost_received: number;
  mention_received: number;
  new_follower: number;
  totalSatsReceived: number;
  maxSingleZap: number;
}

const INITIAL_COUNTS: ActionCounts = {
  zap_received: 0, note_published: 0, reaction_received: 0,
  repost_received: 0, mention_received: 0, new_follower: 0,
  totalSatsReceived: 0, maxSingleZap: 0,
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
  // ── Primeros pasos ──────────────────────────────────────────────
  { id: 'first_note',     emoji: '📝', nameEs: 'Primera Nota',        nameEn: 'First Note',          descEs: 'Publicaste tu primera nota',              descEn: 'You published your first note',          check: s => s.actionCounts.note_published >= 1 },
  { id: 'first_zap',      emoji: '⚡', nameEs: 'Primera Zap',         nameEn: 'First Zap',           descEs: 'Recibiste tu primer zap',                 descEn: 'You received your first zap',            check: s => s.actionCounts.zap_received >= 1 },
  { id: 'first_reaction', emoji: '🔥', nameEs: 'Primera Reacción',    nameEn: 'First Reaction',      descEs: 'Alguien reaccionó a tu nota',             descEn: 'Someone reacted to your note',           check: s => s.actionCounts.reaction_received >= 1 },
  { id: 'first_repost',   emoji: '🔁', nameEs: 'Primer Repost',       nameEn: 'First Repost',        descEs: 'Alguien reposteó tu nota',                descEn: 'Someone reposted your note',             check: s => s.actionCounts.repost_received >= 1 },
  { id: 'first_mention',  emoji: '💬', nameEs: 'Primera Mención',     nameEn: 'First Mention',       descEs: 'Alguien te mencionó en Nostr',            descEn: 'Someone mentioned you on Nostr',         check: s => s.actionCounts.mention_received >= 1 },
  { id: 'first_follower', emoji: '🌟', nameEs: 'Primer Seguidor',     nameEn: 'First Follower',      descEs: 'Alguien te empezó a seguir',              descEn: 'Someone followed you',                   check: s => s.actionCounts.new_follower >= 1 },

  // ── Notas publicadas ────────────────────────────────────────────
  { id: 'note_10',  emoji: '📖', nameEs: 'Escritor',    nameEn: 'Writer',    descEs: 'Publicaste 10 notas',   descEn: 'You published 10 notes',   check: s => s.actionCounts.note_published >= 10 },
  { id: 'note_25',  emoji: '📰', nameEs: 'Columnista',  nameEn: 'Columnist', descEs: 'Publicaste 25 notas',   descEn: 'You published 25 notes',   check: s => s.actionCounts.note_published >= 25 },
  { id: 'note_50',  emoji: '📚', nameEs: 'Redactor',    nameEn: 'Editor',    descEs: 'Publicaste 50 notas',   descEn: 'You published 50 notes',   check: s => s.actionCounts.note_published >= 50 },
  { id: 'note_100', emoji: '🖊️',  nameEs: 'Autor',       nameEn: 'Author',    descEs: 'Publicaste 100 notas',  descEn: 'You published 100 notes',  check: s => s.actionCounts.note_published >= 100 },

  // ── Zaps recibidos (cantidad) ────────────────────────────────────
  { id: 'zap_5',  emoji: '⚡', nameEs: 'Imán de Sats',    nameEn: 'Sats Magnet',  descEs: 'Recibiste 5 zaps',   descEn: 'You received 5 zaps',    check: s => s.actionCounts.zap_received >= 5 },
  { id: 'zap_10', emoji: '⚡', nameEs: 'Favorito',        nameEn: 'Fan Favorite', descEs: 'Recibiste 10 zaps',  descEn: 'You received 10 zaps',   check: s => s.actionCounts.zap_received >= 10 },
  { id: 'zap_25', emoji: '⚡', nameEs: 'Estrella Sats',   nameEn: 'Sats Star',    descEs: 'Recibiste 25 zaps',  descEn: 'You received 25 zaps',   check: s => s.actionCounts.zap_received >= 25 },
  { id: 'zap_50', emoji: '⚡', nameEs: 'Tesoro',          nameEn: 'Treasure',     descEs: 'Recibiste 50 zaps',  descEn: 'You received 50 zaps',   check: s => s.actionCounts.zap_received >= 50 },

  // ── Zaps (montos) ───────────────────────────────────────────────
  { id: 'zap_1k',       emoji: '💰', nameEs: 'Mega Zap',        nameEn: 'Mega Zap',        descEs: 'Recibiste un zap de 1.000+ sats',    descEn: 'Received a single zap of 1,000+ sats',    check: s => s.actionCounts.maxSingleZap >= 1000 },
  { id: 'zap_5k',       emoji: '💎', nameEs: 'Super Zap',       nameEn: 'Super Zap',       descEs: 'Recibiste un zap de 5.000+ sats',    descEn: 'Received a single zap of 5,000+ sats',    check: s => s.actionCounts.maxSingleZap >= 5000 },
  { id: 'zap_10k',      emoji: '👑', nameEs: 'Ultra Zap',       nameEn: 'Ultra Zap',       descEs: 'Recibiste un zap de 10.000+ sats',   descEn: 'Received a single zap of 10,000+ sats',   check: s => s.actionCounts.maxSingleZap >= 10000 },
  { id: 'total_10k',    emoji: '🏦', nameEs: '10K Sats',        nameEn: '10K Sats',        descEs: 'Acumulaste 10.000 sats en zaps',      descEn: 'Accumulated 10,000 sats from zaps',       check: s => s.actionCounts.totalSatsReceived >= 10000 },
  { id: 'total_100k',   emoji: '🐋', nameEs: '100K Sats',       nameEn: '100K Sats',       descEs: 'Acumulaste 100.000 sats en zaps',     descEn: 'Accumulated 100,000 sats from zaps',      check: s => s.actionCounts.totalSatsReceived >= 100000 },

  // ── Reacciones ──────────────────────────────────────────────────
  { id: 'reaction_10',  emoji: '🔥', nameEs: 'Popular',       nameEn: 'Popular',       descEs: 'Recibiste 10 reacciones',   descEn: 'You received 10 reactions',   check: s => s.actionCounts.reaction_received >= 10 },
  { id: 'reaction_50',  emoji: '🔥', nameEs: 'Viral',         nameEn: 'Viral',         descEs: 'Recibiste 50 reacciones',   descEn: 'You received 50 reactions',   check: s => s.actionCounts.reaction_received >= 50 },
  { id: 'reaction_100', emoji: '🔥', nameEs: 'Sensación',     nameEn: 'Sensation',     descEs: 'Recibiste 100 reacciones',  descEn: 'You received 100 reactions',  check: s => s.actionCounts.reaction_received >= 100 },

  // ── Reposts ─────────────────────────────────────────────────────
  { id: 'repost_5',  emoji: '🔁', nameEs: 'Reposteado',   nameEn: 'Reshared',  descEs: 'Repostearon tu nota 5 veces',   descEn: 'Your note was reposted 5 times',    check: s => s.actionCounts.repost_received >= 5 },
  { id: 'repost_10', emoji: '🔁', nameEs: 'Trending',     nameEn: 'Trending',  descEs: 'Repostearon tu nota 10 veces',  descEn: 'Your note was reposted 10 times',   check: s => s.actionCounts.repost_received >= 10 },
  { id: 'repost_25', emoji: '🔁', nameEs: 'Viral Nostr',  nameEn: 'Viral',     descEs: 'Repostearon tu nota 25 veces',  descEn: 'Your note was reposted 25 times',   check: s => s.actionCounts.repost_received >= 25 },

  // ── Menciones ───────────────────────────────────────────────────
  { id: 'mention_10', emoji: '💬', nameEs: 'Influencer',  nameEn: 'Influencer',  descEs: 'Te mencionaron 10 veces',   descEn: 'You were mentioned 10 times',   check: s => s.actionCounts.mention_received >= 10 },
  { id: 'mention_25', emoji: '💬', nameEs: 'Referente',   nameEn: 'Reference',   descEs: 'Te mencionaron 25 veces',   descEn: 'You were mentioned 25 times',   check: s => s.actionCounts.mention_received >= 25 },

  // ── Seguidores ──────────────────────────────────────────────────
  { id: 'follower_10',  emoji: '👥', nameEs: 'Comunidad',           nameEn: 'Community',        descEs: '10 nuevos seguidores',    descEn: '10 new followers',     check: s => s.actionCounts.new_follower >= 10 },
  { id: 'follower_25',  emoji: '👥', nameEs: 'Comunidad Creciente', nameEn: 'Growing Community', descEs: '25 nuevos seguidores',    descEn: '25 new followers',     check: s => s.actionCounts.new_follower >= 25 },
  { id: 'follower_50',  emoji: '👥', nameEs: 'Líder',               nameEn: 'Leader',            descEs: '50 nuevos seguidores',    descEn: '50 new followers',     check: s => s.actionCounts.new_follower >= 50 },
  { id: 'follower_100', emoji: '👥', nameEs: 'Leyenda Social',      nameEn: 'Social Legend',     descEs: '100 nuevos seguidores',   descEn: '100 new followers',    check: s => s.actionCounts.new_follower >= 100 },

  // ── Rachas diarias ──────────────────────────────────────────────
  { id: 'streak_1',  emoji: '🌅', nameEs: 'Primer Día',      nameEn: 'First Day',      descEs: 'Primer día activo en Nostr',    descEn: 'First active day on Nostr',      check: s => s.streakDays >= 1 },
  { id: 'streak_2',  emoji: '✌️',  nameEs: 'Dos en Fila',    nameEn: 'Two in a Row',   descEs: 'Activo 2 días seguidos',        descEn: 'Active 2 days in a row',         check: s => s.streakDays >= 2 },
  { id: 'streak_3',  emoji: '🔥', nameEs: 'Racha de 3 Días', nameEn: '3-Day Streak',   descEs: 'Activo 3 días seguidos',        descEn: 'Active 3 days in a row',         check: s => s.streakDays >= 3 },
  { id: 'streak_5',  emoji: '🔥', nameEs: 'Media Semana',    nameEn: 'Mid Week',       descEs: 'Activo 5 días seguidos',        descEn: 'Active 5 days in a row',         check: s => s.streakDays >= 5 },
  { id: 'streak_7',  emoji: '💪', nameEs: 'Racha de 7 Días', nameEn: '7-Day Streak',   descEs: 'Activo 7 días seguidos',        descEn: 'Active 7 days in a row',         check: s => s.streakDays >= 7 },
  { id: 'streak_14', emoji: '📅', nameEs: 'Quincenal',       nameEn: 'Two Weeks',      descEs: 'Activo 14 días seguidos',       descEn: 'Active 14 days in a row',        check: s => s.streakDays >= 14 },
  { id: 'streak_21', emoji: '🗓️',  nameEs: 'Tres Semanas',   nameEn: 'Three Weeks',    descEs: 'Activo 21 días seguidos',       descEn: 'Active 21 days in a row',        check: s => s.streakDays >= 21 },
  { id: 'streak_30', emoji: '🏅', nameEs: 'Mes Activo',      nameEn: 'Active Month',   descEs: 'Activo 30 días seguidos',       descEn: 'Active 30 days in a row',        check: s => s.streakDays >= 30 },

  // ── Niveles ─────────────────────────────────────────────────────
  { id: 'level_3',  emoji: '🌱', nameEs: 'Plántula',      nameEn: 'Seedling',   descEs: 'Alcanzaste el nivel 3',   descEn: 'Reached level 3',   check: s => s.level >= 3 },
  { id: 'level_5',  emoji: '🌿', nameEs: 'En Crecimiento',nameEn: 'Growing Up', descEs: 'Alcanzaste el nivel 5',   descEn: 'Reached level 5',   check: s => s.level >= 5 },
  { id: 'level_7',  emoji: '🌳', nameEs: 'Avanzado',      nameEn: 'Advanced',   descEs: 'Alcanzaste el nivel 7',   descEn: 'Reached level 7',   check: s => s.level >= 7 },
  { id: 'level_10', emoji: '🏆', nameEs: 'Veterano',      nameEn: 'Veteran',    descEs: 'Alcanzaste el nivel 10',  descEn: 'Reached level 10',  check: s => s.level >= 10 },
  { id: 'level_15', emoji: '💫', nameEs: 'Maestro',       nameEn: 'Master',     descEs: 'Alcanzaste el nivel 15',  descEn: 'Reached level 15',  check: s => s.level >= 15 },
  { id: 'level_21', emoji: '🦅', nameEs: 'Leyenda',       nameEn: 'Legend',     descEs: 'Alcanzaste el nivel máximo', descEn: 'Reached the maximum level', check: s => s.level >= 21 },

  // ── Especiales ──────────────────────────────────────────────────
  {
    id: 'all_interactions',
    emoji: '🎯', nameEs: 'Completo', nameEn: 'Full House',
    descEs: 'Recibiste los 5 tipos de interacción',
    descEn: 'Received all 5 types of interaction',
    check: s => s.actionCounts.zap_received >= 1 && s.actionCounts.reaction_received >= 1
             && s.actionCounts.repost_received >= 1 && s.actionCounts.mention_received >= 1
             && s.actionCounts.new_follower >= 1,
  },
  {
    id: 'social_pack',
    emoji: '🤝', nameEs: 'Sociable', nameEn: 'Social Pack',
    descEs: '10+ reacciones, reposts y menciones',
    descEn: '10+ reactions, reposts and mentions',
    check: s => s.actionCounts.reaction_received >= 10 && s.actionCounts.repost_received >= 10
             && s.actionCounts.mention_received >= 10,
  },
  {
    id: 'sats_collector',
    emoji: '🪙', nameEs: 'Coleccionista', nameEn: 'Sats Collector',
    descEs: 'Recibiste 50+ zaps',
    descEn: 'Received 50+ zaps total',
    check: s => s.actionCounts.zap_received >= 50,
  },
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

  recordAction: (action: NoriAction, detail?: string) => void;
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

      loadFromSync: (remote) => {
        const s = get();
        const newXP = Math.max(s.xp, remote.xp);
        if (newXP === s.xp && remote.unlockedAchievements.every(id => s.unlockedAchievements.includes(id))) return;

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
