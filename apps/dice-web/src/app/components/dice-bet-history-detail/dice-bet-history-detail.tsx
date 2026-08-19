import { CaretLeftIcon } from '@phosphor-icons/react';
import { Button, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import clsx from 'clsx';
import { useId, useMemo } from 'react';

import { formatCurrency } from '@vfair/app-common';
import {
  CopyableTextField,
  formatBetHistoryDate,
  useMainStore,
  useTranslation,
} from '@vfair/games-web-shell';

import type { DiceBetResult } from '@vfair/game-contracts';
import { DiceSliderResultPreview } from '../dice-slider-result-preview/dice-slider-result-preview';

import './dice-bet-history-detail.scss';

type DiceBetHistoryDetailProps = {
  result: DiceBetResult;
  onBack: () => void;
};

export const DiceBetHistoryDetail = ({
  result,
  onBack,
}: DiceBetHistoryDetailProps) => {
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
  const gameModeLabel =
    result.gameData.gameMode === 'rollOver'
      ? t('diceRollOver')
      : t('diceRollUnder');
  const serverSeed = result.fairness.serverSeed;
  const serverSeedHash = result.fairness.serverSeedHash;
  const clientSeed = result.fairness.clientSeed;
  const nonce = result.fairness.nonce;

  return (
    <Flex className="dice-bet-history-detail" direction="column" gap="4">
      <Button
        className="dice-bet-history-detail__back"
        variant="ghost"
        size="2"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} weight="bold" />
        {t('diceBetHistoryBack')}
      </Button>

      <DiceSliderResultPreview
        gameMode={result.gameData.gameMode}
        rolledValue={result.gameData.rolledValue}
        sliderValue={result.gameData.sliderValue}
        status={result.status === 'won' ? 'won' : 'lost'}
      />

      <div className="dice-bet-history-detail__summary">
        <Flex
          className="dice-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="dice-bet-history-detail__summary-label" size="1">
            {t('diceBetHistoryDate')}
          </Text>
          <Text
            className="dice-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {date}
          </Text>
          <Text
            className="dice-bet-history-detail__summary-value dice-bet-history-detail__summary-value--muted"
            size="1"
          >
            {time}
          </Text>
        </Flex>

        <Flex
          className="dice-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="dice-bet-history-detail__summary-label" size="1">
            {t('diceBetHistoryBet')}
          </Text>
          <Text
            className="dice-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {formattedBetAmount}
          </Text>
          {isDemo ? (
            <Text
              className="dice-bet-history-detail__summary-value dice-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>

        <Flex
          className="dice-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="dice-bet-history-detail__summary-label" size="1">
            {t('diceBetHistoryMultiplier')}
          </Text>
          <Text
            className={clsx(
              'dice-bet-history-detail__summary-value',
              isWon
                ? 'dice-bet-history-detail__summary-value--won'
                : 'dice-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {result.gameData.multiplier}x
          </Text>
        </Flex>

        <Flex
          className="dice-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="dice-bet-history-detail__summary-label" size="1">
            {t('diceBetHistoryCashOut')}
          </Text>
          <Text
            className={clsx(
              'dice-bet-history-detail__summary-value',
              isWon
                ? 'dice-bet-history-detail__summary-value--won'
                : 'dice-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {formattedCashOut}
          </Text>
          {isDemo ? (
            <Text
              className="dice-bet-history-detail__summary-value dice-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>
      </div>

      <div className="dice-bet-history-detail__roll-mode">
        <Text className="dice-bet-history-detail__roll-mode-label" size="1">
          {gameModeLabel}
        </Text>
        <Text
          className="dice-bet-history-detail__roll-mode-value"
          size="2"
          weight="medium"
        >
          {result.gameData.sliderValue.toFixed(2)}
        </Text>
      </div>

      <div className="dice-bet-history-detail__fair">
        <Text size="2" weight="medium">
          {t('diceProvablyFairTitle')}
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
              className="dice-bet-history-detail__fair-hint"
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
