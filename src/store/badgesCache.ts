import { create } from 'zustand';

export interface Badge {
  id: string;
  name: string;
  description: string;
  image?: string;
  thumb?: string;
  creator: string;
}

interface BadgesCacheState {
  pubkey: string | null;
  badges: Badge[];
  loaded: boolean;

  setBadges: (badges: Badge[], pubkey: string) => void;
  reset: () => void;
}

export const useBadgesCache = create<BadgesCacheState>()((set) => ({
  pubkey: null,
  badges: [],
  loaded: false,

  setBadges: (badges, pubkey) => set({ badges, pubkey, loaded: true }),
  reset: () => set({ pubkey: null, badges: [], loaded: false }),
}));
