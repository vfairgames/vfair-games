import {
  MAX_PLINKO_ROWS,
  MIN_PLINKO_ROWS,
  PLINKO_RISKS,
  type PlinkoRisk,
} from '@vfair/game-math';
import { Flex, Select, Text } from '@radix-ui/themes';
import { useId } from 'react';

import { useTranslation } from '@vfair/games-web-shell';

import { useIsPlinkoBetInProgress } from '../../../query/use-is-plinko-bet-in-progress';
import { plinkoSoundService } from '../../../services/plinko-sound.service';
import { usePlinkoForm } from '../../../store/hooks/use-plinko-form';

import './plinko-risk-rows-controls.scss';

const ROW_OPTIONS = Array.from(
  { length: MAX_PLINKO_ROWS - MIN_PLINKO_ROWS + 1 },
  (_, index) => MIN_PLINKO_ROWS + index,
);

const riskLabelKey = (risk: PlinkoRisk): string => {
  switch (risk) {
    case 'easy':
      return 'plinkoRiskEasy';
    case 'medium':
      return 'plinkoRiskMedium';
    case 'hard':
      return 'plinkoRiskHard';
    case 'expert':
      return 'plinkoRiskExpert';
  }
};

export const PlinkoRiskRowsControls = () => {
  const { t } = useTranslation();
  const { form, errors, patch } = usePlinkoForm();
  const isBetInProgress = useIsPlinkoBetInProgress();
  const riskSelectId = useId();
  const rowsSelectId = useId();

  return (
    <Flex direction="column" gap="2">
      <Flex className="plinko-risk-rows-controls" direction="column" gap="1">
        <Text as="label" htmlFor={riskSelectId} size="2" weight="medium">
          {t('plinkoRisk')}
        </Text>
        <Select.Root
          size="3"
          value={form.risk}
          disabled={isBetInProgress}
          onValueChange={(risk) => {
            plinkoSoundService.playAction();
            patch({ risk: risk as PlinkoRisk });
          }}
        >
          <Select.Trigger
            id={riskSelectId}
            color={errors.risk ? 'red' : undefined}
            className="plinko-risk-rows-controls__trigger"
          />
          <Select.Content position="popper">
            {PLINKO_RISKS.map((risk) => (
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

      <Flex className="plinko-risk-rows-controls" direction="column" gap="1">
        <Text as="label" htmlFor={rowsSelectId} size="2" weight="medium">
          {t('plinkoRows')}
        </Text>
        <Select.Root
          size="3"
          value={String(form.rows)}
          disabled={isBetInProgress}
          onValueChange={(next) => {
            plinkoSoundService.playAction();
            patch({ rows: Number(next) });
          }}
        >
          <Select.Trigger
            id={rowsSelectId}
            color={errors.rows ? 'red' : undefined}
            className="plinko-risk-rows-controls__trigger"
          />
          <Select.Content position="popper">
            {ROW_OPTIONS.map((rows) => (
              <Select.Item key={rows} value={String(rows)}>
                {rows}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {errors.rows ? (
          <Text size="1" color="red">
            {errors.rows}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  );
};
