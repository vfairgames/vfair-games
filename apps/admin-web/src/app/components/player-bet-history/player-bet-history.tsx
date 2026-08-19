import { Badge, Dialog, Flex, Spinner, Table, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@vfair/app-common';
import { PlayerBetHistoryFilters } from '../player-bet-history-filters/player-bet-history-filters';
import { TableFiltersPanel } from '../table-filters-panel/table-filters-panel';
import { TablePagination } from '../table-pagination/table-pagination';
import { LIST_PAGE_SIZE } from '../../constants/constants';
import {
  usePageQueryParam,
  usePatchSearchParams,
  useQueryParamValue,
} from '../../hooks/use-query-param';
import {
  fetchPlayerCurrencies,
  fetchPlayerRound,
  fetchPlayerRounds,
  type AdminPlayerRoundListItem,
} from '../../services/admin-api.service';
import { formatDateTime } from '../../utils/format-date';
import { parseOptionalAmount } from '../../utils/parse-optional-amount';
import {
  formatPlayerRoundStatusLabel,
  playerRoundStatusColor,
} from '../../utils/player-round-status';
import { PlayerBetDetailModalContent } from '../player-bet-detail-modal/player-bet-detail-modal';
import './player-bet-history.scss';

type PlayerBetHistoryProps = {
  playerId: number;
};

const parseRoundStatus = (
  value: string,
): AdminPlayerRoundListItem['status'] | undefined => {
  if (
    value === 'won' ||
    value === 'lost' ||
    value === 'active' ||
    value === 'failed'
  ) {
    return value;
  }

  return undefined;
};

const toWinAmount = (value: number): number =>
  Number.isFinite(value) ? value : 0;

export const PlayerBetHistory = ({ playerId }: PlayerBetHistoryProps) => {
  const [page, setPage] = usePageQueryParam();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const patchSearchParams = usePatchSearchParams();

  const roundId = useQueryParamValue('roundId', '');
  const gameId = useQueryParamValue('gameId', '');
  const currency = useQueryParamValue('currency', '');
  const status = useQueryParamValue('status', '');
  const dateFrom = useQueryParamValue('dateFrom', '');
  const dateTo = useQueryParamValue('dateTo', '');
  const betAmountMin = useQueryParamValue('betAmountMin', '');
  const betAmountMax = useQueryParamValue('betAmountMax', '');

  const activeFilterCount = [
    roundId,
    gameId,
    currency,
    status,
    dateFrom,
    dateTo,
    betAmountMin,
    betAmountMax,
  ].filter((value) => value.trim().length > 0).length;

  const filters = {
    roundId,
    gameId,
    currency,
    status,
    dateFrom,
    dateTo,
    betAmountMin,
    betAmountMax,
  };

  const roundFilters = useMemo(
    () => ({
      roundId: roundId.trim() || undefined,
      gameId: gameId || undefined,
      currency: currency || undefined,
      status: parseRoundStatus(status),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      betAmountMin: parseOptionalAmount(betAmountMin),
      betAmountMax: parseOptionalAmount(betAmountMax),
    }),
    [
      roundId,
      gameId,
      currency,
      status,
      dateFrom,
      dateTo,
      betAmountMin,
      betAmountMax,
    ],
  );

  const { data: currencies = [] } = useQuery({
    queryKey: ['player-currencies', playerId],
    queryFn: () => fetchPlayerCurrencies(playerId),
    staleTime: Infinity,
  });

  const { data, isFetching } = useQuery({
    queryKey: ['player-rounds', playerId, page, roundFilters],
    queryFn: () =>
      fetchPlayerRounds(playerId, {
        page,
        limit: LIST_PAGE_SIZE,
        ...roundFilters,
      }),
    placeholderData: keepPreviousData,
  });

  const {
    data: roundDetail,
    isLoading: roundDetailLoading,
    isError: roundDetailError,
  } = useQuery({
    queryKey: ['player-round', playerId, selectedRoundId],
    queryFn: () => fetchPlayerRound(playerId, selectedRoundId as string),
    enabled: selectedRoundId !== null,
  });

  const handleFilterChange = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) => {
    patchSearchParams({
      [key]: value || null,
      page: null,
    });
  };

  const rounds = data?.data ?? [];
  const hasMore = data?.hasMore ?? false;

  return (
    <Flex direction="column" gap="4" className="player-bet-history">
      <TableFiltersPanel
        showSearch={false}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
      >
        <PlayerBetHistoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          currencies={currencies}
        />
      </TableFiltersPanel>

      {isFetching && !data ? (
        <Flex justify="center" py="6">
          <Spinner size="3" />
        </Flex>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Round ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Bet Amount</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Win Amount</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Currency</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Result</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Game</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Multiplier</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rounds.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8}>
                  <Text size="2" color="gray">
                    No bet history found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              rounds.map((round) => (
                <Table.Row
                  key={round.id}
                  className="player-bet-history__row"
                  onClick={() => setSelectedRoundId(round.id)}
                >
                  <Table.Cell>{round.id}</Table.Cell>
                  <Table.Cell>
                    {formatCurrency(round.betAmount, {
                      currency: round.currency.code,
                      decimals: round.currency.decimals,
                    })}
                  </Table.Cell>
                  <Table.Cell>
                    <Text
                      className={clsx(
                        round.status === 'won' &&
                          'player-bet-history__win-amount--won',
                      )}
                      size="2"
                      weight="medium"
                    >
                      {formatCurrency(toWinAmount(round.winAmount), {
                        currency: round.currency.code,
                        decimals: round.currency.decimals,
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{round.currency.code}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={playerRoundStatusColor(round.status)}
                      variant="soft"
                    >
                      {formatPlayerRoundStatusLabel(round.status)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{round.gameName}</Table.Cell>
                  <Table.Cell>{formatDateTime(round.createdAt)}</Table.Cell>
                  <Table.Cell>
                    <Text
                      className={clsx(
                        round.status === 'won' &&
                          'player-bet-history__multiplier--won',
                        round.status === 'lost' &&
                          'player-bet-history__multiplier--lost',
                      )}
                      size="2"
                      weight="medium"
                    >
                      {round.multiplier != null ? `${round.multiplier}x` : '—'}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      )}

      <TablePagination
        page={page}
        hasMore={hasMore}
        showTotal={false}
        onPageChange={setPage}
      />

      <Dialog.Root
        open={selectedRoundId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoundId(null);
          }
        }}
      >
        <Dialog.Content maxWidth="720px">
          <Dialog.Title>Bet Details</Dialog.Title>
          {roundDetailLoading ? (
            <Flex justify="center" py="6">
              <Spinner size="3" />
            </Flex>
          ) : roundDetailError || !roundDetail ? (
            <Text size="2" color="red">
              Failed to load round details.
            </Text>
          ) : (
            <PlayerBetDetailModalContent round={roundDetail} />
          )}
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};
