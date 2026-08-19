import { Flex, IconButton, Text, TextField, Tooltip } from '@radix-ui/themes';
import { CopyIcon } from '@phosphor-icons/react';
import { useId } from 'react';

import { useTranslation } from '../../i18n/i18n';
import { copyToClipboard } from '../../utils/copy-to-clipboard';

import './copyable-text-field.scss';

type CopyableTextFieldProps = {
  label: string;
  value: string;
};

export const CopyableTextField = ({ label, value }: CopyableTextFieldProps) => {
  const inputId = useId();
  const { t } = useTranslation();

  const handleCopy = () => {
    void copyToClipboard(value);
  };

  return (
    <Flex className="copyable-text-field" direction="column" gap="1">
      <Text as="label" htmlFor={inputId} size="2" weight="medium">
        {label}
      </Text>
      <TextField.Root id={inputId} readOnly size="3" value={value}>
        <TextField.Slot side="right">
          <Tooltip content={t('shellCopy')}>
            <IconButton
              variant="ghost"
              size="1"
              aria-label={t('shellCopyField', { label })}
              onClick={handleCopy}
            >
              <CopyIcon size={14} />
            </IconButton>
          </Tooltip>
        </TextField.Slot>
      </TextField.Root>
    </Flex>
  );
};
