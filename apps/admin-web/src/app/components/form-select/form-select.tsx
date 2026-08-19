import clsx from 'clsx';
import './form-select.scss';

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
};

export const FormSelect = ({
  value,
  onChange,
  options,
  placeholder,
  hasError,
  disabled,
}: FormSelectProps) => (
  <select
    className={clsx('form-select', hasError && 'form-select--error')}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
