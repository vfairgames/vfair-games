import { GameSidebar } from '@vfair/games-web-shell';

import { useIsKenoAutoBetInProgress } from '../../query/use-is-keno-bet-in-progress';
import { kenoSoundService } from '../../services/keno-sound.service';
import { useKenoForm } from '../../store/hooks/use-keno-form';
import { KenoAutoBetControls } from '../keno-auto-bet-controls/keno-auto-bet-controls';
import { KenoManualBetControls } from '../keno-manual-bet-controls/keno-manual-bet-controls';

export const KenoBetControls = () => {
  const { form, patch } = useKenoForm();
  const isAutoBetInProgress = useIsKenoAutoBetInProgress();

  return (
    <GameSidebar
      autoContent={<KenoAutoBetControls />}
      manualContent={<KenoManualBetControls />}
      mode={form.betMode}
      modeChangeDisabled={isAutoBetInProgress}
      onModeChange={(betMode) => {
        if (betMode !== form.betMode) {
          kenoSoundService.playAction();
        }
        patch({ betMode });
      }}
    />
  );
};
