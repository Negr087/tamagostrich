import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NoriMood = 'happy' | 'excited' | 'resting' | 'sleeping' | 'sad' | 'social';

export type NoriAction =
  | 'zap_received'
  | 'note_published'
  | 'reaction_received'
  | 'no_activity'
  | 'mention_received'
  | 'new_follower';

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  action: NoriAction;
  message: string;
  emoji: string;
  senderPubkey?: string; // hex pubkey of who triggered the event (absent for own actions)
}

interface NoriStats {
  happiness: number;   // 0-100
  energy: number;      // 0-100
  social: number;      // 0-100
}

interface NoriState {
  stats: NoriStats;
  mood: NoriMood;
  activityLog: ActivityLogEntry[];
  lastEventTime: number;
  lastDecayTime: number;
  isListening: boolean;
  isSyncingFromNostr: boolean;

  // Actions
  triggerAction: (action: NoriAction, detail?: string, senderPubkey?: string) => void;
  decayStats: () => void;
  setListening: (listening: boolean) => void;
  computeMood: () => NoriMood;
  loadFromNostr: (pubkey: string) => Promise<void>;
}

function clamp(val: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

// Debounced publish — fires 10s after the last stats change
let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const state = useNoriStore.getState();
    if (state.isSyncingFromNostr) return; // don't publish while loading
    try {
      const { publishPetState } = await import('@/lib/nostr');
      await publishPetState({
        version: 1,
        stats: state.stats,
        lastEventTime: state.lastEventTime,
        lastDecayTime: state.lastDecayTime,
        activityLog: state.activityLog.slice(0, 20),
      });
    } catch (e) {
      console.warn('[pet-sync] sync failed:', e);
    }
  }, 10000);
}

const ACTION_EFFECTS: Record<NoriAction, { happiness: number; energy: number; social: number }> = {
  zap_received:      { happiness: 15, energy: 10, social: 5 },
  note_published:    { happiness: 5,  energy: -5, social: 10 },
  reaction_received: { happiness: 10, energy: 5,  social: 8 },
  no_activity:       { happiness: -5, energy: -4, social: -8 },
  mention_received:  { happiness: 8,  energy: 3,  social: 12 },
  new_follower:      { happiness: 12, energy: 5,  social: 15 },
};

const ACTION_META: Record<NoriAction, { emoji: string; messageTemplate: string }> = {
  zap_received:      { emoji: '⚡', messageTemplate: 'Recibiste un zap' },
  note_published:    { emoji: '📝', messageTemplate: 'Publicaste una nota' },
  reaction_received: { emoji: '🔥', messageTemplate: 'Tu nota tiene reacciones' },
  no_activity:       { emoji: '😴', messageTemplate: 'Sin actividad' },
  mention_received:  { emoji: '💬', messageTemplate: 'Te mencionaron' },
  new_follower:      { emoji: '🌟', messageTemplate: 'Nuevo seguidor' },
};

function computeMoodFromStats(stats: NoriStats, lastEventTime: number): NoriMood {
  const now = Date.now();
  const timeSinceEvent = now - lastEventTime;
  const minutesSinceEvent = timeSinceEvent / 60000;

  // Sleeping if no activity for 10+ min and low energy
  if (minutesSinceEvent > 10 && stats.energy < 30) return 'sleeping';
  // Resting if no activity for 5+ min
  if (minutesSinceEvent > 5) return 'resting';
  // Sad if low stats
  if (stats.happiness < 25 && stats.social < 25) return 'sad';
  // Excited if high happiness
  if (stats.happiness > 75) return 'excited';
  // Social if high social
  if (stats.social > 70) return 'social';
  return 'happy';
}

export const useNoriStore = create<NoriState>()(
  persist(
    (set, get) => ({
      stats: { happiness: 72, energy: 85, social: 40 },
      mood: 'resting',
      activityLog: [],
      lastEventTime: Date.now(),
      lastDecayTime: Date.now(),
      isListening: false,
      isSyncingFromNostr: false,

      triggerAction: (action, detail, senderPubkey) => {
        const state = get();
        const effects = ACTION_EFFECTS[action];
        const meta = ACTION_META[action];

        const newStats: NoriStats = {
          happiness: clamp(state.stats.happiness + effects.happiness),
          energy: clamp(state.stats.energy + effects.energy),
          social: clamp(state.stats.social + effects.social),
        };

        const entry: ActivityLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          action,
          message: detail || meta.messageTemplate,
          emoji: meta.emoji,
          senderPubkey,
        };

        const newLog = [entry, ...state.activityLog].slice(0, 50);
        const now = Date.now();

        set({
          stats: newStats,
          activityLog: newLog,
          lastEventTime: now,
          mood: computeMoodFromStats(newStats, now),
        });
        scheduleSync();
      },

      decayStats: () => {
        const state = get();
        const now = Date.now();
        const elapsed = now - state.lastDecayTime;
        if (elapsed < 60000) return; // mínimo 1 minuto entre llamadas

        // 100 pts en exactamente 24h sin actividad → 100/1440 pts por minuto
        const RATE = 100 / 1440;
        const minutes = elapsed / 60000; // fracción exacta, sin floor

        const newStats: NoriStats = {
          happiness: clamp(state.stats.happiness - minutes * RATE),
          energy:    clamp(state.stats.energy    - minutes * RATE),
          social:    clamp(state.stats.social    - minutes * RATE),
        };

        set({
          stats: newStats,
          lastDecayTime: now,
          mood: computeMoodFromStats(newStats, state.lastEventTime),
        });
        scheduleSync();
      },

      setListening: (listening) => set({ isListening: listening }),

      computeMood: () => {
        const state = get();
        return computeMoodFromStats(state.stats, state.lastEventTime);
      },

      loadFromNostr: async (pubkey: string) => {
        set({ isSyncingFromNostr: true });
        try {
          const { fetchPetState, connectNDK } = await import('@/lib/nostr');
          await connectNDK();
          const remote = await fetchPetState(pubkey);
          if (!remote) {
            // No state on Nostr yet — publish current local state so other devices can sync
            scheduleSync();
            return;
          }

          const local = get();
          // Use remote if: this browser never had activity (fresh/default state),
          // OR remote has more recent activity/decay than local
          const localIsDefault = local.activityLog.length === 0;
          const remoteIsNewer  = remote.lastEventTime > local.lastEventTime
                              || remote.lastDecayTime > local.lastDecayTime;

          if (localIsDefault || remoteIsNewer) {
            set({
              stats: {
                happiness: clamp(remote.stats.happiness),
                energy:    clamp(remote.stats.energy),
                social:    clamp(remote.stats.social),
              },
              lastEventTime: remote.lastEventTime,
              lastDecayTime: remote.lastDecayTime,
              activityLog:   remote.activityLog as ActivityLogEntry[] || [],
              mood: computeMoodFromStats(remote.stats, remote.lastEventTime),
            });
            // Apply decay accumulated since last sync
            useNoriStore.getState().decayStats();
          } else {
            // Local is more recent — publish it so other devices can sync
            scheduleSync();
          }
        } catch (e) {
          console.warn('[pet-sync] load failed:', e);
        } finally {
          set({ isSyncingFromNostr: false });
        }
      },
    }),
    {
      name: 'nori-tamagotchi',
      partialize: (state) => ({
        stats: state.stats,
        activityLog: state.activityLog.slice(0, 20),
        lastEventTime: state.lastEventTime,
        lastDecayTime: state.lastDecayTime,
      }),
    }
  )
);
