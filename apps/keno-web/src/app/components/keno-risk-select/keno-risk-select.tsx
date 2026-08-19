import { KENO_RISKS, type KenoRisk } from '@vfair/game-math';
import { Flex, Select, Text } from '@radix-ui/themes';
import { useId } from 'react';

import { useTranslation } from '@vfair/games-web-shell';

import { useIsKenoBetInProgress } from '../../query/use-is-keno-bet-in-progress';
import { kenoSoundService } from '../../services/keno-sound.service';
import { useKenoForm } from '../../store/hooks/use-keno-form';
import { useKenoGameStore } from '../../store/keno-game-store';

import './keno-risk-select.scss';

const riskLabelKey = (risk: KenoRisk): string => {
  switch (risk) {
    case 'classic':
      return 'kenoRiskClassic';
    case 'low':
      return 'kenoRiskLow';
    case 'medium':
      return 'kenoRiskMedium';
    case 'high':
      return 'kenoRiskHigh';
  }
};

export const KenoRiskSelect = () => {
  const { t } = useTranslation();
  const { form, errors, patch } = useKenoForm();
  const resetRound = useKenoGameStore((state) => state.resetRound);
  const isBetInProgress = useIsKenoBetInProgress();
  const riskSelectId = useId();

  return (
    <Flex className="keno-risk-select" direction="column" gap="1">
      <Text as="label" htmlFor={riskSelectId} size="2" weight="medium">
        {t('kenoRisk')}
      </Text>
      <Select.Root
        size="3"
        value={form.risk}
        disabled={isBetInProgress}
        onValueChange={(risk) => {
          kenoSoundService.playAction();
          resetRound();
          patch({ risk: risk as KenoRisk });
        }}
      >
        <Select.Trigger
          id={riskSelectId}
          color={errors.risk ? 'red' : undefined}
          className="keno-risk-select__trigger"
        />
        <Select.Content position="popper">
          {KENO_RISKS.map((risk) => (
            <Select.Item key={risk} value={risk}>
              {t(riskLabelKey(risk))}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      {errors.risk ? (
        <Text size="1" color="red">
          {errors.risk}
        </Text>
      ) : null}
    </Flex>
  );
};
