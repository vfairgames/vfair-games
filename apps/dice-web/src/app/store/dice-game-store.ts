import { createDiceOdds, DEFAULT_GAME_RTP } from '@vfair/game-math';
import type { DiceOdds } from '@vfair/game-math';
import { create } from 'zustand';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import type { DiceBetResult } from '@vfair/game-contracts';

import { applyFormPatch, initialDiceForm, type DiceForm } from './dice-form';

const MAX_BET_RESULTS = 30;
const DEFAULT_DICE_INDICATOR = 0;
const DEFAULT_BET_RESULT_TRANSITION_MS = 300;

export type DiceBetResultRecord = {
  id: string;
  status: DiceBetResult['status'];
  rolledValue: number;
};

type DiceGameStore = {
  diceOdds: DiceOdds;
  form: DiceForm;
  betResults: DiceBetResultRecord[];
  betResultTransitionMs: number;
  errors: Partial<Record<keyof DiceForm, string>>;
  isValid: boolean;
  initDiceOdds: (rtp: number) => void;
  patchForm: (patch: Partial<DiceForm>) => void;
  recordBetResult: (result: DiceBetResult) => void;
  toggleInstantBet: () => void;
};

export const getDiceIndicator = (betResults: DiceBetResultRecord[]): number =>
  betResults.at(-1)?.rolledValue ?? DEFAULT_DICE_INDICATOR;

const createInitialDiceOdds = (): DiceOdds => createDiceOdds(DEFAULT_GAME_RTP);

const emptyErrors: DiceGameStore['errors'] = {};

export const useDiceGameStore = create<DiceGameStore>((set, get) => {
  const initialDiceOdds = createInitialDiceOdds();

  return {
    diceOdds: initialDiceOdds,
    form: initialDiceForm(initialDiceOdds),
    betResults: [],
    betResultTransitionMs: DEFAULT_BET_RESULT_TRANSITION_MS,
    errors: emptyErrors,
    isValid: true,
    initDiceOdds: (rtp) => {
      const diceOdds = createDiceOdds(rtp);
      const betAmount = useMainStore.getState().calculateInitialBetAmount();

      set({
        diceOdds,
        form: {
          ...initialDiceForm(diceOdds),
          betAmount,
        },
        errors: emptyErrors,
        isValid: true,
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
          { id, status, rolledValue: gameData.rolledValue },
        ].slice(-MAX_BET_RESULTS),
      }));
    },
    patchForm: (patch) => {
      const { diceOdds, form } = get();
      const result = applyFormPatch(
        form,
        patch,
        selectFormLimits(useMainStore.getState()),
        diceOdds,
      );

      if (result.isValid) {
        set({
          form: result.form,
          errors: emptyErrors,
          isValid: true,
        });
        return;
      }

      set({
        form: result.form,
        errors: result.errors,
        isValid: false,
      });
    },
  };
});
