import { Flex, Text } from '@radix-ui/themes';
import type { Partner, UserRole } from '../../services/admin-api.service';
import { ComboboxSelect } from '../combobox-select/combobox-select';
import './users-filters.scss';

export type UserFiltersState = {
  roleId: string;
  partnerId: string;
};

type UsersFiltersProps = {
  filters: UserFiltersState;
  onFilterChange: <K extends keyof UserFiltersState>(
    key: K,
    value: UserFiltersState[K],
  ) => void;
  roles: UserRole[];
  partners: Partner[];
};

export const UsersFilters = ({
  filters,
  onFilterChange,
  roles,
  partners,
}: UsersFiltersProps) => (
  <div className="users-filters">
    <Flex direction="column" gap="1" className="users-filters__field">
      <Text as="label" size="2" weight="medium">
        Role
      </Text>
      <ComboboxSelect
        value={filters.roleId}
        onChange={(value) => onFilterChange('roleId', value)}
        placeholder="All roles"
        searchPlaceholder="Search roles…"
        options={[
          { value: '', label: 'All roles' },
          ...roles.map((role) => ({
            value: String(role.id),
            label: role.name,
          })),
        ]}
      />
    </Flex>

    <Flex direction="column" gap="1" className="users-filters__field">
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
