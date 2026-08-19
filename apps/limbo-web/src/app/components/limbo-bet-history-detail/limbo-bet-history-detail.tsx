import { CaretLeftIcon } from '@phosphor-icons/react';
import { Button, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import clsx from 'clsx';
import { useId, useMemo } from 'react';

import { formatCurrency } from '@vfair/app-common';
import type { LimboBetResult } from '@vfair/game-contracts';
import {
  CopyableTextField,
  formatBetHistoryDate,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import './limbo-bet-history-detail.scss';

type LimboBetHistoryDetailProps = {
  result: LimboBetResult;
  onBack: () => void;
};

export const LimboBetHistoryDetail = ({
  result,
  onBack,
}: LimboBetHistoryDetailProps) => {
  const serverSeedInputId = useId();
  const { t } = useTranslation();
  const isDemo = useMainStore((state) => state.isDemo);
  const isWon = result.status === 'won';
  const { date, time } = formatBetHistoryDate(result.createdAt);
  const formattedBetAmount = useMemo(
    () =>
      formatCurrency(result.betAmount, {
        currency: result.currency.code,
        decimals: result.currency.decimals,
      }),
    [result.betAmount, result.currency],
  );
  const formattedCashOut = useMemo(
    () =>
      formatCurrency(result.cashOut, {
        currency: result.currency.code,
        decimals: result.currency.decimals,
      }),
    [result.cashOut, result.currency],
  );
  const serverSeed = result.fairness.serverSeed;
  const serverSeedHash = result.fairness.serverSeedHash;
  const clientSeed = result.fairness.clientSeed;
  const nonce = result.fairness.nonce;

  return (
    <Flex className="limbo-bet-history-detail" direction="column" gap="4">
      <Button
        className="limbo-bet-history-detail__back"
        variant="ghost"
        size="2"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} weight="bold" />
        {t('limboBetHistoryBack')}
      </Button>

      <Flex
        className="limbo-bet-history-detail__result"
        align="center"
        justify="center"
      >
        <Text
          size="8"
          weight="bold"
          className={clsx(
            'limbo-bet-history-detail__result-multiplier',
            isWon
              ? 'limbo-bet-history-detail__result-multiplier--won'
              : 'limbo-bet-history-detail__result-multiplier--lost',
          )}
        >
          {result.gameData.rolledMultiplier.toFixed(2)}×
        </Text>
      </Flex>

      <div className="limbo-bet-history-detail__summary">
        <Flex
          className="limbo-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="limbo-bet-history-detail__summary-label" size="1">
            {t('limboBetHistoryDate')}
          </Text>
          <Text
            className="limbo-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {date}
          </Text>
          <Text
            className="limbo-bet-history-detail__summary-value limbo-bet-history-detail__summary-value--muted"
            size="1"
          >
            {time}
          </Text>
        </Flex>

        <Flex
          className="limbo-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="limbo-bet-history-detail__summary-label" size="1">
            {t('limboBetHistoryBet')}
          </Text>
          <Text
            className="limbo-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {formattedBetAmount}
          </Text>
          {isDemo ? (
            <Text
              className="limbo-bet-history-detail__summary-value limbo-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>

        <Flex
          className="limbo-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="limbo-bet-history-detail__summary-label" size="1">
            {t('limboBetHistoryMultiplier')}
          </Text>
          <Text
            className={clsx(
              'limbo-bet-history-detail__summary-value',
              isWon
                ? 'limbo-bet-history-detail__summary-value--won'
                : 'limbo-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {result.gameData.multiplier}x
          </Text>
        </Flex>

        <Flex
          className="limbo-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="limbo-bet-history-detail__summary-label" size="1">
            {t('limboBetHistoryCashOut')}
          </Text>
          <Text
            className={clsx(
              'limbo-bet-history-detail__summary-value',
              isWon
                ? 'limbo-bet-history-detail__summary-value--won'
                : 'limbo-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {formattedCashOut}
          </Text>
          {isDemo ? (
            <Text
              className="limbo-bet-history-detail__summary-value limbo-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>
      </div>

      <div className="limbo-bet-history-detail__target">
        <Text className="limbo-bet-history-detail__target-label" size="1">
          {t('limboTargetMultiplier')}
        </Text>
        <Text
          className="limbo-bet-history-detail__target-value"
          size="2"
          weight="medium"
        >
          {result.gameData.targetMultiplier}x
        </Text>
      </div>

      <div className="limbo-bet-history-detail__fair">
        <Text size="2" weight="medium">
          {t('limboProvablyFairTitle')}
        </Text>

        <Flex direction="column" gap="3">
          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            {serverSeedHash ? (
              <CopyableTextField
                label={t('shellServerSeedCommitment')}
                value={serverSeedHash}
              />
            ) : null}
            {serverSeed ? (
              <CopyableTextField
                label={t('shellServerSeed')}
                value={serverSeed}
              />
            ) : (
              <Flex direction="column" gap="1">
                <Text
                  as="label"
                  htmlFor={serverSeedInputId}
                  size="2"
                  weight="medium"
                >
                  {t('shellServerSeed')}
                </Text>
                <TextField.Root
                  id={serverSeedInputId}
                  readOnly
                  size="3"
                  value={t('shellServerSeedNotRevealed')}
                />
              </Flex>
            )}
            {clientSeed ? (
              <CopyableTextField
                label={t('shellClientSeed')}
                value={clientSeed}
              />
            ) : null}
            {nonce !== undefined ? (
              <CopyableTextField
                label={t('shellNonce')}
                value={String(nonce)}
              />
            ) : null}
          </Grid>
          {serverSeed === null ? (
            <Text
              align="center"
              className="limbo-bet-history-detail__fair-hint"
              size="1"
            >
              {t('shellChangeSeedPairToVerify')}
            </Text>
          ) : null}
        </Flex>
      </div>
    </Flex>
  );
};
