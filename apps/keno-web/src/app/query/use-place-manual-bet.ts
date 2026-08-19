import { useMutation } from '@tanstack/react-query';

import { kenoGameService } from '../services/keno-game.service';
import { kenoSoundService } from '../services/keno-sound.service';
import { useKenoGameStore } from '../store/keno-game-store';
import { kenoQueryKeys } from './keno-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

const REVEAL_STEP_MS = 250;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const revealBetResult = async (
  result: Awaited<ReturnType<typeof kenoGameService.placeBet>>,
): Promise<void> => {
  const store = useKenoGameStore.getState();
  const stepMs = store.betResultTransitionMs === 0 ? 0 : REVEAL_STEP_MS;

  store.startReveal(result);

  if (stepMs === 0) {
    for (const number of result.gameData.drawnNumbers) {
      store.markNumberRevealed(number);
    }
    store.finishReveal();
    return;
  }

  for (const number of result.gameData.drawnNumbers) {
    await sleep(stepMs);
    kenoSoundService.playOpenNumber();
    useKenoGameStore.getState().markNumberRevealed(number);
  }

  useKenoGameStore.getState().finishReveal();
};

export const usePlaceManualBet = () => {
  return useMutation({
    mutationKey: kenoQueryKeys.mutations.placeManualBet,
    mutationFn: async () => {
      assertSufficientBalance();
      kenoSoundService.playBet();

      const { form, selectedPicks } = useKenoGameStore.getState();
      const result = await kenoGameService.placeBet(form, selectedPicks);

      await revealBetResult(result);
      applyBetSuccess(result);
    },
    onError: (error) => {
      useKenoGameStore.getState().resetRound();
      handlePlaceBetError(error);
    },
  });
};
