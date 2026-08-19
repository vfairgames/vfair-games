import { multiplyDecimals } from '@vfair/game-math';
import { Button, TextField } from '@radix-ui/themes';
import { currencyStep } from '@vfair/app-common';
import { useTranslation } from '../../i18n/i18n';
import { useMainStore } from '../../store/main-store/main-store';
import { CurrencyFlag } from '../currency-flag/currency-flag';
import { NumericInput } from '../numeric-input/numeric-input';
import './bet-amount-input.scss';

type BetAmountInputProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onQuickAdjust?: () => void;
};

export const BetAmountInput = ({
  value,
  onChange,
  label,
  error,
  min = 0,
  max,
  step,
  disabled = false,
  onQuickAdjust,
}: BetAmountInputProps) => {
  const { t } = useTranslation();
  const currencyDecimals = useMainStore((s) => s.currencyDecimals);
  const roundToCurrency = useMainStore((s) => s.roundToCurrency);
  const resolvedStep = step ?? currencyStep(currencyDecimals);
  const resolvedLabel = label ?? t('shellBetAmount');

  const handleChange = (next: number) => {
    onChange(roundToCurrency(next));
  };

  const handleHalve = () => {
    if (!value) {
      handleChange(min);
      onQuickAdjust?.();
      return;
    }
    handleChange(
      multiplyDecimals(
        { value, decimals: currencyDecimals },
        { value: 0.5, decimals: 1 },
        currencyDecimals,
      ),
    );
    onQuickAdjust?.();
  };

  const handleDouble = () => {
    if (!value) {
      handleChange(min);
      onQuickAdjust?.();
      return;
    }
    handleChange(
      multiplyDecimals(
        { value, decimals: currencyDecimals },
        { value: 2, decimals: 0 },
        currencyDecimals,
      ),
    );
    onQuickAdjust?.();
  };

  return (
    <NumericInput
      className="bet-amount-input"
      label={resolvedLabel}
      error={error}
      value={value}
      min={min}
      max={max}
      step={resolvedStep}
      disabled={disabled}
      onChange={handleChange}
      fractionDigits={currencyDecimals}
    >
      <TextField.Slot
        side="right"
        gap="1"
        className="bet-amount-input__right_slot"
      >
        <span className="bet-amount-input__currency_flag">
          <CurrencyFlag />
        </span>
        <Button
          size="2"
          type="button"
          variant="soft"
          disabled={disabled}
          onClick={handleHalve}
        >
          1/2
        </Button>
        <Button
          size="2"
          type="button"
          variant="soft"
          disabled={disabled}
          onClick={handleDouble}
        >
          2x
        </Button>
      </TextField.Slot>
    </NumericInput>
  );
};
