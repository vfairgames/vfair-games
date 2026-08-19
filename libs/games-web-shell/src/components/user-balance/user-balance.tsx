import { Box, Text, TextField } from '@radix-ui/themes';
import { useId, useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useMainStore } from '../../store/main-store/main-store';
import { CurrencyFlag } from '../currency-flag/currency-flag';

type UserBalanceProps = {
  balance: number;
  locale?: string;
};

export const UserBalance = ({ balance, locale }: UserBalanceProps) => {
  const inputId = useId();
  const { t } = useTranslation();
  const formatCurrency = useMainStore((s) => s.formatCurrency);

  const formattedBalance = useMemo(
    () => formatCurrency(balance, locale ? { locale } : undefined),
    [balance, formatCurrency, locale],
  );

  return (
    <Box>
      <Text as="label" htmlFor={inputId} size="2" weight="medium">
        {t('shellBalance')}
      </Text>
      <TextField.Root id={inputId} value={formattedBalance} readOnly size="3">
        <TextField.Slot side="right">
          <CurrencyFlag />
        </TextField.Slot>
      </TextField.Root>
    </Box>
  );
};
