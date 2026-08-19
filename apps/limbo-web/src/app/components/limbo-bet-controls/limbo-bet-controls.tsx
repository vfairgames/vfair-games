import { GameSidebar } from '@vfair/games-web-shell';

import { useIsLimboAutoBetInProgress } from '../../query/use-is-limbo-bet-in-progress';
import { limboSoundService } from '../../services/limbo-sound.service';
import { useLimboForm } from '../../store/hooks/use-limbo-form';
import { LimboAutoBetControls } from './limbo-auto-bet-controls/limbo-auto-bet-controls';
import { LimboManualBetControls } from './limbo-manual-bet-controls/limbo-manual-bet-controls';

export const LimboBetControls = () => {
  const { form, patch } = useLimboForm();
  const isAutoBetInProgress = useIsLimboAutoBetInProgress();

  return (
    <GameSidebar
      mode={form.betMode}
      modeChangeDisabled={isAutoBetInProgress}
      onModeChange={(betMode) => {
        if (betMode !== form.betMode) {
          limboSoundService.playAction();
        }
        patch({ betMode });
      }}
      manualContent={<LimboManualBetControls />}
      autoContent={<LimboAutoBetControls />}
    />
  );
};
