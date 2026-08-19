import { Button, Flex, Text, TextField } from '@radix-ui/themes';

import { useTranslation } from '../../i18n/i18n';
import type { AutoBetAdjustmentMode } from '../../store/game-store/bet-types';
import { CurrencyFlag } from '../currency-flag/currency-flag';
import { NumericInput } from '../numeric-input/numeric-input';
import { UserBalance } from '../user-balance/user-balance';

type AutoBetStrategyFieldProps = {
  label: string;
  mode: AutoBetAdjustmentMode;
  percent: number;
  percentError?: string;
  onModeChange: (mode: AutoBetAdjustmentMode) => void;
  onPercentChange: (percent: number) => void;
};

const AutoBetStrategyField = ({
  label,
  mode,
  percent,
  percentError,
  onModeChange,
  onPercentChange,
}: AutoBetStrategyFieldProps) => {
  const { t } = useTranslation();
  const increaseEnabled = mode === 'increase';
  const adjustmentOptions: { label: string; value: AutoBetAdjustmentMode }[] = [
    { label: t('shellReset'), value: 'reset' },
    { label: t('shellIncrease'), value: 'increase' },
  ];

  return (
    <Flex direction="column" gap="1">
      <Flex align="center" justify="between" gap="2">
        <Text as="span" size="2" weight="medium">
          {label}
        </Text>
        <Flex gap="1">
          {adjustmentOptions.map((option) => (
            <Button
              key={option.value}
              size="1"
              type="button"
              variant={mode === option.value ? 'solid' : 'soft'}
              aria-pressed={mode === option.value}
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </Flex>
      </Flex>
      <NumericInput
        value={percent}
        error={percentError}
        min={0}
        fractionDigits={2}
        readOnly={!increaseEnabled}
        onChange={onPercentChange}
      >
        <TextField.Slot side="right">%</TextField.Slot>
      </NumericInput>
    </Flex>
  );
};

type CurrencyLimitFieldProps = {
  label: string;
  value: number;
  error?: string;
  onChange: (value: number) => void;
};

const CurrencyLimitField = ({
  label,
  value,
  error,
  onChange,
}: CurrencyLimitFieldProps) => (
  <NumericInput
    label={label}
    value={value}
    error={error}
    min={0}
    onChange={onChange}
  >
    <TextField.Slot side="right">
      <CurrencyFlag />
    </TextField.Slot>
  </NumericInput>
);

type AutobetSettingsProps = {
  balance: number;
  onWinMode: AutoBetAdjustmentMode;
  onWinPercent: number;
  onWinPercentError?: string;
  onLossMode: AutoBetAdjustmentMode;
  onLossPercent: number;
  onLossPercentError?: string;
  stopOnLoss: number;
  stopOnLossError?: string;
  stopOnProfit: number;
  stopOnProfitError?: string;
  onOnWinModeChange: (mode: AutoBetAdjustmentMode) => void;
  onOnWinPercentChange: (percent: number) => void;
  onOnLossModeChange: (mode: AutoBetAdjustmentMode) => void;
  onOnLossPercentChange: (percent: number) => void;
  onStopOnLossChange: (value: number) => void;
  onStopOnProfitChange: (value: number) => void;
};

export const AutobetSettings = ({
  balance,
  onWinMode,
  onWinPercent,
  onWinPercentError,
  onLossMode,
  onLossPercent,
  onLossPercentError,
  stopOnLoss,
  stopOnLossError,
  stopOnProfit,
  stopOnProfitError,
  onOnWinModeChange,
  onOnWinPercentChange,
  onOnLossModeChange,
  onOnLossPercentChange,
  onStopOnLossChange,
  onStopOnProfitChange,
}: AutobetSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Flex gap="2" direction="column">
      <UserBalance balance={balance} />
      <AutoBetStrategyField
        label={t('shellOnWin')}
        mode={onWinMode}
        percent={onWinPercent}
        percentError={onWinPercentError}
        onModeChange={onOnWinModeChange}
        onPercentChange={onOnWinPercentChange}
      />
      <AutoBetStrategyField
        label={t('shellOnLoss')}
        mode={onLossMode}
        percent={onLossPercent}
        percentError={onLossPercentError}
        onModeChange={onOnLossModeChange}
        onPercentChange={onOnLossPercentChange}
      />
      <CurrencyLimitField
        label={t('shellStopOnLoss')}
        value={stopOnLoss}
        error={stopOnLossError}
        onChange={onStopOnLossChange}
      />
      <CurrencyLimitField
        label={t('shellStopOnProfit')}
        value={stopOnProfit}
        error={stopOnProfitError}
        onChange={onStopOnProfitChange}
      />
    </Flex>
  );
};
