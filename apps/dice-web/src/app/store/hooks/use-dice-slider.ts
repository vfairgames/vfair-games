import { useShallow } from 'zustand/react/shallow';

import { getDiceIndicator, useDiceGameStore } from '../dice-game-store';

export const useDiceSlider = () =>
  useDiceGameStore(
    useShallow((state) => ({
      gameMode: state.form.gameMode,
      sliderValue: state.form.sliderValue,
      diceIndicator: getDiceIndicator(state.betResults),
      lastBetResult: state.betResults.at(-1),
      betResultTransitionMs: state.betResultTransitionMs,
      patch: state.patchForm,
    })),
  );
