import { Flex, Text, TextField } from '@radix-ui/themes';
import type { AdminPlayerCurrencyOption } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import './player-transactions-filters.scss';

type PlayerTransactionsFiltersState = {
  type: string;
  status: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  roundId: string;
};

type PlayerTransactionsFiltersProps = {
  filters: PlayerTransactionsFiltersState;
  onFilterChange: <K extends keyof PlayerTransactionsFiltersState>(
    key: K,
    value: PlayerTransactionsFiltersState[K],
  ) => void;
  currencies: AdminPlayerCurrencyOption[];
};

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'rollback', label: 'Rollback' },
] as const;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'failed', label: 'Failed' },
  { value: 'rolled_back', label: 'Rolled back' },
] as const;

export const PlayerTransactionsFilters = ({
  filters,
  onFilterChange,
  currencies,
}: PlayerTransactionsFiltersProps) => (
  <div className="player-transactions-filters">
    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Type
      </Text>
      <ComboboxSelect
        value={filters.type}
        onChange={(value) => onFilterChange('type', value)}
        placeholder="All types"
        searchPlaceholder="Search types…"
        options={[...TYPE_OPTIONS]}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Status
      </Text>
      <ComboboxSelect
        value={filters.status}
        onChange={(value) => onFilterChange('status', value)}
        placeholder="All statuses"
        searchPlaceholder="Search statuses…"
        options={[...STATUS_OPTIONS]}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Currency
      </Text>
      <ComboboxSelect
        value={filters.currency}
        onChange={(value) => onFilterChange('currency', value)}
        placeholder="All currencies"
        searchPlaceholder="Search currencies…"
        options={[
          { value: '', label: 'All currencies' },
          ...currencies.map((currency) => ({
            value: currency.code,
            label: currency.code,
            leading: <CurrencyFlagIcon currency={currency.code} />,
          })),
        ]}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
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

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
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

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Amount (min)
      </Text>
      <TextField.Root
        type="number"
        size="2"
        min="0"
        step="any"
        placeholder="Any"
        value={filters.amountMin}
        onChange={(e) => onFilterChange('amountMin', e.target.value)}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Amount (max)
      </Text>
      <TextField.Root
        type="number"
        size="2"
        min="0"
        step="any"
        placeholder="Any"
        value={filters.amountMax}
        onChange={(e) => onFilterChange('amountMax', e.target.value)}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-transactions-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Round ID
      </Text>
      <TextField.Root
        size="2"
        placeholder="Any"
        value={filters.roundId}
        onChange={(e) => onFilterChange('roundId', e.target.value)}
      />
    </Flex>
  </div>
);
