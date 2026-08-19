import { Badge, Flex, Grid, Text, TextArea, TextField } from '@radix-ui/themes';
import { useMemo } from 'react';
import { formatCurrency } from '@vfair/app-common';
import { DICE_GAME_ID } from '@vfair/game-contracts';
import type { AdminPlayerRoundDetail } from '../../services/admin-api.service';
import { formatDateTime } from '../../utils/format-date';
import {
  formatPlayerRoundStatusLabel,
  playerRoundStatusColor,
} from '../../utils/player-round-status';
import './player-bet-detail-modal.scss';

type PlayerBetDetailModalContentProps = {
  round: AdminPlayerRoundDetail;
};

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <Flex direction="column" gap="1">
    <Text size="2" weight="medium">
      {label}
    </Text>
    <TextField.Root readOnly size="2" value={value} />
  </Flex>
);

const isDiceGameData = (
  gameData: Record<string, unknown>,
): gameData is {
  rolledValue: number;
  sliderValue: number;
  gameMode: string;
  multiplier: number;
  winChance: number;
} =>
  typeof gameData.rolledValue === 'number' &&
  typeof gameData.sliderValue === 'number' &&
  typeof gameData.gameMode === 'string' &&
  typeof gameData.multiplier === 'number' &&
  typeof gameData.winChance === 'number';

export const PlayerBetDetailModalContent = ({
  round,
}: PlayerBetDetailModalContentProps) => {
  const formattedBetAmount = useMemo(
    () =>
      formatCurrency(round.betAmount, {
        currency: round.currency.code,
        decimals: round.currency.decimals,
      }),
    [round.betAmount, round.currency],
  );

  const formattedCashOut = useMemo(
    () =>
      formatCurrency(round.cashOut, {
        currency: round.currency.code,
        decimals: round.currency.decimals,
      }),
    [round.cashOut, round.currency],
  );

  const diceGameData =
    round.gameId === DICE_GAME_ID && isDiceGameData(round.gameData)
      ? round.gameData
      : null;

  const multiplier =
    typeof round.gameData.multiplier === 'number'
      ? round.gameData.multiplier
      : null;

  const outcomeJson = useMemo(
    () => JSON.stringify(round.outcome, null, 2),
    [round.outcome],
  );

  return (
    <Flex direction="column" gap="4" className="player-bet-detail-modal">
      <Flex align="center" gap="2">
        <Text size="4" weight="medium">
          Round {round.id}
        </Text>
        <Badge color={playerRoundStatusColor(round.status)} variant="soft">
          {formatPlayerRoundStatusLabel(round.status)}
        </Badge>
      </Flex>

      <Grid columns={{ initial: '1', sm: '2' }} gap="3">
        <ReadOnlyField label="Bet Amount" value={formattedBetAmount} />
        <ReadOnlyField label="Cash Out" value={formattedCashOut} />
        <ReadOnlyField
          label="Multiplier"
          value={multiplier !== null ? `${multiplier}x` : '—'}
        />
        <ReadOnlyField label="Currency" value={round.currency.code} />
        <ReadOnlyField
          label="Date"
          value={formatDateTime(new Date(round.createdAt).toISOString())}
        />
        <ReadOnlyField label="Game" value={round.gameId} />
      </Grid>

      {diceGameData ? (
        <Flex direction="column" gap="3">
          <Text size="3" weight="medium">
            Game Data
          </Text>
          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            <ReadOnlyField
              label="Rolled Value"
              value={diceGameData.rolledValue.toFixed(2)}
            />
            <ReadOnlyField
              label="Slider Value"
              value={diceGameData.sliderValue.toFixed(2)}
            />
            <ReadOnlyField label="Game Mode" value={diceGameData.gameMode} />
            <ReadOnlyField
              label="Win Chance"
              value={`${diceGameData.winChance.toFixed(2)}%`}
            />
          </Grid>
        </Flex>
      ) : null}

      <Flex direction="column" gap="3">
        <Text size="3" weight="medium">
          Outcome
        </Text>
        <TextArea
          className="player-bet-detail-modal__outcome"
          readOnly
          rows={10}
          value={outcomeJson}
        />
      </Flex>

      <Flex direction="column" gap="3">
        <Text size="3" weight="medium">
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
          <ReadOnlyField label="Nonce" value={String(round.fairness.nonce)} />
        </Grid>
      </Flex>

      <Flex direction="column" gap="3">
        <Text size="3" weight="medium">
          Metadata
        </Text>
        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <ReadOnlyField label="Request ID" value={round.requestId} />
          <ReadOnlyField label="RTP" value={String(round.rtp)} />
          <ReadOnlyField
            label="Settled At"
            value={round.settledAt ? formatDateTime(round.settledAt) : '—'}
          />
          <ReadOnlyField
            label="Balance After"
            value={formatCurrency(round.balance, {
              currency: round.currency.code,
              decimals: round.currency.decimals,
            })}
          />
        </Grid>
      </Flex>
    </Flex>
  );
};
