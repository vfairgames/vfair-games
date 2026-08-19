import type { DiceBetResult } from '@vfair/game-contracts';
import {
  toastService,
  translate,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import { diceSoundService } from '../services/dice-sound.service';
import { useDiceGameStore } from '../store/dice-game-store';

export class InsufficientBalanceError extends Error {
  constructor() {
    super(translate('diceInsufficientBalance'));
    this.name = 'InsufficientBalanceError';
  }
}

export const assertSufficientBalance = (): void => {
  const { form } = useDiceGameStore.getState();
  const { balance, roundToCurrency } = useMainStore.getState();
  const betAmount = roundToCurrency(form.betAmount);

  if (balance < betAmount) {
    toastService.error(translate('diceInsufficientBalance'), {
      description: translate('diceInsufficientBalanceDescription'),
    });
    throw new InsufficientBalanceError();
  }
};

export const applyBetSuccess = (result: DiceBetResult): void => {
  useMainStore.getState().setBalance(result.balance);
  useDiceGameStore.getState().recordBetResult(result);

  if (!useMainStore.getState().isDemo) {
    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
  }

  diceSoundService.playBetResult(result);
};

export const handlePlaceBetError = (error: unknown): void => {
  if (error instanceof InsufficientBalanceError) {
    return;
  }

  toastService.error(translate('diceBetFailed'), {
    description:
      error instanceof Error ? error.message : translate('shellUnknownError'),
  });
};
