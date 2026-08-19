import { formatCurrency } from '@vfair/app-common';

export const formatKpiRtp = (value: number | null): string => {
  if (value === null) {
    return '—';
  }

  return `${(value * 100).toFixed(2)}%`;
};

export const formatKpiMoney = (
  amount: number,
  currency: { code: string; decimals: number },
): string =>
  formatCurrency(amount, {
    currency: currency.code,
    decimals: currency.decimals,
  });
