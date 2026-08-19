import { Popover, TextField } from '@radix-ui/themes';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import './combobox-select.scss';

export type ComboboxSelectOption = {
  value: string;
  label: string;
  leading?: ReactNode;
};

type ComboboxSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  hasError?: boolean;
  disabled?: boolean;
};

export const ComboboxSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  hasError,
  disabled,
}: ComboboxSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    if (!next) setSearch('');
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger>
        <button
          type="button"
          disabled={disabled}
          className={clsx(
            'combobox-select__trigger',
            hasError && 'combobox-select__trigger--error',
          )}
        >
          <span
            className={clsx(
              'combobox-select__trigger-text',
              !selectedOption && 'combobox-select__trigger-text--placeholder',
            )}
          >
            {selectedOption ? (
              <span className="combobox-select__option-content">
                {selectedOption.leading}
                <span>{selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <CaretDownIcon size={14} className="combobox-select__caret" />
        </button>
      </Popover.Trigger>

      <Popover.Content
        className="combobox-select__content"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <TextField.Root
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="combobox-select__list">
          {filtered.length === 0 ? (
            <div className="combobox-select__empty">No results</div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={clsx(
                  'combobox-select__item',
                  option.value === value && 'combobox-select__item--selected',
                )}
                onClick={() => handleSelect(option.value)}
              >
                <span className="combobox-select__option-content">
                  {option.leading}
                  <span>{option.label}</span>
                </span>
                {option.value === value && <CheckIcon size={14} />}
              </button>
            ))
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
};
