import { Badge, Flex, IconButton, TextField } from '@radix-ui/themes';
import { FunnelIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import './table-filters-panel.scss';

type TableFiltersPanelBaseProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  actions?: ReactNode;
};

type TableFiltersPanelWithFilters = TableFiltersPanelBaseProps & {
  showFilterToggle?: true;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  activeFilterCount?: number;
  children?: ReactNode;
};

type TableFiltersPanelSearchOnly = TableFiltersPanelBaseProps & {
  showFilterToggle: false;
};

type TableFiltersPanelProps =
  | TableFiltersPanelWithFilters
  | TableFiltersPanelSearchOnly;

export const TableFiltersPanel = (props: TableFiltersPanelProps) => {
  const {
    search = '',
    onSearchChange,
    searchPlaceholder = 'Search…',
    showSearch = true,
    actions,
  } = props;

  if (props.showFilterToggle === false) {
    return (
      <Flex direction="column" gap="3" className="table-filters-panel">
        <Flex align="center" justify="between" gap="3">
          {showSearch ? (
            <Flex align="center" className="table-filters-panel__search-row">
              <TextField.Root
                size="2"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="table-filters-panel__search"
              />
            </Flex>
          ) : null}
          {actions}
        </Flex>
      </Flex>
    );
  }

  const {
    filtersOpen,
    onFiltersOpenChange,
    activeFilterCount = 0,
    children,
  } = props;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Flex direction="column" gap="3" className="table-filters-panel">
      <Flex align="center" justify="between" gap="3">
        <Flex align="center" className="table-filters-panel__search-row">
          {showSearch ? (
            <TextField.Root
              size="2"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="table-filters-panel__search"
            />
          ) : null}
          <IconButton
            size="2"
            variant="ghost"
            color={hasActiveFilters ? 'blue' : 'gray'}
            aria-label="Toggle filters"
            aria-expanded={filtersOpen}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
            className={clsx(
              'table-filters-panel__toggle',
              filtersOpen && 'table-filters-panel__toggle--open',
              hasActiveFilters && 'table-filters-panel__toggle--active',
            )}
          >
            <FunnelIcon size={16} />
          </IconButton>
          {hasActiveFilters && (
            <Badge color="blue" variant="soft" radius="full">
              {activeFilterCount}
            </Badge>
          )}
        </Flex>
        {actions}
      </Flex>

      {filtersOpen && children && (
        <div className="table-filters-panel__filters">{children}</div>
      )}
    </Flex>
  );
};
