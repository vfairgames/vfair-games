import { useMemo, useState, type CSSProperties } from 'react';
import clsx from 'clsx';

import { useTranslation } from '../../i18n/i18n';
import './segmented-tabs.scss';

type SegmentedTabItem<T extends string = string> = {
  label: string;
  value: T;
  disabled?: boolean;
};

type SegmentedTabsProps<T extends string = string> = {
  items: readonly SegmentedTabItem<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  className?: string;
  ariaLabel?: string;
};

export const SegmentedTabs = <T extends string = string>({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  ariaLabel,
}: SegmentedTabsProps<T>) => {
  const { t } = useTranslation();
  const firstEnabledItem = useMemo(
    () => items.find((item) => !item.disabled),
    [items],
  );
  const [internalValue, setInternalValue] = useState<T | undefined>(
    defaultValue ?? firstEnabledItem?.value,
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [indicatorAnchor, setIndicatorAnchor] = useState<
    'center' | 'left' | 'right'
  >('center');

  const selectedValue = value ?? internalValue;
  const selectedIndex = Math.max(
    items.findIndex((item) => item.value === selectedValue),
    0,
  );
  const hoverDirection =
    hoveredIndex === null || hoveredIndex === selectedIndex
      ? 'none'
      : hoveredIndex > selectedIndex
        ? 'right'
        : 'left';

  const rootClassName = clsx('segmented-tabs', className);
  const rootStyle = {
    '--segmented-tabs-count': `${Math.max(items.length, 1)}`,
    '--segmented-tabs-active-index': `${selectedIndex}`,
  } as CSSProperties;

  const handleSelect = (nextValue: T, disabled?: boolean) => {
    if (disabled) return;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      data-indicator-stretch={hoverDirection}
      data-indicator-anchor={indicatorAnchor}
      role="tablist"
      aria-label={ariaLabel ?? t('shellSegmentedTabs')}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="segmented-tabs__indicator" aria-hidden="true" />
      {items.map((item, index) => {
        const isSelected = item.value === selectedValue;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-disabled={item.disabled}
            disabled={item.disabled}
            className="segmented-tabs__tab"
            onClick={() => handleSelect(item.value, item.disabled)}
            onMouseEnter={() => {
              if (item.disabled || isSelected) {
                setHoveredIndex(null);
                return;
              }

              setHoveredIndex(index);
              setIndicatorAnchor(index > selectedIndex ? 'left' : 'right');
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
