import type { MinesBetResult } from '@vfair/game-contracts';
import {
  toastService,
  translate,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import { minesSoundService } from '../services/mines-sound.service';
import { useMinesGameStore } from '../store/mines-game-store';

class InsufficientBalanceError extends Error {
  constructor() {
    super(translate('minesInsufficientBalance'));
    this.name = 'InsufficientBalanceError';
  }
}

export const assertSufficientBalance = (): void => {
  const { form } = useMinesGameStore.getState();
  const { balance, roundToCurrency } = useMainStore.getState();
  const betAmount = roundToCurrency(form.betAmount);

  if (balance < betAmount) {
    toastService.error(translate('minesInsufficientBalance'), {
      description: translate('minesInsufficientBalanceDescription'),
    });
    throw new InsufficientBalanceError();
  }
};

export const applyBetSuccess = (result: MinesBetResult): void => {
  useMainStore.getState().setBalance(result.balance);

  if (!useMainStore.getState().isDemo) {
    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
  }

  minesSoundService.playBetResult(result);
  useMinesGameStore.getState().setLastWin(
    result.status === 'won'
      ? {
          multiplier: result.gameData.multiplier,
          payout: result.cashOut,
        }
      : null,
  );
};

export const handlePlaceBetError = (error: unknown): void => {
  if (error instanceof InsufficientBalanceError) {
    return;
  }

  toastService.error(translate('minesBetFailed'), {
    description:
      error instanceof Error ? error.message : translate('shellUnknownError'),
  });
};
