import { IconButton, TextField } from '@radix-ui/themes';
import { InfinityIcon } from '@phosphor-icons/react';

import { useTranslation } from '../../i18n/i18n';
import { NumericInput } from '../numeric-input/numeric-input';
import './auto-bet-count-input.scss';

type AutoBetCountInputProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
};

export const AutoBetCountInput = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
}: AutoBetCountInputProps) => {
  const { t } = useTranslation();
  const infinite = value === 0;
  const resolvedLabel = label ?? t('shellNumberOfBets');

  return (
    <NumericInput
      className="auto-bet-count-input"
      label={resolvedLabel}
      error={error}
      value={value}
      integer
      min={0}
      disabled={disabled}
      onChange={onChange}
    >
      <TextField.Slot side="right" className="auto-bet-count-input__slot">
        <IconButton
          size="2"
          type="button"
          variant={infinite ? 'solid' : 'soft'}
          disabled={disabled}
          aria-label={
            infinite ? t('shellLimitedBets') : t('shellUnlimitedBets')
          }
          onClick={() => onChange(0)}
        >
          <InfinityIcon size={14} />
        </IconButton>
      </TextField.Slot>
    </NumericInput>
  );
};
