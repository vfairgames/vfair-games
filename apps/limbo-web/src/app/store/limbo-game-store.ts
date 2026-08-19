import { createLimboOdds, DEFAULT_GAME_RTP } from '@vfair/game-math';
import type { LimboOdds } from '@vfair/game-math';
import type { LimboBetResult } from '@vfair/game-contracts';
import { create } from 'zustand';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { applyFormPatch, initialLimboForm, type LimboForm } from './limbo-form';

const MAX_BET_RESULTS = 30;
const DEFAULT_BET_RESULT_TRANSITION_MS = 300;

export type LimboBetResultRecord = {
  id: string;
  status: LimboBetResult['status'];
  rolledMultiplier: number;
};

type LimboGameStore = {
  limboOdds: LimboOdds;
  form: LimboForm;
  betResults: LimboBetResultRecord[];
  betResultTransitionMs: number;
  errors: Partial<Record<keyof LimboForm, string>>;
  initLimboOdds: (rtp: number) => void;
  patchForm: (patch: Partial<LimboForm>) => void;
  recordBetResult: (result: LimboBetResult) => void;
  toggleInstantBet: () => void;
};

const createInitialLimboOdds = (): LimboOdds =>
  createLimboOdds(DEFAULT_GAME_RTP);

const emptyErrors: LimboGameStore['errors'] = {};

export const useLimboGameStore = create<LimboGameStore>((set, get) => {
  const initialLimboOdds = createInitialLimboOdds();

  return {
    limboOdds: initialLimboOdds,
    form: initialLimboForm(initialLimboOdds),
    betResults: [],
    betResultTransitionMs: DEFAULT_BET_RESULT_TRANSITION_MS,
    errors: emptyErrors,
    initLimboOdds: (rtp) => {
      const limboOdds = createLimboOdds(rtp);
      const betAmount = useMainStore.getState().calculateInitialBetAmount();

      set({
        limboOdds,
        form: {
          ...initialLimboForm(limboOdds),
          betAmount,
        },
        errors: emptyErrors,
      });
    },
    toggleInstantBet: () => {
      const isInstant = get().betResultTransitionMs === 0;

      set({
        betResultTransitionMs: isInstant ? DEFAULT_BET_RESULT_TRANSITION_MS : 0,
      });
    },
    recordBetResult: ({ id, status, gameData }) => {
      set((state) => ({
        betResults: [
          ...state.betResults,
          { id, status, rolledMultiplier: gameData.rolledMultiplier },
        ].slice(-MAX_BET_RESULTS),
      }));
    },
    patchForm: (patch) => {
      const { limboOdds, form } = get();
      const result = applyFormPatch(
        form,
        patch,
        selectFormLimits(useMainStore.getState()),
        limboOdds,
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
