import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { MinesBetResult } from '@vfair/game-contracts';

import { minesGameService } from '../services/mines-game.service';
import { minesSoundService } from '../services/mines-sound.service';
import { useMinesGameStore } from '../store/mines-game-store';
import { minesQueryKeys } from './mines-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

const useInvalidateBetHistory = () => {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: minesQueryKeys.queries.betHistory,
    });
  };
};

const applySettledResult = (
  result: MinesBetResult | null | undefined,
  invalidateBetHistory: () => void,
): void => {
  if (!result) {
    return;
  }

  applyBetSuccess(result);
  invalidateBetHistory();
};

export const usePlaceManualBet = () => {
  const invalidateBetHistory = useInvalidateBetHistory();

  return useMutation({
    mutationKey: minesQueryKeys.mutations.placeManualBet,
    mutationFn: async () => {
      assertSufficientBalance();
      minesSoundService.playBet();
      await minesGameService.placeBet(useMinesGameStore.getState().form);
    },
    onSuccess: () => {
      invalidateBetHistory();
    },
    onError: handlePlaceBetError,
  });
};

export const useRevealTile = () => {
  const invalidateBetHistory = useInvalidateBetHistory();

  return useMutation({
    mutationKey: minesQueryKeys.mutations.revealTile,
    mutationFn: async (tile: number) => minesGameService.revealTile(tile),
    onSuccess: (result) => {
      if (result?.status !== 'lost') {
        minesSoundService.playGem();
      }

      if (result) {
        applySettledResult(result, invalidateBetHistory);
        return;
      }

      invalidateBetHistory();
    },
    onError: handlePlaceBetError,
  });
};

export const useCashOut = () => {
  const invalidateBetHistory = useInvalidateBetHistory();

  return useMutation({
    mutationKey: minesQueryKeys.mutations.cashOut,
    mutationFn: async () => minesGameService.cashOut(),
    onSuccess: (result) => applySettledResult(result, invalidateBetHistory),
    onError: handlePlaceBetError,
  });
};
