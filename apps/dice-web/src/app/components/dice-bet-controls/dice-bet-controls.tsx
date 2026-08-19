import { GameSidebar } from '@vfair/games-web-shell';

import { useIsDiceAutoBetInProgress } from '../../query/use-is-dice-bet-in-progress';
import { diceSoundService } from '../../services/dice-sound.service';
import { useDiceForm } from '../../store/hooks/use-dice-form';
import { DiceAutoBetControls } from './dice-auto-bet-controls/dice-auto-bet-controls';
import { DiceManualBetControls } from './dice-manual-bet-controls/dice-manual-bet-controls';

export const DiceBetControls = () => {
  const { form, patch } = useDiceForm();
  const isAutoBetInProgress = useIsDiceAutoBetInProgress();

  return (
    <GameSidebar
      mode={form.betMode}
      modeChangeDisabled={isAutoBetInProgress}
      onModeChange={(betMode) => {
        if (betMode !== form.betMode) {
          diceSoundService.playAction();
        }
        patch({ betMode });
      }}
      manualContent={<DiceManualBetControls />}
      autoContent={<DiceAutoBetControls />}
    />
  );
};
