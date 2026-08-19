import { Button, Flex, Grid } from '@radix-ui/themes';
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
  useIsKenoAutoBetInProgress,
  useIsKenoManualBetInProgress,
} from '../../query/use-is-keno-bet-in-progress';
import { usePlaceAutoBet } from '../../query/use-place-auto-bet';
import { kenoSoundService } from '../../services/keno-sound.service';
import { useKenoForm } from '../../store/hooks/use-keno-form';
import { useKenoGameStore } from '../../store/keno-game-store';
import { KenoRiskSelect } from '../keno-risk-select/keno-risk-select';

export const KenoAutoBetControls = () => {
  const { t } = useTranslation();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { form, errors, canStartAutoBet, canSaveAutoBetSettings, patch } =
    useKenoForm();
  const { mutate, stop, isPending, isStopping } = usePlaceAutoBet();
  const isAutoBetStopping = isStopping && isPending;
  const isAutoBetInProgress = useIsKenoAutoBetInProgress();
  const isManualBetInProgress = useIsKenoManualBetInProgress();
  const mainStore = useMainStore(useShallow(selectBetLimits));
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
        <Flex direction="column" gap="2">
          <UserBalance balance={mainStore.balance} />
          <BetAmountInput
            disabled={isAutoBetInProgress}
            error={errors.betAmount}
            max={mainStore.maxBet}
            min={mainStore.minBet}
            value={form.betAmount}
            onChange={(betAmount) => patch({ betAmount })}
            onQuickAdjust={() => kenoSoundService.playAction()}
          />
          <AutoBetCountInput
            disabled={isAutoBetInProgress}
            error={errors.autoBetCount}
            value={form.autoBetCount}
            onChange={(autoBetCount) => patch({ autoBetCount })}
          />
          <KenoRiskSelect />
        </Flex>
      )}
      <Flex align="stretch" direction="column" gap="2">
        {!isConfiguring ? (
          <Grid columns="2" gap="2" width="100%">
            <Button
              size="2"
              variant="outline"
              disabled={isAutoBetInProgress}
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
              disabled={isAutoBetInProgress}
              onClick={() => {
                kenoSoundService.playAction();
                clearPicks();
              }}
            >
              {t('kenoClear')}
            </Button>
          </Grid>
        ) : null}
        {isConfiguring ? (
          <Button
            disabled={isAutoBetInProgress || !canSaveAutoBetSettings}
            size="3"
            variant="outline"
            onClick={() => {
              kenoSoundService.playAction();
              setIsConfiguring(false);
            }}
          >
            {t('diceSaveChanges')}
          </Button>
        ) : (
          <Button
            disabled={isAutoBetInProgress}
            size="3"
            variant="outline"
            onClick={() => {
              kenoSoundService.playAction();
              setIsConfiguring(true);
            }}
          >
            {t('diceConfigureAutoBet')}
          </Button>
        )}
        <Button
          disabled={
            isConfiguring ||
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
            ? t('diceStopping')
            : isPending
              ? t('diceStopAutoBet')
              : t('diceStartAutoBet')}
        </Button>
      </Flex>
    </Flex>
  );
};
