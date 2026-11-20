import { create } from 'zustand';

// Which user's pet is open in the global PetProfileModal (null = closed).
interface PetViewerState {
  pubkey: string | null;
  open: (pubkey: string) => void;
  close: () => void;
}

export const usePetViewer = create<PetViewerState>()((set) => ({
  pubkey: null,
  open: (pubkey) => set({ pubkey }),
  close: () => set({ pubkey: null }),
}));
