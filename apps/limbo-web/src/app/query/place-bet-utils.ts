import type { LimboBetResult } from '@vfair/game-contracts';
import {
  toastService,
  translate,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import { limboSoundService } from '../services/limbo-sound.service';
import { useLimboGameStore } from '../store/limbo-game-store';

export class InsufficientBalanceError extends Error {
  constructor() {
    super(translate('limboInsufficientBalance'));
    this.name = 'InsufficientBalanceError';
  }
}

export const assertSufficientBalance = (): void => {
  const { form } = useLimboGameStore.getState();
  const { balance, roundToCurrency } = useMainStore.getState();
  const betAmount = roundToCurrency(form.betAmount);

  if (balance < betAmount) {
    toastService.error(translate('limboInsufficientBalance'), {
      description: translate('limboInsufficientBalanceDescription'),
    });
    throw new InsufficientBalanceError();
  }
};

export const applyBetSuccess = (result: LimboBetResult): void => {
  useMainStore.getState().setBalance(result.balance);
  useLimboGameStore.getState().recordBetResult(result);

  if (!useMainStore.getState().isDemo) {
    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
  }

  limboSoundService.playBetResult(result);
};

export const handlePlaceBetError = (error: unknown): void => {
  if (error instanceof InsufficientBalanceError) {
    return;
  }

  toastService.error(translate('limboBetFailed'), {
    description:
      error instanceof Error ? error.message : translate('shellUnknownError'),
  });
};
