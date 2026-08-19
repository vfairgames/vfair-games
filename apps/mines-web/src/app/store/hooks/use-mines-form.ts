import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { getMinesBetActions, hasAutoBetSettingsErrors } from '../mines-form';
import { useMinesGameStore } from '../mines-game-store';

export const useMinesForm = () => {
  const { form, errors, patch, minesOdds, selectedTiles, roundStatus } =
    useMinesGameStore(
      useShallow((state) => ({
        form: state.form,
        errors: state.errors,
        patch: state.patchForm,
        minesOdds: state.minesOdds,
        selectedTiles: state.selectedTiles,
        roundStatus: state.roundStatus,
      })),
    );
  const limits = useMainStore(useShallow(selectFormLimits));
  const connectionState = useMainStore((state) => state.connectionState);
  const { canPlaceManualBet, canStartAutoBet } = useMemo(
    () =>
      getMinesBetActions(
        form,
        limits,
        connectionState === 'connected',
        minesOdds,
        selectedTiles.length,
      ),
    [form, limits, connectionState, minesOdds, selectedTiles.length],
  );

  return {
    form,
    errors,
    canPlaceManualBet,
    canStartAutoBet,
    canSaveAutoBetSettings: !hasAutoBetSettingsErrors(errors),
    roundStatus,
    selectedTiles,
    minesOdds,
    patch,
  };
};
