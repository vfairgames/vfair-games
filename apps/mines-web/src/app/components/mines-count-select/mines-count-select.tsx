import { MAX_MINE_COUNT, MIN_MINE_COUNT } from '@vfair/game-math';
import { Flex, Select, Text, TextField } from '@radix-ui/themes';
import { useId } from 'react';

import { useTranslation } from '@vfair/games-web-shell';

import './mines-count-select.scss';

const MINE_COUNT_OPTIONS = Array.from(
  { length: MAX_MINE_COUNT - MIN_MINE_COUNT + 1 },
  (_, index) => MIN_MINE_COUNT + index,
);

type MinesCountSelectProps = {
  value: number;
  disabled?: boolean;
  error?: string;
  onChange: (mineCount: number) => void;
};

export const MinesCountSelect = ({
  value,
  disabled,
  error,
  onChange,
}: MinesCountSelectProps) => {
  const { t } = useTranslation();
  const selectId = useId();

  return (
    <Flex className="mines-count-select" direction="column" gap="1">
      <Text as="label" htmlFor={selectId} size="2" weight="medium">
        {t('minesMineCount')}
      </Text>
      <Select.Root
        size="3"
        value={String(value)}
        disabled={disabled}
        onValueChange={(next) => onChange(Number(next))}
      >
        <Select.Trigger
          id={selectId}
          color={error ? 'red' : undefined}
          className="mines-count-select__trigger"
        />
        <Select.Content position="popper">
          {MINE_COUNT_OPTIONS.map((mineCount) => (
            <Select.Item key={mineCount} value={String(mineCount)}>
              {mineCount}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      {error ? (
        <Text size="1" color="red">
          {error}
        </Text>
      ) : null}
    </Flex>
  );
};

type MinesGemsFieldProps = {
  value: number;
  label?: string;
};

export const MinesGemsField = ({ value, label }: MinesGemsFieldProps) => {
  const { t } = useTranslation();
  const inputId = useId();

  return (
    <div>
      <Text as="label" htmlFor={inputId} size="2" weight="medium">
        {label ?? t('minesGems')}
      </Text>
      <TextField.Root id={inputId} size="3" value={String(value)} readOnly />
    </div>
  );
};
