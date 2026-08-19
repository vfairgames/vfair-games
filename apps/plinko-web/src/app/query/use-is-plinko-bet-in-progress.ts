import { useIsMutating } from '@tanstack/react-query';

import { usePlinkoGameStore } from '../store/plinko-game-store';
import { plinkoQueryKeys } from './plinko-query-keys';

export const useIsPlinkoManualBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: plinkoQueryKeys.mutations.placeManualBet }) > 0;

export const useIsPlinkoAutoBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: plinkoQueryKeys.mutations.placeAutoBet }) > 0;

export const useIsPlinkoBetInProgress = (): boolean => {
  const hasActiveDrops = usePlinkoGameStore((state) => state.drops.length > 0);
  const isManualBetInProgress = useIsPlinkoManualBetInProgress();
  const isAutoBetInProgress = useIsPlinkoAutoBetInProgress();

  return hasActiveDrops || isManualBetInProgress || isAutoBetInProgress;
};
