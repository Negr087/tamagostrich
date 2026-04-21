import { create } from 'zustand';

export type Section = 'nori' | 'profile' | 'badges' | 'goals';

interface NavState {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  activeSection: 'nori',
  setActiveSection: (section) => set({ activeSection: section }),
}));
