import type { PlinkoBetResult } from '@vfair/game-contracts';
import {
  toastService,
  translate,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import { plinkoSoundService } from '../services/plinko-sound.service';
import { commitDemoBetResult } from '../services/plinko-game.service';
import { usePlinkoGameStore } from '../store/plinko-game-store';

import { plinkoQueryClient } from './plinko-query-client';
import { plinkoQueryKeys } from './plinko-query-keys';

export class InsufficientBalanceError extends Error {
  constructor() {
    super(translate('plinkoInsufficientBalance'));
    this.name = 'InsufficientBalanceError';
  }
}

export const assertSufficientBalance = (): void => {
  const { form } = usePlinkoGameStore.getState();
  const { balance, roundToCurrency } = useMainStore.getState();
  const betAmount = roundToCurrency(form.betAmount);

  if (balance < betAmount) {
    toastService.error(translate('plinkoInsufficientBalance'), {
      description: translate('plinkoInsufficientBalanceDescription'),
    });
    throw new InsufficientBalanceError();
  }
};

export const applyBetSuccess = (result: PlinkoBetResult): void => {
  const { balance, roundToCurrency, setBalance, isDemo } =
    useMainStore.getState();

  setBalance(roundToCurrency(balance - result.betAmount));

  if (!isDemo) {
    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
  }

  usePlinkoGameStore.getState().enqueueDrop({
    id: result.id,
    bucketIndex: result.gameData.bucketIndex,
    rows: result.gameData.rows,
    status: result.status,
    multiplier: result.gameData.multiplier,
    cashOut: result.cashOut,
  });
};

export const finalizePlinkoDrop = (dropId: string): void => {
  const drop = usePlinkoGameStore
    .getState()
    .drops.find((item) => item.id === dropId);

  usePlinkoGameStore.getState().completeDrop(dropId);

  if (!drop) {
    return;
  }

  const { balance, roundToCurrency, setBalance, isDemo } =
    useMainStore.getState();
  setBalance(roundToCurrency(balance + drop.cashOut));
  plinkoSoundService.playBetResult(drop);

  if (isDemo) {
    commitDemoBetResult(dropId);
  }

  void plinkoQueryClient.invalidateQueries({
    queryKey: plinkoQueryKeys.queries.betHistory,
  });
};

export const handlePlaceBetError = (error: unknown): void => {
  if (error instanceof InsufficientBalanceError) {
    return;
  }

  toastService.error(translate('plinkoBetFailed'), {
    description:
      error instanceof Error ? error.message : translate('shellUnknownError'),
  });
};
