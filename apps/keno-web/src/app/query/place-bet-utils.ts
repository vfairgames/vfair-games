import type { KenoBetResult } from '@vfair/game-contracts';
import {
  toastService,
  translate,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import { kenoSoundService } from '../services/keno-sound.service';
import { useKenoGameStore } from '../store/keno-game-store';
import { kenoQueryClient } from './keno-query-client';
import { kenoQueryKeys } from './keno-query-keys';

export class InsufficientBalanceError extends Error {
  constructor() {
    super(translate('kenoInsufficientBalance'));
    this.name = 'InsufficientBalanceError';
  }
}

export const assertSufficientBalance = (): void => {
  const { form } = useKenoGameStore.getState();
  const { balance, roundToCurrency } = useMainStore.getState();
  const betAmount = roundToCurrency(form.betAmount);

  if (balance < betAmount) {
    toastService.error(translate('kenoInsufficientBalance'), {
      description: translate('kenoInsufficientBalanceDescription'),
    });
    throw new InsufficientBalanceError();
  }
};

export const applyBetSuccess = (result: KenoBetResult): void => {
  useMainStore.getState().setBalance(result.balance);

  if (!useMainStore.getState().isDemo) {
    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
  }

  kenoSoundService.playBetResult(result);
  useKenoGameStore.getState().setLastWin(
    result.status === 'won' && result.gameData.multiplier > 1
      ? {
          multiplier: result.gameData.multiplier,
          payout: result.cashOut,
        }
      : null,
  );

  void kenoQueryClient.invalidateQueries({
    queryKey: kenoQueryKeys.queries.betHistory,
  });
};

export const handlePlaceBetError = (error: unknown): void => {
  if (error instanceof InsufficientBalanceError) {
    return;
  }

  toastService.error(translate('kenoBetFailed'), {
    description:
      error instanceof Error ? error.message : translate('shellUnknownError'),
  });
};
