import type {
  ActiveRoundGame,
  FairnessState,
  NextSeedPair,
} from '@vfair/game-contracts';
import { create } from 'zustand';

const emptyNextSeedPair = (): NextSeedPair => ({
  newClientSeed: '',
  nextServerSeedHash: '',
});

type FairnessStore = FairnessState & {
  activeRounds: ActiveRoundGame[];
  nextSeedPair: NextSeedPair;
  setFairnessState: (fairness: FairnessState) => void;
  setActiveRounds: (activeRounds: ActiveRoundGame[]) => void;
  setNextSeedPair: (nextSeedPair: NextSeedPair) => void;
  patchNextSeedPair: (patch: Partial<NextSeedPair>) => void;
  setNonce: (nonce: number) => void;
  reset: () => void;
};

const initialFairnessState = (): FairnessState => ({
  serverSeedHash: '',
  clientSeed: '',
  nonce: 0,
});

export const useFairnessStore = create<FairnessStore>((set) => ({
  ...initialFairnessState(),
  activeRounds: [],
  nextSeedPair: emptyNextSeedPair(),
  setFairnessState: (fairness) => set((state) => ({ ...state, ...fairness })),
  setActiveRounds: (activeRounds) => set({ activeRounds }),
  setNextSeedPair: (nextSeedPair) => set({ nextSeedPair }),
  patchNextSeedPair: (patch) =>
    set((state) => ({
      nextSeedPair: { ...state.nextSeedPair, ...patch },
    })),
  setNonce: (nonce) => set({ nonce }),
  reset: () =>
    set({
      ...initialFairnessState(),
      activeRounds: [],
      nextSeedPair: emptyNextSeedPair(),
    }),
}));
