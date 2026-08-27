import { Flex, Spinner, Table, Text } from '@radix-ui/themes';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { TableFiltersPanel } from '../../components/table-filters-panel/table-filters-panel';
import { TablePagination } from '../../components/table-pagination/table-pagination';
import { PlayersFilters } from '../../components/players-filters/players-filters';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import { useAuthStore } from '../../auth/auth-store';
import { useAllPartners } from '../../hooks/use-all-partners';
import { useDebouncedSearch } from '../../hooks/use-debounced-search';
import {
  usePageQueryParam,
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import { fetchPlayers } from '../../services/admin-api.service';
import { formatShortDate } from '../../utils/format-date';
import './players-page.scss';

const isAdminUser = (role: string | undefined) => role === 'ADMIN';

export const PlayersPage = () => {
  usePageTitle('Players');
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = isAdminUser(role);

  const [page, setPage] = usePageQueryParam();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const patchSearchParams = usePatchSearchParams();
  const partnerId = useQueryParamValue('partnerId', '');
  const filters = { partnerId };
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { partners } = useAllPartners({ enabled: isAdmin });
  const activeFilterCount = partnerId ? 1 : 0;

  const { data, isFetching } = useQuery({
    queryKey: ['players', page, debouncedSearch, filters.partnerId],
    queryFn: () =>
      fetchPlayers({
        page,
        limit: LIST_PAGE_SIZE,
        externalId: debouncedSearch || undefined,
        partnerId: filters.partnerId ? Number(filters.partnerId) : undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const players = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

  const handleFilterChange = (key: 'partnerId', value: string) => {
    patchSearchParams({
      [key]: value || null,
      page: null,
    });
  };

  return (
    <Flex direction="column" gap="4" p="4" className="players-page">
      <TableFiltersPanel
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by external ID…"
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
        showFilterToggle={isAdmin}
      >
        {isAdmin ? (
          <PlayersFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            partners={partners}
          />
        ) : null}
      </TableFiltersPanel>

      {isFetching && !data ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>External ID</Table.ColumnHeaderCell>
              {isAdmin ? (
                <Table.ColumnHeaderCell>Partner</Table.ColumnHeaderCell>
              ) : null}
              <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {players.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={isAdmin ? 4 : 3}>
                  <Text size="2" color="gray">
                    No players found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              players.map((player) => (
                <Table.Row
                  key={player.id}
                  className="players-page__row"
                  onClick={() => navigate(`/players/${player.id}`)}
                >
                  <Table.Cell>{player.id}</Table.Cell>
                  <Table.Cell>{player.externalId}</Table.Cell>
                  {isAdmin ? (
                    <Table.Cell>{player.partner.name}</Table.Cell>
                  ) : null}
                  <Table.Cell>{formatShortDate(player.createdAt)}</Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      )}

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        totalLabel="player"
        onPageChange={setPage}
      />
    </Flex>
  );
};
