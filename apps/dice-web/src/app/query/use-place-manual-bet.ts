import { useMutation, useQueryClient } from '@tanstack/react-query';

import { diceGameService } from '../services/dice-game.service';
import { diceSoundService } from '../services/dice-sound.service';
import { useDiceGameStore } from '../store/dice-game-store';
import { diceQueryKeys } from './dice-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

export const usePlaceManualBet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: diceQueryKeys.mutations.placeManualBet,
    mutationFn: async () => {
      assertSufficientBalance();
      diceSoundService.playBet();
      return diceGameService.placeBet(useDiceGameStore.getState().form);
    },
    onSuccess: (result) => {
      applyBetSuccess(result);
      void queryClient.invalidateQueries({
        queryKey: diceQueryKeys.queries.betHistory,
      });
    },
    onError: handlePlaceBetError,
  });
};
