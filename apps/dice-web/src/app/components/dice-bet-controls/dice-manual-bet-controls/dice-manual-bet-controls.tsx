import { calculateProfitOnWin } from '@vfair/game-math';
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
import { diceSoundService } from '../../../services/dice-sound.service';
import { useDiceForm } from '../../../store/hooks/use-dice-form';

export const DiceManualBetControls = () => {
  const { t } = useTranslation();
  const { form, errors, canPlaceManualBet, patch } = useDiceForm();
  const { mutate, isPending } = usePlaceManualBet();
  const mainStore = useMainStore(useShallow(selectManualBetMainStore));

  const profitOnWin = useMemo(
    () =>
      calculateProfitOnWin(
        form.betAmount,
        form.multiplier,
        mainStore.currencyDecimals,
      ),
    [form.betAmount, form.multiplier, mainStore.currencyDecimals],
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
          onQuickAdjust={() => diceSoundService.playAction()}
        />
        <ProfitOnWin value={profitOnWin} />
      </Flex>
      <Button
        size="3"
        disabled={!canPlaceManualBet || isPending}
        onClick={() => mutate()}
      >
        {isPending ? t('dicePlacingBet') : t('dicePlaceBet')}
      </Button>
    </Flex>
  );
};
