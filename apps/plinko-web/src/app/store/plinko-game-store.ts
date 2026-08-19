import { createPlinkoOdds } from '@vfair/game-math';
import type { PlinkoOdds } from '@vfair/game-math';
import type { PlinkoBetResult } from '@vfair/game-contracts';
import { create } from 'zustand';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import {
  applyFormPatch,
  initialPlinkoForm,
  type PlinkoForm,
} from './plinko-form';

export type PlinkoDrop = {
  id: string;
  bucketIndex: number;
  rows: number;
  status: PlinkoBetResult['status'];
  multiplier: number;
  cashOut: number;
};

type PlinkoGameStore = {
  plinkoOdds: PlinkoOdds;
  form: PlinkoForm;
  isInstantBet: boolean;
  drops: PlinkoDrop[];
  errors: Partial<Record<keyof PlinkoForm, string>>;
  initPlinkoOdds: () => void;
  patchForm: (patch: Partial<PlinkoForm>) => void;
  enqueueDrop: (drop: PlinkoDrop) => void;
  completeDrop: (dropId: string) => void;
  toggleInstantBet: () => void;
};

const emptyErrors: PlinkoGameStore['errors'] = {};

export const usePlinkoGameStore = create<PlinkoGameStore>((set, get) => {
  return {
    plinkoOdds: createPlinkoOdds(),
    form: initialPlinkoForm(),
    isInstantBet: false,
    drops: [],
    errors: emptyErrors,
    initPlinkoOdds: () => {
      const betAmount = useMainStore.getState().calculateInitialBetAmount();

      set({
        plinkoOdds: createPlinkoOdds(),
        form: {
          ...initialPlinkoForm(),
          betAmount,
        },
        errors: emptyErrors,
      });
    },
    toggleInstantBet: () => {
      set((state) => ({
        isInstantBet: !state.isInstantBet,
      }));
    },
    enqueueDrop: (drop) => {
      set((state) => ({
        drops: [...state.drops, drop],
      }));
    },
    completeDrop: (dropId) => {
      const drops = get().drops.filter((drop) => drop.id !== dropId);

      set({ drops });

      if (drops.length === 0) {
        notifyPlinkoAnimationComplete();
      }
    },
    patchForm: (patch) => {
      const { plinkoOdds, form } = get();
      const result = applyFormPatch(
        form,
        patch,
        selectFormLimits(useMainStore.getState()),
        plinkoOdds,
      );

      if (result.isValid) {
        set({
          form: result.form,
          errors: emptyErrors,
        });
        return;
      }

      set({
        form: result.form,
        errors: result.errors,
      });
    },
  };
});

const animationWaiters: Array<() => void> = [];

export const waitForPlinkoAnimationComplete = (): Promise<void> => {
  if (usePlinkoGameStore.getState().drops.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    animationWaiters.push(resolve);
  });
};

const notifyPlinkoAnimationComplete = (): void => {
  animationWaiters.splice(0).forEach((resolve) => {
    resolve();
  });
};
