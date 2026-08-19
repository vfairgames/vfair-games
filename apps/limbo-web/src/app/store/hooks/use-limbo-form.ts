import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { getLimboBetActions, hasAutoBetSettingsErrors } from '../limbo-form';
import { useLimboGameStore } from '../limbo-game-store';

export const useLimboForm = () => {
  const { form, errors, patch, limboOdds } = useLimboGameStore(
    useShallow((state) => ({
      form: state.form,
      errors: state.errors,
      patch: state.patchForm,
      limboOdds: state.limboOdds,
    })),
  );
  const limits = useMainStore(useShallow(selectFormLimits));
  const connectionState = useMainStore((state) => state.connectionState);
  const { canPlaceManualBet, canStartAutoBet } = useMemo(
    () =>
      getLimboBetActions(
        form,
        limits,
        connectionState === 'connected',
        limboOdds,
      ),
    [form, limits, connectionState, limboOdds],
  );
  const canSaveAutoBetSettings = useMemo(
    () => !hasAutoBetSettingsErrors(errors),
    [errors],
  );

  return {
    form,
    errors,
    canPlaceManualBet,
    canStartAutoBet,
    canSaveAutoBetSettings,
    patch,
  };
};
