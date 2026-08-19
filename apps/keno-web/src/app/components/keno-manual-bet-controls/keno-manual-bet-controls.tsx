import { Button, Flex, Grid } from '@radix-ui/themes';
import { useShallow } from 'zustand/react/shallow';

import {
  BetAmountInput,
  UserBalance,
  selectManualBetMainStore,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import { usePlaceManualBet } from '../../query/use-place-manual-bet';
import { kenoSoundService } from '../../services/keno-sound.service';
import { useKenoForm } from '../../store/hooks/use-keno-form';
import { useKenoGameStore } from '../../store/keno-game-store';
import { KenoRiskSelect } from '../keno-risk-select/keno-risk-select';

export const KenoManualBetControls = () => {
  const { t } = useTranslation();
  const { form, errors, canPlaceManualBet, patch } = useKenoForm();
  const { mutate, isPending } = usePlaceManualBet();
  const mainStore = useMainStore(useShallow(selectManualBetMainStore));
  const { autoPick, clearPicks } = useKenoGameStore(
    useShallow((state) => ({
      autoPick: state.autoPick,
      clearPicks: state.clearPicks,
    })),
  );

  return (
    <Flex
      align="stretch"
      className="game-bet-controls"
      direction="column"
      flexGrow="1"
      gap="2"
      justify="between"
    >
      <Flex direction="column" gap="2">
        <UserBalance balance={mainStore.balance} />
        <BetAmountInput
          error={errors.betAmount}
          max={mainStore.maxBet}
          min={mainStore.minBet}
          value={form.betAmount}
          onChange={(betAmount) => patch({ betAmount })}
          onQuickAdjust={() => kenoSoundService.playAction()}
        />
        <KenoRiskSelect />
      </Flex>
      <Flex direction="column" gap="2">
        <Grid columns="2" gap="2" width="100%">
          <Button
            size="2"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              kenoSoundService.playAction();
              autoPick();
            }}
          >
            {t('kenoAutoPick')}
          </Button>
          <Button
            size="2"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              kenoSoundService.playAction();
              clearPicks();
            }}
          >
            {t('kenoClear')}
          </Button>
        </Grid>
        <Button
          disabled={!canPlaceManualBet || isPending}
          size="3"
          onClick={() => mutate()}
        >
          {isPending ? t('kenoPlacingBet') : t('kenoPlaceBet')}
        </Button>
      </Flex>
    </Flex>
  );
};
