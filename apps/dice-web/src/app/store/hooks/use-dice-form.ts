import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { getDiceBetActions, hasAutoBetSettingsErrors } from '../dice-form';
import { useDiceGameStore } from '../dice-game-store';

export const useDiceForm = () => {
  const { form, errors, isValid, patch, diceOdds } = useDiceGameStore(
    useShallow((state) => ({
      form: state.form,
      errors: state.errors,
      isValid: state.isValid,
      patch: state.patchForm,
      diceOdds: state.diceOdds,
    })),
  );
  const limits = useMainStore(useShallow(selectFormLimits));
  const connectionState = useMainStore((state) => state.connectionState);
  const { canPlaceManualBet, canStartAutoBet } = useMemo(
    () =>
      getDiceBetActions(
        form,
        limits,
        connectionState === 'connected',
        diceOdds,
      ),
    [form, limits, connectionState, diceOdds],
  );
  const canSaveAutoBetSettings = useMemo(
    () => !hasAutoBetSettingsErrors(errors),
    [errors],
  );

  return {
    form,
    errors,
    isValid,
    canPlaceManualBet,
    canStartAutoBet,
    canSaveAutoBetSettings,
    patch,
  };
};
