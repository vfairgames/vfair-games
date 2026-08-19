import { createKenoOdds, MAX_KENO_PICKS } from '@vfair/game-math';
import type { KenoOdds } from '@vfair/game-math';
import type { KenoBetResult } from '@vfair/game-contracts';
import { create } from 'zustand';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { applyFormPatch, initialKenoForm, type KenoForm } from './keno-form';

const DEFAULT_BET_RESULT_TRANSITION_MS = 300;

export type KenoRoundStatus = 'idle' | 'revealing' | 'settled';

export type KenoLastWin = {
  multiplier: number;
  payout: number;
};

type KenoGameStore = {
  kenoOdds: KenoOdds;
  form: KenoForm;
  selectedPicks: number[];
  roundStatus: KenoRoundStatus;
  lastResult: KenoBetResult | null;
  lastWin: KenoLastWin | null;
  revealedNumbers: number[];
  betResultTransitionMs: number;
  errors: Partial<Record<keyof KenoForm, string>>;
  isValid: boolean;
  initKenoOdds: () => void;
  patchForm: (patch: Partial<KenoForm>) => void;
  toggleInstantBet: () => void;
  togglePick: (number: number) => void;
  autoPick: () => void;
  clearPicks: () => void;
  startReveal: (result: KenoBetResult) => void;
  markNumberRevealed: (number: number) => void;
  finishReveal: () => void;
  resetRound: () => void;
  setLastWin: (lastWin: KenoLastWin | null) => void;
};

const emptyErrors: KenoGameStore['errors'] = {};

const createRandomPicks = (
  count: number,
  exclude: readonly number[],
): number[] => {
  const available = Array.from({ length: 40 }, (_, index) => index + 1).filter(
    (value) => !exclude.includes(value),
  );
  const picks = [...exclude];

  while (picks.length < count && available.length > 0) {
    const index = Math.floor(Math.random() * available.length);
    picks.push(available[index]);
    available.splice(index, 1);
  }

  return picks.sort((left, right) => left - right);
};

export const useKenoGameStore = create<KenoGameStore>((set, get) => {
  return {
    kenoOdds: createKenoOdds(),
    form: initialKenoForm(),
    selectedPicks: [],
    roundStatus: 'idle',
    lastResult: null,
    lastWin: null,
    revealedNumbers: [],
    betResultTransitionMs: DEFAULT_BET_RESULT_TRANSITION_MS,
    errors: emptyErrors,
    isValid: true,
    initKenoOdds: () => {
      const betAmount = useMainStore.getState().calculateInitialBetAmount();
      const kenoOdds = createKenoOdds();

      set({
        kenoOdds,
        form: {
          ...initialKenoForm(),
          betAmount,
        },
        selectedPicks: [],
        roundStatus: 'idle',
        lastResult: null,
        lastWin: null,
        revealedNumbers: [],
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
    patchForm: (patch) => {
      const { kenoOdds, form, selectedPicks } = get();
      const result = applyFormPatch(
        form,
        patch,
        selectFormLimits(useMainStore.getState()),
        kenoOdds,
        selectedPicks.length,
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
    togglePick: (number) => {
      const { roundStatus, selectedPicks, kenoOdds } = get();

      if (roundStatus !== 'idle') {
        get().resetRound();
      }

      const nextPicks = selectedPicks.includes(number)
        ? selectedPicks.filter((pick) => pick !== number)
        : selectedPicks.length >= MAX_KENO_PICKS
          ? selectedPicks
          : [...selectedPicks, number].sort((left, right) => left - right);

      const { form } = get();
      const validation = applyFormPatch(
        form,
        {},
        selectFormLimits(useMainStore.getState()),
        kenoOdds,
        nextPicks.length,
      );

      set({
        selectedPicks: nextPicks,
        roundStatus: 'idle',
        lastResult: null,
        lastWin: null,
        revealedNumbers: [],
        form: validation.form,
        errors: validation.errors,
        isValid: validation.isValid,
      });
    },
    autoPick: () => {
      const { kenoOdds, form } = get();
      const nextPicks = createRandomPicks(MAX_KENO_PICKS, []);
      const validation = applyFormPatch(
        form,
        {},
        selectFormLimits(useMainStore.getState()),
        kenoOdds,
        nextPicks.length,
      );

      set({
        selectedPicks: nextPicks,
        roundStatus: 'idle',
        lastResult: null,
        lastWin: null,
        revealedNumbers: [],
        form: validation.form,
        errors: validation.errors,
        isValid: validation.isValid,
      });
    },
    clearPicks: () => {
      const { kenoOdds, form } = get();
      const validation = applyFormPatch(
        form,
        {},
        selectFormLimits(useMainStore.getState()),
        kenoOdds,
        0,
      );

      set({
        selectedPicks: [],
        roundStatus: 'idle',
        lastResult: null,
        lastWin: null,
        revealedNumbers: [],
        form: validation.form,
        errors: validation.errors,
        isValid: validation.isValid,
      });
    },
    startReveal: (result) => {
      set({
        roundStatus: 'revealing',
        lastResult: result,
        lastWin: null,
        revealedNumbers: [],
      });
    },
    markNumberRevealed: (number) => {
      set((state) => ({
        revealedNumbers: state.revealedNumbers.includes(number)
          ? state.revealedNumbers
          : [...state.revealedNumbers, number],
      }));
    },
    finishReveal: () => {
      set({ roundStatus: 'settled' });
    },
    resetRound: () => {
      set({
        roundStatus: 'idle',
        lastResult: null,
        lastWin: null,
        revealedNumbers: [],
      });
    },
    setLastWin: (lastWin) => {
      set({ lastWin });
    },
  };
});
