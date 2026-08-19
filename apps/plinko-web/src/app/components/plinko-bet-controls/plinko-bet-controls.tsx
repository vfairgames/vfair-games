import { GameSidebar } from '@vfair/games-web-shell';

import { useIsPlinkoAutoBetInProgress } from '../../query/use-is-plinko-bet-in-progress';
import { plinkoSoundService } from '../../services/plinko-sound.service';
import { usePlinkoForm } from '../../store/hooks/use-plinko-form';
import { PlinkoAutoBetControls } from './plinko-auto-bet-controls/plinko-auto-bet-controls';
import { PlinkoManualBetControls } from './plinko-manual-bet-controls/plinko-manual-bet-controls';

export const PlinkoBetControls = () => {
  const { form, patch } = usePlinkoForm();
  const isAutoBetInProgress = useIsPlinkoAutoBetInProgress();

  return (
    <GameSidebar
      autoContent={<PlinkoAutoBetControls />}
      manualContent={<PlinkoManualBetControls />}
      mode={form.betMode}
      modeChangeDisabled={isAutoBetInProgress}
      onModeChange={(betMode) => {
        if (betMode !== form.betMode) {
          plinkoSoundService.playAction();
        }
        patch({ betMode });
      }}
    />
  );
};
