import { create } from 'zustand';

type ProvablyFairModalStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useProvablyFairModal = create<ProvablyFairModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
