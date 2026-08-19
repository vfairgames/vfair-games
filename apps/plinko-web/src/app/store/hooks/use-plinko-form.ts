import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { getPlinkoBetActions } from '../plinko-form';
import { usePlinkoGameStore } from '../plinko-game-store';

export const usePlinkoForm = () => {
  const { form, errors, patch, plinkoOdds } = usePlinkoGameStore(
    useShallow((state) => ({
      form: state.form,
      errors: state.errors,
      patch: state.patchForm,
      plinkoOdds: state.plinkoOdds,
    })),
  );
  const limits = useMainStore(useShallow(selectFormLimits));
  const connectionState = useMainStore((state) => state.connectionState);
  const { canPlaceManualBet, canStartAutoBet } = useMemo(
    () =>
      getPlinkoBetActions(
        form,
        limits,
        connectionState === 'connected',
        plinkoOdds,
      ),
    [form, limits, connectionState, plinkoOdds],
  );

  return {
    form,
    errors,
    canPlaceManualBet,
    canStartAutoBet,
    patch,
    plinkoOdds,
  };
};
