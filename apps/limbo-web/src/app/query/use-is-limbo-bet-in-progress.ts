import { useIsMutating } from '@tanstack/react-query';

import { limboQueryKeys } from './limbo-query-keys';

export const useIsLimboManualBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: limboQueryKeys.mutations.placeManualBet }) > 0;

export const useIsLimboAutoBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: limboQueryKeys.mutations.placeAutoBet }) > 0;
