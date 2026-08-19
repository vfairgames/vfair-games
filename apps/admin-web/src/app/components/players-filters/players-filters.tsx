import { Flex, Text } from '@radix-ui/themes';
import type { Partner } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import './players-filters.scss';

export type PlayerFiltersState = {
  partnerId: string;
};

type PlayersFiltersProps = {
  filters: PlayerFiltersState;
  onFilterChange: <K extends keyof PlayerFiltersState>(
    key: K,
    value: PlayerFiltersState[K],
  ) => void;
  partners: Partner[];
};

export const PlayersFilters = ({
  filters,
  onFilterChange,
  partners,
}: PlayersFiltersProps) => (
  <div className="players-filters">
    <Flex direction="column" gap="1" className="players-filters__field">
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
  </div>
);
