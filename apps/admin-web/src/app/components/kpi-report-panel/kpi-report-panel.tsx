import { Card, Flex, Grid, Table, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import type { AdminPlayerKpi } from '../../services/admin-api.service';
import { formatKpiMoney, formatKpiRtp } from '../../utils/format-kpi';
import { ggrColor } from '../../utils/ggr-color';
import { PlayerKpiChart } from '../player-kpi-chart/player-kpi-chart';

type KpiReportPanelProps = {
  kpi: AdminPlayerKpi;
  rtpLabel: string;
  columns?: { initial: '1'; sm: '2'; md: '3' | '4' };
  extraCards?: ReactNode;
};

export const KpiReportPanel = ({
  kpi,
  rtpLabel,
  columns = { initial: '1', sm: '2', md: '3' },
  extraCards,
}: KpiReportPanelProps) => (
  <>
    <Grid columns={columns} gap="3">
      <Card>
        <Flex direction="column" gap="1" p="3">
          <Text size="2" color="gray">
            Total wagered
          </Text>
          <Text size="5" weight="medium">
            {formatKpiMoney(kpi.summary.totalWagered, kpi.currency)}
          </Text>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="1" p="3">
          <Text size="2" color="gray">
            Total won
          </Text>
          <Text size="5" weight="medium">
            {formatKpiMoney(kpi.summary.totalWon, kpi.currency)}
          </Text>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="1" p="3">
          <Text size="2" color="gray">
            GGR
          </Text>
          <Text size="5" weight="medium" color={ggrColor(kpi.summary.ggr)}>
            {formatKpiMoney(kpi.summary.ggr, kpi.currency)}
          </Text>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="1" p="3">
          <Text size="2" color="gray">
            Total bets
          </Text>
          <Text size="5" weight="medium">
            {kpi.summary.totalBets}
          </Text>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="1" p="3">
          <Text size="2" color="gray">
            Avg bet
          </Text>
          <Text size="5" weight="medium">
            {kpi.summary.avgBet === null
              ? '—'
              : formatKpiMoney(kpi.summary.avgBet, kpi.currency)}
          </Text>
        </Flex>
      </Card>
      <Card>
        <Flex direction="column" gap="1" p="3">
          <Text size="2" color="gray">
            {rtpLabel}
          </Text>
          <Text size="5" weight="medium">
            {formatKpiRtp(kpi.summary.playerRtp)}
          </Text>
        </Flex>
      </Card>
      {extraCards}
    </Grid>

    <Card>
      <Flex direction="column" gap="3" p="4">
        <Text size="3" weight="medium">
          Daily activity
        </Text>
        <PlayerKpiChart daily={kpi.daily} currency={kpi.currency} />
      </Flex>
    </Card>

    <Card>
      <Flex direction="column" gap="3" p="4">
        <Text size="3" weight="medium">
          By game
        </Text>
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Game</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Bets</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Wagered</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Won</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>GGR</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>RTP</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {kpi.games.map((game) => (
              <Table.Row key={game.gameId}>
                <Table.Cell>{game.gameName}</Table.Cell>
                <Table.Cell>{game.totalBets}</Table.Cell>
                <Table.Cell>
                  {formatKpiMoney(game.totalWagered, kpi.currency)}
                </Table.Cell>
                <Table.Cell>
                  {formatKpiMoney(game.totalWon, kpi.currency)}
                </Table.Cell>
                <Table.Cell>
                  <Text color={ggrColor(game.ggr)}>
                    {formatKpiMoney(game.ggr, kpi.currency)}
                  </Text>
                </Table.Cell>
                <Table.Cell>{formatKpiRtp(game.playerRtp)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Card>
  </>
);
