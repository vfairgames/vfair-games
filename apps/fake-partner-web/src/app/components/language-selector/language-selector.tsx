import { Button, DropdownMenu, Text } from '@radix-ui/themes';
import { CaretDownIcon } from '@phosphor-icons/react';
import './language-selector.scss';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
] as const;

export type GameLanguage = (typeof LANGUAGES)[number]['code'];

type LanguageSelectorProps = {
  value: GameLanguage;
  onChange: (lang: GameLanguage) => void;
};

export const LanguageSelector = ({
  value,
  onChange,
}: LanguageSelectorProps) => {
  const active =
    LANGUAGES.find((language) => language.code === value) ?? LANGUAGES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          className="language-selector__trigger"
          size="2"
          variant="soft"
          color="gray"
        >
          <Text size="2" weight="medium">
            {active.label}
          </Text>
          <CaretDownIcon size={14} className="language-selector__caret" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="center">
        {LANGUAGES.map((language) => (
          <DropdownMenu.Item
            key={language.code}
            onSelect={() => onChange(language.code)}
          >
            <Text size="2">{language.label}</Text>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
