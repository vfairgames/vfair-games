import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import type { AdminPlayerCurrencyOption } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import './player-reports-filters.scss';

export type PlayerReportsFiltersState = {
  currency: string;
  dateFrom: string;
  dateTo: string;
};

type PlayerReportsFiltersProps = {
  filters: PlayerReportsFiltersState;
  onFilterChange: <K extends keyof PlayerReportsFiltersState>(
    key: K,
    value: PlayerReportsFiltersState[K],
  ) => void;
  onPresetRange: (days: number) => void;
  currencies: AdminPlayerCurrencyOption[];
};

const PRESET_RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
] as const;

export const PlayerReportsFilters = ({
  filters,
  onFilterChange,
  onPresetRange,
  currencies,
}: PlayerReportsFiltersProps) => (
  <div className="player-reports-filters">
    <Flex direction="column" gap="1" className="player-reports-filters__field">
      <Text as="label" size="2" weight="medium">
        Currency
      </Text>
      <ComboboxSelect
        value={filters.currency}
        onChange={(value) => onFilterChange('currency', value)}
        placeholder="Select currency"
        searchPlaceholder="Search currencies…"
        options={currencies.map((currency) => ({
          value: currency.code,
          label: currency.code,
          leading: <CurrencyFlagIcon currency={currency.code} />,
        }))}
      />
    </Flex>

    <Flex direction="column" gap="1" className="player-reports-filters__field">
      <Text as="label" size="2" weight="medium">
        Date from
      </Text>
      <TextField.Root
        type="date"
        size="2"
        value={filters.dateFrom}
        onChange={(e) => onFilterChange('dateFrom', e.target.value)}
      />
    </Flex>

    <Flex direction="column" gap="1" className="player-reports-filters__field">
      <Text as="label" size="2" weight="medium">
        Date to
      </Text>
      <TextField.Root
        type="date"
        size="2"
        value={filters.dateTo}
        onChange={(e) => onFilterChange('dateTo', e.target.value)}
      />
    </Flex>

    <Flex direction="column" gap="1" className="player-reports-filters__field">
      <Text size="2" weight="medium">
        Range
      </Text>
      <Flex gap="2" wrap="wrap">
        {PRESET_RANGES.map((preset) => (
          <Button
            key={preset.days}
            type="button"
            size="2"
            variant="soft"
            onClick={() => onPresetRange(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
      </Flex>
    </Flex>
  </div>
);
