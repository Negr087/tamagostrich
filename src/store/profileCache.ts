import { create } from 'zustand';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import type { ZapReceived, NostrProfile } from '@/lib/nostr';

interface ProfileCacheState {
  pubkey: string | null;
  notes: NDKEvent[];
  following: string[];
  followersCount: number;
  zaps: ZapReceived[];
  zapProfiles: Record<string, NostrProfile | null>;
  loaded: boolean;
  zapsLoaded: boolean;
  statsLoading: { followers: boolean; following: boolean; notes: boolean };

  setNotes: (notes: NDKEvent[]) => void;
  setFollowing: (following: string[]) => void;
  setFollowersCount: (count: number) => void;
  setZaps: (zaps: ZapReceived[], profiles: Record<string, NostrProfile | null>) => void;
  setStatsLoading: (update: Partial<ProfileCacheState['statsLoading']>) => void;
  markLoaded: (pubkey: string) => void;
  reset: () => void;
}

const INITIAL_STATS_LOADING = { followers: true, following: true, notes: true };

export const useProfileCache = create<ProfileCacheState>()((set) => ({
  pubkey: null,
  notes: [],
  following: [],
  followersCount: 0,
  zaps: [],
  zapProfiles: {},
  loaded: false,
  zapsLoaded: false,
  statsLoading: INITIAL_STATS_LOADING,

  setNotes: (notes) => set({ notes }),
  setFollowing: (following) => set({ following }),
  setFollowersCount: (followersCount) => set({ followersCount }),
  setZaps: (zaps, zapProfiles) => set({ zaps, zapProfiles, zapsLoaded: true }),
  setStatsLoading: (update) =>
    set((s) => ({ statsLoading: { ...s.statsLoading, ...update } })),
  markLoaded: (pubkey) => set({ loaded: true, pubkey }),
  reset: () =>
    set({
      pubkey: null,
      notes: [],
      following: [],
      followersCount: 0,
      zaps: [],
      zapProfiles: {},
      loaded: false,
      zapsLoaded: false,
      statsLoading: INITIAL_STATS_LOADING,
    }),
}));
