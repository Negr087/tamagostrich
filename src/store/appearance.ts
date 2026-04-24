import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnimalType } from '@/lib/petModels';

export const PALETTE = [
  { hex: '#9370DB', nameEs: 'Púrpura',  nameEn: 'Purple'  },
  { hex: '#4B8DEA', nameEs: 'Azul',     nameEn: 'Blue'    },
  { hex: '#3DC97B', nameEs: 'Verde',    nameEn: 'Green'   },
  { hex: '#E24B6B', nameEs: 'Rojo',     nameEn: 'Red'     },
  { hex: '#E88C3A', nameEs: 'Naranja',  nameEn: 'Orange'  },
  { hex: '#E84B9C', nameEs: 'Rosa',     nameEn: 'Pink'    },
  { hex: '#D4B53A', nameEs: 'Dorado',   nameEn: 'Gold'    },
  { hex: '#3AC5C5', nameEs: 'Turquesa', nameEn: 'Teal'    },
] as const;

interface AppearanceState {
  bodyColor:  string;
  animalType: AnimalType;
  hasChosen:  boolean;
  setBodyColor:  (color: string) => void;
  setAnimalType: (type: AnimalType) => void;
  setHasChosen:  (v: boolean) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      bodyColor:  '#9370DB',
      animalType: 'nori',
      hasChosen:  false,
      setBodyColor:  (bodyColor)  => set({ bodyColor }),
      setAnimalType: (animalType) => set({ animalType }),
      setHasChosen:  (hasChosen)  => set({ hasChosen }),
    }),
    { name: 'nori-appearance' }
  )
);
