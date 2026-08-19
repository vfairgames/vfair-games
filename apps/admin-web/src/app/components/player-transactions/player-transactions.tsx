import { Badge, Callout, Flex, Spinner, Table, Text } from '@radix-ui/themes';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@vfair/app-common';
import { PlayerTransactionsFilters } from '../player-transactions-filters/player-transactions-filters';
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
  fetchPlayerTransactions,
  type AdminPlayerWalletTxListItem,
} from '../../services/admin-api.service';
import { formatDateTime, isDateRangeOrdered } from '../../utils/format-date';
import { parseOptionalAmount } from '../../utils/parse-optional-amount';
import './player-transactions.scss';

type PlayerTransactionsProps = {
  playerId: number;
};

const TX_TYPES = ['debit', 'credit', 'rollback'] as const;
const TX_STATUSES = ['pending', 'confirmed', 'failed', 'rolled_back'] as const;

const formatTypeLabel = (type: AdminPlayerWalletTxListItem['type']) => {
  switch (type) {
    case 'DEBIT':
      return 'Debit';
    case 'CREDIT':
      return 'Credit';
    case 'ROLLBACK':
      return 'Rollback';
  }
};

const formatStatusLabel = (status: AdminPlayerWalletTxListItem['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'FAILED':
      return 'Failed';
    case 'ROLLED_BACK':
      return 'Rolled back';
  }
};

const typeColor = (
  type: AdminPlayerWalletTxListItem['type'],
): 'blue' | 'green' | 'gray' => {
  switch (type) {
    case 'DEBIT':
      return 'blue';
    case 'CREDIT':
      return 'green';
    case 'ROLLBACK':
      return 'gray';
  }
};

const statusColor = (
  status: AdminPlayerWalletTxListItem['status'],
): 'green' | 'red' | 'yellow' | 'gray' => {
  switch (status) {
    case 'CONFIRMED':
      return 'green';
    case 'FAILED':
      return 'red';
    case 'PENDING':
      return 'yellow';
    case 'ROLLED_BACK':
      return 'gray';
  }
};

const parseTxType = (value: string): (typeof TX_TYPES)[number] | undefined =>
  (TX_TYPES as readonly string[]).includes(value)
    ? (value as (typeof TX_TYPES)[number])
    : undefined;

const parseTxStatus = (
  value: string,
): (typeof TX_STATUSES)[number] | undefined =>
  (TX_STATUSES as readonly string[]).includes(value)
    ? (value as (typeof TX_STATUSES)[number])
    : undefined;

export const PlayerTransactions = ({ playerId }: PlayerTransactionsProps) => {
  const [page, setPage] = usePageQueryParam();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const patchSearchParams = usePatchSearchParams();

  const type = useQueryParamValue('type', '');
  const status = useQueryParamValue('status', '');
  const currency = useQueryParamValue('currency', '');
  const dateFrom = useQueryParamValue('dateFrom', '');
  const dateTo = useQueryParamValue('dateTo', '');
  const amountMin = useQueryParamValue('amountMin', '');
  const amountMax = useQueryParamValue('amountMax', '');
  const roundId = useQueryParamValue('roundId', '');
  const dateRangeInvalid =
    Boolean(dateFrom && dateTo) && !isDateRangeOrdered(dateFrom, dateTo);

  const activeFilterCount = [
    type,
    status,
    currency,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    roundId,
  ].filter((value) => value.trim().length > 0).length;

  const filters = {
    type,
    status,
    currency,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    roundId,
  };

  const { data: currencies = [] } = useQuery({
    queryKey: ['player-currencies', playerId],
    queryFn: () => fetchPlayerCurrencies(playerId),
    staleTime: Infinity,
  });

  const { data, isFetching } = useQuery({
    queryKey: [
      'player-transactions',
      playerId,
      page,
      type,
      status,
      currency,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      roundId,
    ],
    queryFn: () =>
      fetchPlayerTransactions(playerId, {
        page,
        limit: LIST_PAGE_SIZE,
        type: parseTxType(type),
        status: parseTxStatus(status),
        currency: currency || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        amountMin: parseOptionalAmount(amountMin),
        amountMax: parseOptionalAmount(amountMax),
        roundId: roundId.trim() || undefined,
      }),
    enabled: !dateRangeInvalid,
    placeholderData: keepPreviousData,
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

  const transactions = data?.data ?? [];
  const hasMore = data?.hasMore ?? false;

  return (
    <Flex direction="column" gap="4" className="player-transactions">
      <TableFiltersPanel
        showSearch={false}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        activeFilterCount={activeFilterCount}
      >
        <PlayerTransactionsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          currencies={currencies}
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
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Currency</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Balance after</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Round ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Request ID</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {transactions.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8}>
                  <Text size="2" color="gray">
                    No transactions found.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              transactions.map((tx) => (
                <Table.Row key={tx.id}>
                  <Table.Cell>{formatDateTime(tx.createdAt)}</Table.Cell>
                  <Table.Cell>
                    <Badge color={typeColor(tx.type)} variant="soft">
                      {formatTypeLabel(tx.type)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColor(tx.status)} variant="soft">
                      {formatStatusLabel(tx.status)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {formatCurrency(tx.amount, {
                      currency: tx.currency.code,
                      decimals: tx.currency.decimals,
                    })}
                  </Table.Cell>
                  <Table.Cell>{tx.currency.code}</Table.Cell>
                  <Table.Cell>
                    {tx.balanceAfter == null
                      ? '—'
                      : formatCurrency(tx.balanceAfter, {
                          currency: tx.currency.code,
                          decimals: tx.currency.decimals,
                        })}
                  </Table.Cell>
                  <Table.Cell>{tx.roundId ?? '—'}</Table.Cell>
                  <Table.Cell>
                    <Text size="2" className="player-transactions__request-id">
                      {tx.requestId}
                    </Text>
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
