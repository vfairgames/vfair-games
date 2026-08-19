import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { getKenoBetActions, hasAutoBetSettingsErrors } from '../keno-form';
import { useKenoGameStore } from '../keno-game-store';

export const useKenoForm = () => {
  const { form, errors, isValid, patch, kenoOdds, selectedPicks, roundStatus } =
    useKenoGameStore(
      useShallow((state) => ({
        form: state.form,
        errors: state.errors,
        isValid: state.isValid,
        patch: state.patchForm,
        kenoOdds: state.kenoOdds,
        selectedPicks: state.selectedPicks,
        roundStatus: state.roundStatus,
      })),
    );
  const limits = useMainStore(useShallow(selectFormLimits));
  const connectionState = useMainStore((state) => state.connectionState);
  const { canPlaceManualBet, canStartAutoBet } = useMemo(
    () =>
      getKenoBetActions(
        form,
        limits,
        connectionState === 'connected',
        kenoOdds,
        selectedPicks,
        roundStatus !== 'revealing',
      ),
    [form, limits, connectionState, kenoOdds, selectedPicks, roundStatus],
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
    selectedPicks,
    patch,
    kenoOdds,
  };
};
