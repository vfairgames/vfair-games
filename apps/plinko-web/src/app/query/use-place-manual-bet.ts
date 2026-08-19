import { useMutation } from '@tanstack/react-query';

import { plinkoGameService } from '../services/plinko-game.service';
import { plinkoSoundService } from '../services/plinko-sound.service';
import { usePlinkoGameStore } from '../store/plinko-game-store';

import { plinkoQueryKeys } from './plinko-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

export const usePlaceManualBet = () => {
  return useMutation({
    mutationKey: plinkoQueryKeys.mutations.placeManualBet,
    mutationFn: async () => {
      assertSufficientBalance();
      plinkoSoundService.playBet();
      const result = await plinkoGameService.placeBet(
        usePlinkoGameStore.getState().form,
      );
      applyBetSuccess(result);
    },
    onError: handlePlaceBetError,
  });
};
