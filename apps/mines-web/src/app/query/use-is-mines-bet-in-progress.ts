import { useIsMutating, useMutationState } from '@tanstack/react-query';

import { minesQueryKeys } from './mines-query-keys';

export const useIsMinesManualBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: minesQueryKeys.mutations.placeManualBet }) > 0;

export const useIsMinesRevealInProgress = (): boolean =>
  useIsMutating({ mutationKey: minesQueryKeys.mutations.revealTile }) > 0;

export const usePendingMinesRevealTile = (): number | undefined => {
  const pendingTiles = useMutationState({
    filters: {
      mutationKey: minesQueryKeys.mutations.revealTile,
      status: 'pending',
    },
    select: (mutation) => mutation.state.variables as number | undefined,
  });

  return pendingTiles.at(-1);
};

export const useIsMinesAutoBetInProgress = (): boolean =>
  useIsMutating({ mutationKey: minesQueryKeys.mutations.placeAutoBet }) > 0;
