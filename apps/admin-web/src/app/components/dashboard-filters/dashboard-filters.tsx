import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import type { DashboardCurrencyOption } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import './dashboard-filters.scss';

type DashboardFiltersState = {
  partnerId: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
};

type PartnerOption = {
  id: number;
  name: string;
};

type DashboardFiltersProps = {
  filters: DashboardFiltersState;
  onFilterChange: <K extends keyof DashboardFiltersState>(
    key: K,
    value: DashboardFiltersState[K],
  ) => void;
  onPresetRange: (days: number) => void;
  currencies: DashboardCurrencyOption[];
  partners?: PartnerOption[];
  showPartnerSelect: boolean;
};

const PRESET_RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
] as const;

export const DashboardFilters = ({
  filters,
  onFilterChange,
  onPresetRange,
  currencies,
  partners = [],
  showPartnerSelect,
}: DashboardFiltersProps) => (
  <div className="dashboard-filters">
    {showPartnerSelect ? (
      <Flex direction="column" gap="1" className="dashboard-filters__field">
        <Text as="label" size="2" weight="medium">
          Partner
        </Text>
        <ComboboxSelect
          value={filters.partnerId}
          onChange={(value) => onFilterChange('partnerId', value)}
          placeholder="Select partner"
          searchPlaceholder="Search partners…"
          options={partners.map((partner) => ({
            value: String(partner.id),
            label: partner.name,
          }))}
        />
      </Flex>
    ) : null}

    <Flex direction="column" gap="1" className="dashboard-filters__field">
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

    <Flex direction="column" gap="1" className="dashboard-filters__field">
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

    <Flex direction="column" gap="1" className="dashboard-filters__field">
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

    <Flex direction="column" gap="1" className="dashboard-filters__field">
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
