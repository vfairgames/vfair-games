import { Flex, Text, TextField } from '@radix-ui/themes';
import { AVAILABLE_GAMES, BetFailureStage } from '@vfair/game-contracts';
import type { Partner } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import './failed-rounds-filters.scss';

type FailedRoundsFiltersState = {
  partnerId: string;
  playerId: string;
  externalId: string;
  roundId: string;
  requestId: string;
  gameId: string;
  failureStage: string;
  solved: string;
  dateFrom: string;
  dateTo: string;
};

type FailedRoundsFiltersProps = {
  filters: FailedRoundsFiltersState;
  onFilterChange: <K extends keyof FailedRoundsFiltersState>(
    key: K,
    value: FailedRoundsFiltersState[K],
  ) => void;
  partners: Partner[];
  showPartnerFilter: boolean;
};

const FAILURE_STAGE_OPTIONS = [
  { value: '', label: 'All stages' },
  ...Object.values(BetFailureStage).map((stage) => ({
    value: stage,
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
  })),
];

const SOLVED_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'false', label: 'Unsolved' },
  { value: 'true', label: 'Solved' },
];

const GAME_OPTIONS = [
  { value: '', label: 'All games' },
  ...AVAILABLE_GAMES.map((game) => ({
    value: game.id,
    label: game.name,
  })),
];

export const FailedRoundsFilters = ({
  filters,
  onFilterChange,
  partners,
  showPartnerFilter,
}: FailedRoundsFiltersProps) => (
  <div className="failed-rounds-filters">
    {showPartnerFilter ? (
      <Flex direction="column" gap="1" className="failed-rounds-filters__field">
        <Text as="label" size="2" weight="medium">
          Partner
        </Text>
        <ComboboxSelect
          value={filters.partnerId}
          onChange={(value) => onFilterChange('partnerId', value)}
          placeholder="All partners"
          searchPlaceholder="Search partners…"
          options={[
            { value: '', label: 'All partners' },
            ...partners.map((partner) => ({
              value: String(partner.id),
              label: partner.name,
            })),
          ]}
        />
      </Flex>
    ) : null}

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
      <Text as="label" size="2" weight="medium">
        Player ID
      </Text>
      <TextField.Root
        size="2"
        value={filters.playerId}
        onChange={(e) => onFilterChange('playerId', e.target.value)}
        placeholder="Internal player id"
      />
    </Flex>

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
      <Text as="label" size="2" weight="medium">
        External player ID
      </Text>
      <TextField.Root
        size="2"
        value={filters.externalId}
        onChange={(e) => onFilterChange('externalId', e.target.value)}
        placeholder="Contains…"
      />
    </Flex>

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
      <Text as="label" size="2" weight="medium">
        Round ID
      </Text>
      <TextField.Root
        size="2"
        value={filters.roundId}
        onChange={(e) => onFilterChange('roundId', e.target.value)}
        placeholder="Round id"
      />
    </Flex>

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
      <Text as="label" size="2" weight="medium">
        Request ID
      </Text>
      <TextField.Root
        size="2"
        value={filters.requestId}
        onChange={(e) => onFilterChange('requestId', e.target.value)}
        placeholder="Round or wallet request id"
      />
    </Flex>

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
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

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
      <Text as="label" size="2" weight="medium">
        Failure stage
      </Text>
      <ComboboxSelect
        value={filters.failureStage}
        onChange={(value) => onFilterChange('failureStage', value)}
        placeholder="All stages"
        searchPlaceholder="Search stages…"
        options={FAILURE_STAGE_OPTIONS}
      />
    </Flex>

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
      <Text as="label" size="2" weight="medium">
        Status
      </Text>
      <ComboboxSelect
        value={filters.solved}
        onChange={(value) => onFilterChange('solved', value)}
        placeholder="All statuses"
        searchPlaceholder="Search statuses…"
        options={SOLVED_OPTIONS}
      />
    </Flex>

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
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

    <Flex direction="column" gap="1" className="failed-rounds-filters__field">
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
  </div>
);
