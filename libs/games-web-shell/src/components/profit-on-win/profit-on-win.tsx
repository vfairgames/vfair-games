import { Text, TextField } from '@radix-ui/themes';
import { useId, useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useMainStore } from '../../store/main-store/main-store';
import { CurrencyFlag } from '../currency-flag/currency-flag';

type ProfitOnWinProps = {
  value: number;
  label?: string;
};

export const ProfitOnWin = ({ value, label }: ProfitOnWinProps) => {
  const inputId = useId();
  const { t } = useTranslation();
  const formatCurrency = useMainStore((s) => s.formatCurrency);

  const formattedValue = useMemo(
    () => formatCurrency(value > 0 ? value : 0),
    [formatCurrency, value],
  );

  return (
    <div>
      <Text as="label" htmlFor={inputId} size="2" weight="medium">
        {label ?? t('shellProfitOnWin')}
      </Text>
      <TextField.Root id={inputId} size="3" value={formattedValue} readOnly>
        <TextField.Slot side="right">
          <CurrencyFlag />
        </TextField.Slot>
      </TextField.Root>
    </div>
  );
};
