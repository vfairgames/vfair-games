import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  Spinner,
  Table,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@vfair/app-common';
import { useState } from 'react';
import { useParams } from 'react-router';
import { FormPageHeader } from '../../components/form-page-header/form-page-header';
import { usePageTitle } from '../../hooks/use-page-title';
import {
  fetchFailedRound,
  markFailedRoundSolved,
  markFailedRoundUnsolved,
  type AdminFailedRoundDetail,
  type AdminFailedRoundTransaction,
} from '../../services/admin-api.service';
import { formatDateTime } from '../../utils/format-date';
import { FailedRoundResolutionDialog } from './failed-round-resolution-dialog';
import './failed-round-detail-page.scss';

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <Flex direction="column" gap="1">
    <Text size="2" weight="medium">
      {label}
    </Text>
    <TextField.Root readOnly size="2" value={value} />
  </Flex>
);

const formatEnumLabel = (value: string): string => {
  const normalized = value.toLowerCase().replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatOptionalAmount = (
  amount: number | null,
  currency: AdminFailedRoundDetail['currency'],
): string =>
  amount == null
    ? '—'
    : formatCurrency(amount, {
        currency: currency.code,
        decimals: currency.decimals,
      });

const transactionStatusColor = (
  status: AdminFailedRoundTransaction['status'],
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

type ResolutionDialogMode = 'solve' | 'unsolve';

export const FailedRoundDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const roundId = id && /^[1-9]\d*$/.test(id) ? id : null;
  const queryClient = useQueryClient();
  const [resolutionDialog, setResolutionDialog] =
    useState<ResolutionDialogMode | null>(null);

  const {
    data: round,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['failed-round', roundId],
    queryFn: () => {
      if (!roundId) {
        throw new Error('Invalid failed round id');
      }

      return fetchFailedRound(roundId);
    },
    enabled: roundId !== null,
  });

  const resolutionMutation = useMutation({
    mutationFn: ({
      mode,
      note,
    }: {
      mode: ResolutionDialogMode;
      note: string;
    }) => {
      if (!roundId) {
        throw new Error('Invalid failed round id');
      }

      return mode === 'solve'
        ? markFailedRoundSolved(roundId, note)
        : markFailedRoundUnsolved(roundId, note);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['failed-round', updated.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['failed-rounds'] });
      setResolutionDialog(null);
    },
  });

  usePageTitle(round ? `Failed Round · ${round.id}` : 'Failed Round');

  if (!roundId) {
    return (
      <Flex direction="column" gap="4" p="4">
        <FormPageHeader backLabel="Failed Rounds" />
        <Callout.Root color="red">
          <Callout.Text>Invalid failed round id.</Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  if (isLoading) {
    return (
      <Flex justify="center" py="8">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (isError || !round) {
    return (
      <Flex direction="column" gap="4" p="4">
        <FormPageHeader backLabel="Failed Rounds" />
        <Callout.Root color="red">
          <Callout.Text>Failed round not found.</Callout.Text>
        </Callout.Root>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" p="4" className="failed-round-detail-page">
      <FormPageHeader backLabel="Failed Rounds" />

      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Flex align="center" gap="2">
              <Text size="4" weight="medium">
                Round {round.id}
              </Text>
              <Badge color="red" variant="soft">
                Failed
              </Badge>
              <Badge color={round.solved ? 'green' : 'orange'} variant="soft">
                {round.solved ? 'Solved' : 'Unsolved'}
              </Badge>
            </Flex>
            {round.solved ? (
              <Button
                color="orange"
                variant="soft"
                onClick={() => {
                  resolutionMutation.reset();
                  setResolutionDialog('unsolve');
                }}
              >
                Mark as unsolved
              </Button>
            ) : (
              <Button
                onClick={() => {
                  resolutionMutation.reset();
                  setResolutionDialog('solve');
                }}
              >
                Mark as solved
              </Button>
            )}
          </Flex>

          {resolutionMutation.isError ? (
            <Callout.Root color="red">
              <Callout.Text>
                {resolutionDialog === 'unsolve'
                  ? 'Failed to mark this round as unsolved. Please try again.'
                  : 'Failed to mark this round as solved. Please try again.'}
              </Callout.Text>
            </Callout.Root>
          ) : null}

          <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="3">
            <ReadOnlyField
              label="Player"
              value={`${round.player.externalId} (${round.player.id})`}
            />
            <ReadOnlyField
              label="Partner"
              value={`${round.partner.name} (${round.partner.id})`}
            />
            <ReadOnlyField label="Game" value={round.gameName} />
            <ReadOnlyField
              label="Failure Stage"
              value={
                round.failureStage ? formatEnumLabel(round.failureStage) : '—'
              }
            />
            <ReadOnlyField label="Error Code" value={round.errCode ?? '—'} />
            <ReadOnlyField
              label="Bet Amount"
              value={formatOptionalAmount(round.betAmount, round.currency)}
            />
            <ReadOnlyField
              label="Win Amount"
              value={formatOptionalAmount(round.winAmount, round.currency)}
            />
            <ReadOnlyField
              label="Payout Multiplier"
              value={
                round.payoutMultiplier == null
                  ? '—'
                  : `${round.payoutMultiplier}x`
              }
            />
            <ReadOnlyField
              label="Balance After"
              value={formatOptionalAmount(round.balanceAfter, round.currency)}
            />
            <ReadOnlyField label="Currency" value={round.currency.code} />
            <ReadOnlyField label="RTP" value={String(round.rtp)} />
            <ReadOnlyField label="Nonce" value={String(round.nonce)} />
            <ReadOnlyField label="Request ID" value={round.requestId} />
            <ReadOnlyField
              label="Created At"
              value={formatDateTime(round.createdAt)}
            />
            <ReadOnlyField
              label="Updated At"
              value={formatDateTime(round.updatedAt)}
            />
            <ReadOnlyField
              label="Settled At"
              value={round.settledAt ? formatDateTime(round.settledAt) : '—'}
            />
            <ReadOnlyField
              label="Solved By"
              value={round.solved?.solvedBy.email ?? '—'}
            />
            <ReadOnlyField
              label="Solved At"
              value={round.solved ? formatDateTime(round.solved.solvedAt) : '—'}
            />
          </Grid>

          {round.solved ? (
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Solve Note
              </Text>
              <TextArea readOnly rows={4} value={round.solved.note} />
            </Flex>
          ) : null}
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" p="4">
          <Text size="4" weight="medium">
            Event History
          </Text>
          {round.events.length === 0 ? (
            <Text size="2" color="gray">
              No events yet.
            </Text>
          ) : (
            <Box className="failed-round-detail-page__events">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>By</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Note</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {round.events.map((event) => (
                    <Table.Row key={event.id}>
                      <Table.Cell>{formatDateTime(event.createdAt)}</Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={event.action === 'SOLVED' ? 'green' : 'orange'}
                          variant="soft"
                        >
                          {formatEnumLabel(event.action)}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>{event.createdBy.email}</Table.Cell>
                      <Table.Cell>
                        <Text
                          size="2"
                          className="failed-round-detail-page__event-note"
                        >
                          {event.note}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" p="4">
          <Text size="4" weight="medium">
            Fairness
          </Text>
          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            <ReadOnlyField
              label="Server Seed Hash"
              value={round.fairness.serverSeedHash}
            />
            <ReadOnlyField
              label="Server Seed"
              value={round.fairness.serverSeed ?? 'Not revealed'}
            />
            <ReadOnlyField
              label="Client Seed"
              value={round.fairness.clientSeed}
            />
            <ReadOnlyField
              label="Fairness Nonce"
              value={String(round.fairness.nonce)}
            />
          </Grid>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" p="4">
          <Text size="4" weight="medium">
            Round Data
          </Text>
          <Grid columns={{ initial: '1', lg: '2' }} gap="3">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Game Data
              </Text>
              <TextArea
                className="failed-round-detail-page__json"
                readOnly
                rows={12}
                value={JSON.stringify(round.gameData, null, 2)}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Outcome
              </Text>
              <TextArea
                className="failed-round-detail-page__json"
                readOnly
                rows={12}
                value={JSON.stringify(round.outcome, null, 2)}
              />
            </Flex>
          </Grid>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" p="4">
          <Text size="4" weight="medium">
            Transactions
          </Text>
          {round.transactions.length === 0 ? (
            <Text size="2" color="gray">
              No transactions found for this round.
            </Text>
          ) : (
            <Box className="failed-round-detail-page__transactions">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>
                      Balance Before
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>
                      Balance After
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>
                      Partner Transaction ID
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Request ID</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Reverses</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Updated At</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {round.transactions.map((transaction) => (
                    <Table.Row key={transaction.id}>
                      <Table.Cell>
                        {formatDateTime(transaction.createdAt)}
                      </Table.Cell>
                      <Table.Cell>
                        {formatEnumLabel(transaction.type)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={transactionStatusColor(transaction.status)}
                          variant="soft"
                        >
                          {formatEnumLabel(transaction.status)}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {formatOptionalAmount(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {formatOptionalAmount(
                          transaction.balanceBefore,
                          transaction.currency,
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {formatOptionalAmount(
                          transaction.balanceAfter,
                          transaction.currency,
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {transaction.partnerTransactionId ?? '—'}
                      </Table.Cell>
                      <Table.Cell>{transaction.requestId}</Table.Cell>
                      <Table.Cell>
                        {transaction.reversesTransactionId ?? '—'}
                      </Table.Cell>
                      <Table.Cell>
                        {formatDateTime(transaction.updatedAt)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Flex>
      </Card>

      <FailedRoundResolutionDialog
        open={resolutionDialog != null}
        mode={resolutionDialog ?? 'solve'}
        loading={resolutionMutation.isPending}
        onClose={() => {
          if (!resolutionMutation.isPending) {
            setResolutionDialog(null);
          }
        }}
        onSubmit={(note) => {
          if (!resolutionDialog) {
            return;
          }

          resolutionMutation.mutate({ mode: resolutionDialog, note });
        }}
      />
    </Flex>
  );
};
