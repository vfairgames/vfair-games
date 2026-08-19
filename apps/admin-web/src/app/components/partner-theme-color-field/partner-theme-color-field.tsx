import { Flex, Text, TextField } from '@radix-ui/themes';
import './partner-theme-color-field.scss';

const toColorInputValue = (value: string): string => {
  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
};

type PartnerThemeColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const PartnerThemeColorField = ({
  label,
  value,
  onChange,
}: PartnerThemeColorFieldProps) => (
  <Flex direction="column" gap="1">
    <Text as="label" size="2" weight="medium">
      {label}
    </Text>
    <Flex gap="2" className="partner-theme-color-field__row">
      <TextField.Root
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#000000"
      />
      <input
        type="color"
        className="partner-theme-color-field__input"
        value={toColorInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} picker`}
      />
    </Flex>
  </Flex>
);
