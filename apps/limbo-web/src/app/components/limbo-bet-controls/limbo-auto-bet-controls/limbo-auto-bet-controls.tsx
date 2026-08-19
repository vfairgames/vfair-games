import { Button, Flex } from '@radix-ui/themes';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  AutoBetCountInput,
  AutobetSettings,
  BetAmountInput,
  UserBalance,
  selectBetLimits,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';
import {
  useIsLimboAutoBetInProgress,
  useIsLimboManualBetInProgress,
} from '../../../query/use-is-limbo-bet-in-progress';
import { usePlaceAutoBet } from '../../../query/use-place-auto-bet';
import { limboSoundService } from '../../../services/limbo-sound.service';
import { useLimboForm } from '../../../store/hooks/use-limbo-form';

export const LimboAutoBetControls = () => {
  const { t } = useTranslation();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { form, errors, canStartAutoBet, canSaveAutoBetSettings, patch } =
    useLimboForm();
  const { mutate, stop, isPending, isStopping } = usePlaceAutoBet();
  const isAutoBetStopping = isStopping && isPending;
  const isAutoBetInProgress = useIsLimboAutoBetInProgress();
  const isManualBetInProgress = useIsLimboManualBetInProgress();
  const mainStore = useMainStore(useShallow(selectBetLimits));

  return (
    <Flex
      className="game-bet-controls"
      gap="2"
      direction="column"
      justify="between"
      flexGrow="1"
      align="stretch"
    >
      {isConfiguring ? (
        <AutobetSettings
          balance={mainStore.balance}
          onWinMode={form.onWinMode}
          onWinPercent={form.onWinPercent}
          onWinPercentError={errors.onWinPercent}
          onLossMode={form.onLossMode}
          onLossPercent={form.onLossPercent}
          onLossPercentError={errors.onLossPercent}
          stopOnLoss={form.stopOnLoss}
          stopOnLossError={errors.stopOnLoss}
          stopOnProfit={form.stopOnProfit}
          stopOnProfitError={errors.stopOnProfit}
          onOnWinModeChange={(onWinMode) => patch({ onWinMode })}
          onOnWinPercentChange={(onWinPercent) => patch({ onWinPercent })}
          onOnLossModeChange={(onLossMode) => patch({ onLossMode })}
          onOnLossPercentChange={(onLossPercent) => patch({ onLossPercent })}
          onStopOnLossChange={(stopOnLoss) => patch({ stopOnLoss })}
          onStopOnProfitChange={(stopOnProfit) => patch({ stopOnProfit })}
        />
      ) : (
        <Flex gap="2" direction="column">
          <UserBalance balance={mainStore.balance} />
          <BetAmountInput
            value={form.betAmount}
            error={errors.betAmount}
            min={mainStore.minBet}
            max={mainStore.maxBet}
            disabled={isAutoBetInProgress}
            onChange={(betAmount) => patch({ betAmount })}
            onQuickAdjust={() => limboSoundService.playAction()}
          />
          <AutoBetCountInput
            value={form.autoBetCount}
            error={errors.autoBetCount}
            disabled={isAutoBetInProgress}
            onChange={(autoBetCount) => patch({ autoBetCount })}
          />
        </Flex>
      )}
      <Flex gap="2" direction="column" align="stretch">
        {isConfiguring ? (
          <Button
            size="3"
            variant="outline"
            disabled={isAutoBetInProgress || !canSaveAutoBetSettings}
            onClick={() => {
              limboSoundService.playAction();
              setIsConfiguring(false);
            }}
          >
            {t('limboSaveChanges')}
          </Button>
        ) : (
          <Button
            size="3"
            variant="outline"
            disabled={isAutoBetInProgress}
            onClick={() => {
              limboSoundService.playAction();
              setIsConfiguring(true);
            }}
          >
            {t('limboConfigureAutoBet')}
          </Button>
        )}
        <Button
          size="3"
          disabled={
            isConfiguring ||
            isAutoBetStopping ||
            (!isPending && (!canStartAutoBet || isManualBetInProgress))
          }
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
            ? t('limboStopping')
            : isPending
              ? t('limboStopAutoBet')
              : t('limboStartAutoBet')}
        </Button>
      </Flex>
    </Flex>
  );
};
