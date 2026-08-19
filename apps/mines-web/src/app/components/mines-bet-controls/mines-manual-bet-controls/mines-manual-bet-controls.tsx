import {
  calculateProfitOnWin,
  MINES_MULTIPLIER_DECIMALS,
} from '@vfair/game-math';
import { Button, Flex } from '@radix-ui/themes';
import { useShallow } from 'zustand/react/shallow';

import {
  BetAmountInput,
  ProfitOnWin,
  UserBalance,
  selectManualBetMainStore,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import { useIsMinesRevealInProgress } from '../../../query/use-is-mines-bet-in-progress';
import {
  useCashOut,
  usePlaceManualBet,
  useRevealTile,
} from '../../../query/use-place-manual-bet';
import { minesGameService } from '../../../services/mines-game.service';
import { minesSoundService } from '../../../services/mines-sound.service';
import { useMinesForm } from '../../../store/hooks/use-mines-form';
import { useMinesGameStore } from '../../../store/mines-game-store';
import {
  MinesCountSelect,
  MinesGemsField,
} from '../../mines-count-select/mines-count-select';

export const MinesManualBetControls = () => {
  const { t } = useTranslation();
  const { form, errors, canPlaceManualBet, patch, minesOdds, roundStatus } =
    useMinesForm();
  const activeRound = useMinesGameStore((state) => state.activeRound);
  const { mutate: placeBet, isPending: isPlacing } = usePlaceManualBet();
  const { mutate: revealTile } = useRevealTile();
  const { mutate: cashOut, isPending: isCashingOut } = useCashOut();
  const isRevealInProgress = useIsMinesRevealInProgress();
  const mainStore = useMainStore(useShallow(selectManualBetMainStore));
  const isActive = roundStatus === 'active';
  const revealCount = activeRound?.reveals.length ?? 0;
  const isBusy = isPlacing || isCashingOut || isRevealInProgress;
  const currentMultiplier = activeRound
    ? minesOdds.getMultiplier(activeRound.mineCount, revealCount)
    : 1;
  const totalProfit =
    activeRound && revealCount > 0
      ? calculateProfitOnWin(
          activeRound.betAmount,
          currentMultiplier,
          mainStore.currencyDecimals,
          MINES_MULTIPLIER_DECIMALS,
        )
      : 0;

  return (
    <Flex
      className="game-bet-controls"
      gap="2"
      direction="column"
      justify="between"
      flexGrow="1"
      align="stretch"
    >
      <Flex gap="2" direction="column">
        <UserBalance balance={mainStore.balance} />
        <BetAmountInput
          value={form.betAmount}
          error={errors.betAmount}
          min={mainStore.minBet}
          max={mainStore.maxBet}
          disabled={isActive}
          onChange={(betAmount) => patch({ betAmount })}
          onQuickAdjust={() => minesSoundService.playAction()}
        />
        <MinesCountSelect
          value={form.mineCount}
          disabled={isActive}
          error={errors.mineCount}
          onChange={(mineCount) => patch({ mineCount })}
        />
        <MinesGemsField value={minesOdds.getGemCount(form.mineCount)} />
        <ProfitOnWin
          label={t('minesTotalProfitWithMultiplier', {
            multiplier: currentMultiplier.toFixed(2),
          })}
          value={totalProfit}
        />
      </Flex>
      <Flex gap="2" direction="column" align="stretch">
        {isActive ? (
          <Button
            size="3"
            disabled={isBusy || revealCount === 0}
            loading={isCashingOut || isRevealInProgress}
            onClick={() => cashOut()}
          >
            {isCashingOut ? t('minesCashingOut') : t('minesCashOut')}
          </Button>
        ) : (
          <Button
            size="3"
            disabled={!canPlaceManualBet || isBusy}
            onClick={() => placeBet()}
          >
            {isPlacing ? t('minesPlacingBet') : t('minesPlaceBet')}
          </Button>
        )}
        <Button
          size="3"
          variant="outline"
          disabled={!isActive || isBusy}
          onClick={() => {
            const tile = minesGameService.getRandomUnrevealedTile();

            if (tile === null) {
              return;
            }

            minesSoundService.playAction();
            revealTile(tile);
          }}
        >
          {t('minesRandomPick')}
        </Button>
      </Flex>
    </Flex>
  );
};
