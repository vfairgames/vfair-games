import clsx from 'clsx';
import { getCountryByCurrency, type Currency } from '@vfair/app-common';
import './currency-flag-icon.scss';

type CurrencyFlagIconProps = {
  currency: string;
};

export const CurrencyFlagIcon = ({ currency }: CurrencyFlagIconProps) => (
  <span
    className={clsx(
      `fi fi-${getCountryByCurrency(currency as Currency)}`,
      'currency-flag-icon',
    )}
  />
);
