import { useIsMutating } from '@tanstack/react-query';

import { useKenoGameStore } from '../store/keno-game-store';
import { kenoQueryKeys } from './keno-query-keys';

export const useIsKenoManualBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: kenoQueryKeys.mutations.placeManualBet }) > 0;

export const useIsKenoAutoBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: kenoQueryKeys.mutations.placeAutoBet }) > 0;

export const useIsKenoBetInProgress = (): boolean => {
  const isRevealing = useKenoGameStore(
    (state) => state.roundStatus === 'revealing',
  );
  const isManualBetInProgress = useIsKenoManualBetInProgress();
  const isAutoBetInProgress = useIsKenoAutoBetInProgress();

  return isRevealing || isManualBetInProgress || isAutoBetInProgress;
};
