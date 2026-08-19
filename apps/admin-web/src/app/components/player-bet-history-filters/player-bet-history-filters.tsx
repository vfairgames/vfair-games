import { Flex, Text, TextField } from '@radix-ui/themes';
import { AVAILABLE_GAMES } from '@vfair/game-contracts';
import type { AdminPlayerCurrencyOption } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import { CurrencyFlagIcon } from '../currency-flag-icon/currency-flag-icon';
import './player-bet-history-filters.scss';

type PlayerBetHistoryFiltersState = {
  gameId: string;
  currency: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  betAmountMin: string;
  betAmountMax: string;
  roundId: string;
};

type PlayerBetHistoryFiltersProps = {
  filters: PlayerBetHistoryFiltersState;
  onFilterChange: <K extends keyof PlayerBetHistoryFiltersState>(
    key: K,
    value: PlayerBetHistoryFiltersState[K],
  ) => void;
  currencies: AdminPlayerCurrencyOption[];
};

const RESULT_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'active', label: 'In progress' },
  { value: 'failed', label: 'Failed' },
] as const;

const GAME_OPTIONS = [
  { value: '', label: 'All games' },
  ...AVAILABLE_GAMES.map((game) => ({
    value: game.id,
    label: game.name,
  })),
];

export const PlayerBetHistoryFilters = ({
  filters,
  onFilterChange,
  currencies,
}: PlayerBetHistoryFiltersProps) => (
  <div className="player-bet-history-filters">
    <Flex
      direction="column"
      gap="1"
      className="player-bet-history-filters__field"
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

    <Flex
      direction="column"
      gap="1"
      className="player-bet-history-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Game
      </Text>
      <ComboboxSelect
        value={filters.gameId}
        onChange={(value) => onFilterChange('gameId', value)}
        placeholder="All games"
        searchPlaceholder="Search games…"
        options={GAME_OPTIONS}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-bet-history-filters__field"
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
      className="player-bet-history-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Result
      </Text>
      <ComboboxSelect
        value={filters.status}
        onChange={(value) => onFilterChange('status', value)}
        placeholder="All results"
        searchPlaceholder="Search results…"
        options={[...RESULT_OPTIONS]}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-bet-history-filters__field"
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
      className="player-bet-history-filters__field"
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
      className="player-bet-history-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Bet amount (min)
      </Text>
      <TextField.Root
        type="number"
        size="2"
        min="0"
        step="any"
        placeholder="Any"
        value={filters.betAmountMin}
        onChange={(e) => onFilterChange('betAmountMin', e.target.value)}
      />
    </Flex>

    <Flex
      direction="column"
      gap="1"
      className="player-bet-history-filters__field"
    >
      <Text as="label" size="2" weight="medium">
        Bet amount (max)
      </Text>
      <TextField.Root
        type="number"
        size="2"
        min="0"
        step="any"
        placeholder="Any"
        value={filters.betAmountMax}
        onChange={(e) => onFilterChange('betAmountMax', e.target.value)}
      />
    </Flex>
  </div>
);
