import { Badge, Callout, Flex, Spinner, Table, Text } from '@radix-ui/themes';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@vfair/app-common';
import { isBetFailureStage } from '@vfair/game-contracts';
import { FailedRoundsFilters } from '../../components/failed-rounds-filters/failed-rounds-filters';
import { TableFiltersPanel } from '../../components/table-filters-panel/table-filters-panel';
import { TablePagination } from '../../components/table-pagination/table-pagination';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import { useAuthStore } from '../../auth/auth-store';
import { useAllPartners } from '../../hooks/use-all-partners';
import {
  usePageQueryParam,
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import { usePageTitle } from '../../hooks/use-page-title';
import {
  fetchFailedRounds,
  type AdminFailedRoundListItem,
} from '../../services/admin-api.service';
import { formatDateTime, isDateRangeOrdered } from '../../utils/format-date';
import './failed-rounds-page.scss';

const isAdminUser = (role: string | undefined) => role === 'ADMIN';

const parseSolvedFilter = (value: string): boolean | undefined => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

const parsePositiveIntFilter = (value: string): number | undefined => {
  if (!/^[1-9]\d*$/.test(value)) {
    return undefined;
  }

  return Number(value);
};

const formatFailureStage = (
  stage: AdminFailedRoundListItem['failureStage'],
): string => {
  if (!stage) {
    return '—';
  }

  return stage.charAt(0).toUpperCase() + stage.slice(1);
};

export const FailedRoundsPage = () => {
  usePageTitle('Failed Rounds');
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = isAdminUser(role);

  const [page, setPage] = usePageQueryParam();
  const patchSearchParams = usePatchSearchParams();
  const partnerId = useQueryParamValue('partnerId', '');
  const playerId = useQueryParamValue('playerId', '');
  const externalId = useQueryParamValue('externalId', '');
  const roundId = useQueryParamValue('roundId', '');
  const requestId = useQueryParamValue('requestId', '');
  const gameId = useQueryParamValue('gameId', '');
  const failureStage = useQueryParamValue('failureStage', '');
  const solved = useQueryParamValue('solved', '');
  const dateFrom = useQueryParamValue('dateFrom', '');
  const dateTo = useQueryParamValue('dateTo', '');
  const filters = {
    partnerId,
    playerId,
    externalId,
    roundId,
    requestId,
    gameId,
    failureStage,
    solved,
    dateFrom,
    dateTo,
  };
  const dateRangeInvalid =
    Boolean(dateFrom && dateTo) && !isDateRangeOrdered(dateFrom, dateTo);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { partners } = useAllPartners({ enabled: isAdmin });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const parsedPlayerId = parsePositiveIntFilter(playerId);
  const parsedRoundId = /^[1-9]\d*$/.test(roundId) ? roundId : undefined;

  const { data, isFetching } = useQuery({
    queryKey: [
      'failed-rounds',
      page,
      partnerId,
      playerId,
      externalId,
      roundId,
      requestId,
      gameId,
      failureStage,
      solved,
      dateFrom,
      dateTo,
    ],
    queryFn: () =>
      fetchFailedRounds({
        page,
        limit: LIST_PAGE_SIZE,
        partnerId: partnerId ? Number(partnerId) : undefined,
        playerId: parsedPlayerId,
        externalId: externalId || undefined,
        roundId: parsedRoundId,
        requestId: requestId || undefined,
        gameId: gameId || undefined,
        failureStage: isBetFailureStage(failureStage)
          ? failureStage
          : undefined,
        solved: parseSolvedFilter(solved),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    enabled: !dateRangeInvalid,
    placeholderData: keepPreviousData,
  });

  const rounds = data?.data ?? [];
  const hasMore = data?.hasMore ?? false;
  const columnCount = isAdmin ? 9 : 8;

  const handleFilterChange = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) => {
    patchSearchParams({
      [key]: value || null,
      page: null,
    });
  };

  return (
    <Flex direction="column" gap="4" p="4" className="failed-rounds-page">
      <TableFiltersPanel
        showSearch={false}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
      >
        <FailedRoundsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          partners={partners}
          showPartnerFilter={isAdmin}
        />
      </TableFiltersPanel>

      {dateRangeInvalid ? (
        <Callout.Root color="red">
          <Callout.Text>Date from must be on or before date to.</Callout.Text>
        </Callout.Root>
      ) : isFetching && !data ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Round ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
              {isAdmin ? (
                <Table.ColumnHeaderCell>Partner</Table.ColumnHeaderCell>
              ) : null}
              <Table.ColumnHeaderCell>Game</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Bet</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Failure stage</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Error</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Settled at</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rounds.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={columnCount}>
                  <Text size="2" color="gray">
                    No failed rounds found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              rounds.map((round) => (
                <Table.Row
                  key={round.id}
                  className="failed-rounds-page__row"
                  onClick={() => navigate(`/failed-rounds/${round.id}`)}
                >
                  <Table.Cell>{round.id}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={round.solved ? 'green' : 'orange'}
                      variant="soft"
                    >
                      {round.solved ? 'Solved' : 'Unsolved'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <button
                      type="button"
                      className="failed-rounds-page__link"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/players/${round.player.id}`);
                      }}
                    >
                      {round.player.externalId}
                    </button>
                  </Table.Cell>
                  {isAdmin ? (
                    <Table.Cell>{round.partner.name}</Table.Cell>
                  ) : null}
                  <Table.Cell>{round.gameName}</Table.Cell>
                  <Table.Cell>
                    {formatCurrency(round.betAmount, {
                      currency: round.currency.code,
                      decimals: round.currency.decimals,
                    })}
                  </Table.Cell>
                  <Table.Cell>
                    {formatFailureStage(round.failureStage)}
                  </Table.Cell>
                  <Table.Cell>{round.errCode ?? '—'}</Table.Cell>
                  <Table.Cell>
                    {round.settledAt ? formatDateTime(round.settledAt) : '—'}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      )}

      {dateRangeInvalid ? null : (
        <TablePagination
          page={page}
          hasMore={hasMore}
          showTotal={false}
          onPageChange={setPage}
        />
      )}
    </Flex>
  );
};
