import { CaretLeftIcon } from '@phosphor-icons/react';
import { Badge, Button, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import clsx from 'clsx';
import { useId } from 'react';

import { formatCurrency } from '@vfair/app-common';
import type { MinesBetResult } from '@vfair/game-contracts';
import {
  CopyableTextField,
  formatBetHistoryDate,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import { MinesGridResultPreview } from '../mines-grid-result-preview/mines-grid-result-preview';

import './mines-bet-history-detail.scss';

type MinesBetHistoryDetailProps = {
  result: MinesBetResult;
  onBack: () => void;
};

export const MinesBetHistoryDetail = ({
  result,
  onBack,
}: MinesBetHistoryDetailProps) => {
  const serverSeedInputId = useId();
  const { t } = useTranslation();
  const isDemo = useMainStore((state) => state.isDemo);
  const isWon = result.status === 'won';
  const isActive = result.status === 'active';
  const { date, time } = formatBetHistoryDate(result.createdAt);
  const currencyOptions = {
    currency: result.currency.code,
    decimals: result.currency.decimals,
  };
  const formattedBetAmount = formatCurrency(result.betAmount, currencyOptions);
  const formattedCashOut = formatCurrency(result.cashOut, currencyOptions);
  const mineLayout = result.gameData.mineLayout;
  const serverSeed = result.fairness.serverSeed;
  const playerRevealedTiles = result.gameData.reveals.map(
    (entry) => entry.tile,
  );

  return (
    <Flex className="mines-bet-history-detail" direction="column" gap="4">
      <Button
        className="mines-bet-history-detail__back"
        variant="ghost"
        size="2"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} weight="bold" />
        {t('minesBetHistoryBack')}
      </Button>

      {mineLayout ? (
        <MinesGridResultPreview
          mineLayout={mineLayout}
          playerRevealedTiles={playerRevealedTiles}
          gridSize={result.gameData.gridSize}
        />
      ) : null}

      <div className="mines-bet-history-detail__summary">
        <Flex
          className="mines-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="mines-bet-history-detail__summary-label" size="1">
            {t('minesBetHistoryDate')}
          </Text>
          <Text
            className="mines-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {date}
          </Text>
          <Text
            className="mines-bet-history-detail__summary-value mines-bet-history-detail__summary-value--muted"
            size="1"
          >
            {time}
          </Text>
        </Flex>

        <Flex
          className="mines-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="mines-bet-history-detail__summary-label" size="1">
            {t('minesBetHistoryBet')}
          </Text>
          <Text
            className="mines-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {formattedBetAmount}
          </Text>
          {isDemo ? (
            <Text
              className="mines-bet-history-detail__summary-value mines-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>

        <Flex
          className="mines-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="mines-bet-history-detail__summary-label" size="1">
            {t('minesBetHistoryMultiplier')}
          </Text>
          <Text
            className={clsx(
              'mines-bet-history-detail__summary-value',
              !isActive &&
                (isWon
                  ? 'mines-bet-history-detail__summary-value--won'
                  : 'mines-bet-history-detail__summary-value--lost'),
            )}
            size="2"
            weight="medium"
          >
            {result.gameData.multiplier.toFixed(2)}x
          </Text>
        </Flex>

        <Flex
          className="mines-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="mines-bet-history-detail__summary-label" size="1">
            {t('minesBetHistoryCashOut')}
          </Text>
          {isActive ? (
            <Badge color="blue" size="1" variant="soft">
              {t('minesBetHistoryInProgress')}
            </Badge>
          ) : (
            <Text
              className={clsx(
                'mines-bet-history-detail__summary-value',
                isWon
                  ? 'mines-bet-history-detail__summary-value--won'
                  : 'mines-bet-history-detail__summary-value--lost',
              )}
              size="2"
              weight="medium"
            >
              {formattedCashOut}
            </Text>
          )}
          {isDemo && !isActive ? (
            <Text
              className="mines-bet-history-detail__summary-value mines-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>
      </div>

      <div className="mines-bet-history-detail__target">
        <Text className="mines-bet-history-detail__target-label" size="1">
          {t('minesMineCount')}
        </Text>
        <Text
          className="mines-bet-history-detail__target-value"
          size="2"
          weight="medium"
        >
          {result.gameData.mineCount}
        </Text>
      </div>

      <div className="mines-bet-history-detail__fair">
        <Text size="2" weight="medium">
          {t('shellProvablyFair')}
        </Text>

        <Flex direction="column" gap="3">
          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            <CopyableTextField
              label={t('shellServerSeedCommitment')}
              value={result.fairness.serverSeedHash}
            />
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
            <CopyableTextField
              label={t('shellClientSeed')}
              value={result.fairness.clientSeed}
            />
            <CopyableTextField
              label={t('shellNonce')}
              value={String(result.fairness.nonce)}
            />
          </Grid>
          {serverSeed === null ? (
            <Text
              align="center"
              className="mines-bet-history-detail__fair-hint"
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
