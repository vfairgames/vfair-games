import { CaretLeftIcon } from '@phosphor-icons/react';
import { Button, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import clsx from 'clsx';
import { useId } from 'react';

import type { KenoBetResult } from '@vfair/game-contracts';
import { CopyableTextField, useTranslation } from '@vfair/games-web-shell';

import { useKenoBetResultDisplay } from '../../use-keno-bet-result-display';

import './keno-bet-history-detail.scss';

type KenoBetHistoryDetailProps = {
  result: KenoBetResult;
  onBack: () => void;
};

const riskLabelKey = {
  classic: 'kenoRiskClassic',
  low: 'kenoRiskLow',
  medium: 'kenoRiskMedium',
  high: 'kenoRiskHigh',
} as const;

export const KenoBetHistoryDetail = ({
  result,
  onBack,
}: KenoBetHistoryDetailProps) => {
  const serverSeedInputId = useId();
  const { t } = useTranslation();
  const { isDemo, isWon, date, time, formattedBetAmount, formattedCashOut } =
    useKenoBetResultDisplay(result);
  const picksSet = new Set(result.gameData.picks);
  const serverSeed = result.fairness.serverSeed;
  const serverSeedHash = result.fairness.serverSeedHash;
  const clientSeed = result.fairness.clientSeed;
  const nonce = result.fairness.nonce;

  return (
    <Flex className="keno-bet-history-detail" direction="column" gap="4">
      <Button
        className="keno-bet-history-detail__back"
        size="2"
        variant="ghost"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} weight="bold" />
        {t('kenoBetHistoryBack')}
      </Button>

      <Flex
        align="center"
        className="keno-bet-history-detail__result"
        justify="center"
      >
        <Text
          className={clsx(
            'keno-bet-history-detail__result-multiplier',
            isWon
              ? 'keno-bet-history-detail__result-multiplier--won'
              : 'keno-bet-history-detail__result-multiplier--lost',
          )}
          size="8"
          weight="bold"
        >
          {Number(result.gameData.multiplier.toFixed(2))}×
        </Text>
      </Flex>

      <div className="keno-bet-history-detail__summary">
        <Flex
          className="keno-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="keno-bet-history-detail__summary-label" size="1">
            {t('kenoBetHistoryDate')}
          </Text>
          <Text
            className="keno-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {date}
          </Text>
          <Text
            className="keno-bet-history-detail__summary-value keno-bet-history-detail__summary-value--muted"
            size="1"
          >
            {time}
          </Text>
        </Flex>

        <Flex
          className="keno-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="keno-bet-history-detail__summary-label" size="1">
            {t('kenoBetHistoryBet')}
          </Text>
          <Text
            className="keno-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {formattedBetAmount}
          </Text>
          {isDemo ? (
            <Text
              className="keno-bet-history-detail__summary-value keno-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>

        <Flex
          className="keno-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="keno-bet-history-detail__summary-label" size="1">
            {t('kenoBetHistoryMultiplier')}
          </Text>
          <Text
            className={clsx(
              'keno-bet-history-detail__summary-value',
              isWon
                ? 'keno-bet-history-detail__summary-value--won'
                : 'keno-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {Number(result.gameData.multiplier.toFixed(2))}x
          </Text>
        </Flex>

        <Flex
          className="keno-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="keno-bet-history-detail__summary-label" size="1">
            {t('kenoBetHistoryCashOut')}
          </Text>
          <Text
            className={clsx(
              'keno-bet-history-detail__summary-value',
              isWon
                ? 'keno-bet-history-detail__summary-value--won'
                : 'keno-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {formattedCashOut}
          </Text>
          {isDemo ? (
            <Text
              className="keno-bet-history-detail__summary-value keno-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>
      </div>

      <div className="keno-bet-history-detail__config">
        <div className="keno-bet-history-detail__config-row">
          <Text className="keno-bet-history-detail__config-label" size="1">
            {t('kenoRisk')}
          </Text>
          <Text
            className="keno-bet-history-detail__config-value"
            size="2"
            weight="medium"
          >
            {t(riskLabelKey[result.gameData.risk])}
          </Text>
        </div>
        <div className="keno-bet-history-detail__config-row">
          <Text className="keno-bet-history-detail__config-label" size="1">
            {t('kenoBetHistoryHits')}
          </Text>
          <Text
            className="keno-bet-history-detail__config-value"
            size="2"
            weight="medium"
          >
            {result.gameData.hitCount} / {result.gameData.picks.length}
          </Text>
        </div>
        <div className="keno-bet-history-detail__config-row">
          <Text className="keno-bet-history-detail__config-label" size="1">
            {t('kenoBetHistoryPicks')}
          </Text>
          <Text
            className="keno-bet-history-detail__config-value"
            size="2"
            weight="medium"
          >
            {result.gameData.picks.join(', ')}
          </Text>
        </div>
        <div className="keno-bet-history-detail__config-row">
          <Text className="keno-bet-history-detail__config-label" size="1">
            {t('kenoBetHistoryDrawnNumbers')}
          </Text>
          <Text
            className="keno-bet-history-detail__config-value"
            size="2"
            weight="medium"
          >
            {result.gameData.drawnNumbers.map((number, index) => (
              <span key={number}>
                {index > 0 ? ', ' : null}
                <span
                  className={clsx(
                    'keno-bet-history-detail__drawn-number',
                    picksSet.has(number)
                      ? 'keno-bet-history-detail__drawn-number--hit'
                      : 'keno-bet-history-detail__drawn-number--miss',
                  )}
                >
                  {number}
                </span>
              </span>
            ))}
          </Text>
        </div>
      </div>

      <div className="keno-bet-history-detail__fair">
        <Text size="2" weight="medium">
          {t('kenoProvablyFairTitle')}
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
              className="keno-bet-history-detail__fair-hint"
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
