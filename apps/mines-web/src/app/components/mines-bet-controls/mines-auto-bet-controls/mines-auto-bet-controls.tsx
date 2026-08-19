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
  useIsMinesAutoBetInProgress,
  useIsMinesManualBetInProgress,
} from '../../../query/use-is-mines-bet-in-progress';
import { usePlaceAutoBet } from '../../../query/use-place-auto-bet';
import { minesSoundService } from '../../../services/mines-sound.service';
import { useMinesForm } from '../../../store/hooks/use-mines-form';
import {
  MinesCountSelect,
  MinesGemsField,
} from '../../mines-count-select/mines-count-select';

export const MinesAutoBetControls = () => {
  const { t } = useTranslation();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const {
    form,
    errors,
    canStartAutoBet,
    canSaveAutoBetSettings,
    patch,
    selectedTiles,
  } = useMinesForm();
  const { mutate, stop, isPending, isStopping } = usePlaceAutoBet();
  const isAutoBetStopping = isStopping && isPending;
  const isAutoBetInProgress = useIsMinesAutoBetInProgress();
  const isManualBetInProgress = useIsMinesManualBetInProgress();
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
            onQuickAdjust={() => minesSoundService.playAction()}
          />
          <MinesCountSelect
            value={form.mineCount}
            disabled={isAutoBetInProgress}
            error={errors.mineCount}
            onChange={(mineCount) => patch({ mineCount })}
          />
          <MinesGemsField
            label={t('minesSelectedTiles')}
            value={selectedTiles.length}
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
              minesSoundService.playAction();
              setIsConfiguring(false);
            }}
          >
            {t('minesSaveChanges')}
          </Button>
        ) : (
          <Button
            size="3"
            variant="outline"
            disabled={isAutoBetInProgress}
            onClick={() => {
              minesSoundService.playAction();
              setIsConfiguring(true);
            }}
          >
            {t('minesConfigureAutoBet')}
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
            ? t('minesStopping')
            : isPending
              ? t('minesStopAutoBet')
              : t('minesStartAutoBet')}
        </Button>
      </Flex>
    </Flex>
  );
};
