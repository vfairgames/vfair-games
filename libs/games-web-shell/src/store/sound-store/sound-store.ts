import { create } from 'zustand';

type SoundState = {
  muted: boolean;
  volume: number;
};

type SoundActions = {
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMuted: () => void;
};

type SoundStore = SoundState & SoundActions;

export const useSoundStore = create<SoundStore>((set) => ({
  muted: false,
  volume: 1,
  setMuted: (muted) => set({ muted }),
  setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
}));
