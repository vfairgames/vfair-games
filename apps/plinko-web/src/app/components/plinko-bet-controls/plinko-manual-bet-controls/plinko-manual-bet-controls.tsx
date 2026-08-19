import { Button, Flex } from '@radix-ui/themes';
import { useShallow } from 'zustand/react/shallow';

import {
  BetAmountInput,
  UserBalance,
  selectManualBetMainStore,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import { usePlaceManualBet } from '../../../query/use-place-manual-bet';
import { plinkoSoundService } from '../../../services/plinko-sound.service';
import { usePlinkoForm } from '../../../store/hooks/use-plinko-form';
import { PlinkoRiskRowsControls } from '../plinko-risk-rows-controls/plinko-risk-rows-controls';

export const PlinkoManualBetControls = () => {
  const { t } = useTranslation();
  const { form, errors, canPlaceManualBet, patch } = usePlinkoForm();
  const { mutate, isPending } = usePlaceManualBet();
  const mainStore = useMainStore(useShallow(selectManualBetMainStore));

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
          onQuickAdjust={() => plinkoSoundService.playAction()}
        />
        <PlinkoRiskRowsControls />
      </Flex>
      <Button
        disabled={!canPlaceManualBet || isPending}
        size="3"
        onClick={() => mutate()}
      >
        {isPending ? t('plinkoPlacingBet') : t('plinkoPlaceBet')}
      </Button>
    </Flex>
  );
};
