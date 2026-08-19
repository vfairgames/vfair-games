import {
  calculateProfitOnWin,
  LIMBO_MULTIPLIER_DECIMALS,
} from '@vfair/game-math';
import { Button, Flex } from '@radix-ui/themes';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  BetAmountInput,
  ProfitOnWin,
  UserBalance,
  selectManualBetMainStore,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';
import { usePlaceManualBet } from '../../../query/use-place-manual-bet';
import { limboSoundService } from '../../../services/limbo-sound.service';
import { useLimboForm } from '../../../store/hooks/use-limbo-form';

export const LimboManualBetControls = () => {
  const { t } = useTranslation();
  const { form, errors, canPlaceManualBet, patch } = useLimboForm();
  const { mutate, isPending } = usePlaceManualBet();
  const mainStore = useMainStore(useShallow(selectManualBetMainStore));

  const profitOnWin = useMemo(
    () =>
      calculateProfitOnWin(
        form.betAmount,
        form.targetMultiplier,
        mainStore.currencyDecimals,
        LIMBO_MULTIPLIER_DECIMALS,
      ),
    [form.betAmount, form.targetMultiplier, mainStore.currencyDecimals],
  );

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
          onChange={(betAmount) => patch({ betAmount })}
          onQuickAdjust={() => limboSoundService.playAction()}
        />
        <ProfitOnWin value={profitOnWin} />
      </Flex>
      <Button
        size="3"
        disabled={!canPlaceManualBet || isPending}
        onClick={() => mutate()}
      >
        {isPending ? t('limboPlacingBet') : t('limboPlaceBet')}
      </Button>
    </Flex>
  );
};
