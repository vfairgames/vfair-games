import { Text, TextField } from '@radix-ui/themes';
import clsx from 'clsx';
import { useId, useState } from 'react';
import type { ChangeEvent, ComponentProps, FocusEvent, ReactNode } from 'react';
import './numeric-input.scss';

type NumericInputProps = {
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  fractionDigits?: number;
  children?: ReactNode;
} & Omit<
  ComponentProps<typeof TextField.Root>,
  'value' | 'onChange' | 'type' | 'children' | 'defaultValue'
>;

export const NumericInput = ({
  value,
  onChange,
  label,
  error,
  min,
  max,
  step,
  integer = false,
  fractionDigits,
  children,
  size = '3',
  readOnly,
  color,
  onFocus,
  onBlur,
  id,
  ...textFieldProps
}: NumericInputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [draftValue, setDraftValue] = useState('');
  const [drafting, setDrafting] = useState(false);
  const hasError = Boolean(error);
  const caption = hasError ? error : label;

  const displayValue =
    fractionDigits !== undefined ? value.toFixed(fractionDigits) : value;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftValue(event.target.value);

    const parsed = integer
      ? parseInt(event.target.value, 10)
      : parseFloat(event.target.value);
    if (!Number.isNaN(parsed)) {
      onChange?.(parsed);
    } else {
      onChange?.(0);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setDraftValue(String(displayValue));
    setDrafting(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setDraftValue(String(displayValue));
    setDrafting(false);
    onBlur?.(event);
  };

  return (
    <div className={clsx('numeric-input', hasError && 'numeric-input--error')}>
      {caption ? (
        <Text
          as="label"
          htmlFor={inputId}
          size="2"
          weight="medium"
          color={hasError ? 'red' : undefined}
        >
          {caption}
        </Text>
      ) : null}
      <TextField.Root
        id={inputId}
        size={size}
        type="number"
        value={drafting ? draftValue : displayValue}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        color={hasError ? 'red' : color}
        onChange={readOnly ? undefined : handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...textFieldProps}
      >
        {children}
      </TextField.Root>
    </div>
  );
};
