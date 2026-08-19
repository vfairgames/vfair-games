import { useIsMutating } from '@tanstack/react-query';

import { diceQueryKeys } from './dice-query-keys';

export const useIsDiceManualBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: diceQueryKeys.mutations.placeManualBet }) > 0;

export const useIsDiceAutoBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: diceQueryKeys.mutations.placeAutoBet }) > 0;
