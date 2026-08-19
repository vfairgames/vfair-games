import { GameSidebar } from '@vfair/games-web-shell';

import { useIsMinesAutoBetInProgress } from '../../query/use-is-mines-bet-in-progress';
import { minesSoundService } from '../../services/mines-sound.service';
import { useMinesForm } from '../../store/hooks/use-mines-form';
import { useMinesGameStore } from '../../store/mines-game-store';
import { MinesAutoBetControls } from './mines-auto-bet-controls/mines-auto-bet-controls';
import { MinesManualBetControls } from './mines-manual-bet-controls/mines-manual-bet-controls';

export const MinesBetControls = () => {
  const { form, patch, roundStatus } = useMinesForm();
  const isAutoBetInProgress = useIsMinesAutoBetInProgress();
  const clearBoard = useMinesGameStore((state) => state.clearBoard);

  return (
    <GameSidebar
      mode={form.betMode}
      modeChangeDisabled={isAutoBetInProgress || roundStatus === 'active'}
      onModeChange={(betMode) => {
        if (betMode !== form.betMode) {
          minesSoundService.playAction();
          clearBoard();
        }
        patch({ betMode });
      }}
      manualContent={<MinesManualBetControls />}
      autoContent={<MinesAutoBetControls />}
    />
  );
};
