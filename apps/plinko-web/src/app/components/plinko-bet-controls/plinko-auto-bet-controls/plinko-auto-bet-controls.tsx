import { Button, Flex } from '@radix-ui/themes';
import { useShallow } from 'zustand/react/shallow';

import {
  AutoBetCountInput,
  BetAmountInput,
  UserBalance,
  selectBetLimits,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import {
  useIsPlinkoAutoBetInProgress,
  useIsPlinkoManualBetInProgress,
} from '../../../query/use-is-plinko-bet-in-progress';
import { usePlaceAutoBet } from '../../../query/use-place-auto-bet';
import { plinkoSoundService } from '../../../services/plinko-sound.service';
import { usePlinkoForm } from '../../../store/hooks/use-plinko-form';
import { PlinkoRiskRowsControls } from '../plinko-risk-rows-controls/plinko-risk-rows-controls';

export const PlinkoAutoBetControls = () => {
  const { t } = useTranslation();
  const { form, errors, canStartAutoBet, patch } = usePlinkoForm();
  const { mutate, stop, isPending, isStopping } = usePlaceAutoBet();
  const isAutoBetStopping = isStopping && isPending;
  const isAutoBetInProgress = useIsPlinkoAutoBetInProgress();
  const isManualBetInProgress = useIsPlinkoManualBetInProgress();
  const mainStore = useMainStore(useShallow(selectBetLimits));

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
          disabled={isAutoBetInProgress}
          error={errors.betAmount}
          max={mainStore.maxBet}
          min={mainStore.minBet}
          value={form.betAmount}
          onChange={(betAmount) => patch({ betAmount })}
          onQuickAdjust={() => plinkoSoundService.playAction()}
        />
        <AutoBetCountInput
          disabled={isAutoBetInProgress}
          error={errors.autoBetCount}
          value={form.autoBetCount}
          onChange={(autoBetCount) => patch({ autoBetCount })}
        />
        <PlinkoRiskRowsControls />
      </Flex>
      <Button
        disabled={
          isAutoBetStopping ||
          (!isPending && (!canStartAutoBet || isManualBetInProgress))
        }
        size="3"
        onClick={() => {
          if (isPending && !isStopping) {
            stop();
            return;
          }

          if (!isPending) {
            mutate();
          }
        }}
      >
        {isAutoBetStopping
          ? t('plinkoStopping')
          : isPending
            ? t('plinkoStopAutoBet')
            : t('plinkoStartAutoBet')}
      </Button>
    </Flex>
  );
};
