import { useMutation, useQueryClient } from '@tanstack/react-query';

import { limboGameService } from '../services/limbo-game.service';
import { limboSoundService } from '../services/limbo-sound.service';
import { useLimboGameStore } from '../store/limbo-game-store';
import { limboQueryKeys } from './limbo-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

export const usePlaceManualBet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: limboQueryKeys.mutations.placeManualBet,
    mutationFn: async () => {
      assertSufficientBalance();
      limboSoundService.playBet();
      return limboGameService.placeBet(useLimboGameStore.getState().form);
    },
    onSuccess: (result) => {
      applyBetSuccess(result);
      void queryClient.invalidateQueries({
        queryKey: limboQueryKeys.queries.betHistory,
      });
    },
    onError: handlePlaceBetError,
  });
};
