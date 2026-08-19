import { create } from 'zustand';
import type { GameLanguage } from '../components/language-selector/language-selector';

export type PartnerAppearance = 'light' | 'dark';

type PartnerPrefsState = {
  lang: GameLanguage;
  currency: string;
  appearance: PartnerAppearance;
  setLang: (lang: GameLanguage) => void;
  setCurrency: (currency: string) => void;
  setAppearance: (appearance: PartnerAppearance) => void;
  toggleAppearance: () => void;
};

export const usePartnerPrefsStore = create<PartnerPrefsState>((set) => ({
  lang: 'en',
  currency: 'USD',
  appearance: 'dark',
  setLang: (lang) => set({ lang }),
  setCurrency: (currency) => set({ currency }),
  setAppearance: (appearance) => set({ appearance }),
  toggleAppearance: () =>
    set((state) => ({
      appearance: state.appearance === 'dark' ? 'light' : 'dark',
    })),
}));
