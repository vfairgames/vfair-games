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
  useIsDiceAutoBetInProgress,
  useIsDiceManualBetInProgress,
} from '../../../query/use-is-dice-bet-in-progress';
import { usePlaceAutoBet } from '../../../query/use-place-auto-bet';
import { diceSoundService } from '../../../services/dice-sound.service';
import { useDiceForm } from '../../../store/hooks/use-dice-form';

export const DiceAutoBetControls = () => {
  const { t } = useTranslation();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { form, errors, canStartAutoBet, canSaveAutoBetSettings, patch } =
    useDiceForm();
  const { mutate, stop, isPending, isStopping } = usePlaceAutoBet();
  const isAutoBetStopping = isStopping && isPending;
  const isAutoBetInProgress = useIsDiceAutoBetInProgress();
  const isManualBetInProgress = useIsDiceManualBetInProgress();
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
            onQuickAdjust={() => diceSoundService.playAction()}
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
              diceSoundService.playAction();
              setIsConfiguring(false);
            }}
          >
            {t('diceSaveChanges')}
          </Button>
        ) : (
          <Button
            size="3"
            variant="outline"
            disabled={isAutoBetInProgress}
            onClick={() => {
              diceSoundService.playAction();
              setIsConfiguring(true);
            }}
          >
            {t('diceConfigureAutoBet')}
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
            ? t('diceStopping')
            : isPending
              ? t('diceStopAutoBet')
              : t('diceStartAutoBet')}
        </Button>
      </Flex>
    </Flex>
  );
};
