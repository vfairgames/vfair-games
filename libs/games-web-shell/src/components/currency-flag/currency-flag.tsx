import { Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { useMainStore } from '../../store/main-store/main-store';
import './currency-flag.scss';

export const CurrencyFlag = () => {
  const currency = useMainStore((s) => s.currency);
  const countryCode = useMainStore((s) => s.countryCode);

  return (
    <Tooltip content={currency}>
      <span
        className={clsx(`fi fi-${countryCode.toLowerCase()}`, 'currency-flag')}
      />
    </Tooltip>
  );
};
