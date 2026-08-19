import { CaretLeftIcon } from '@phosphor-icons/react';
import { Button, Flex, Grid, Text, TextField } from '@radix-ui/themes';
import clsx from 'clsx';
import { useId } from 'react';

import type { PlinkoBetResult } from '@vfair/game-contracts';
import { CopyableTextField, useTranslation } from '@vfair/games-web-shell';

import { usePlinkoBetResultDisplay } from '../../use-plinko-bet-result-display';

import './plinko-bet-history-detail.scss';

type PlinkoBetHistoryDetailProps = {
  result: PlinkoBetResult;
  onBack: () => void;
};

export const PlinkoBetHistoryDetail = ({
  result,
  onBack,
}: PlinkoBetHistoryDetailProps) => {
  const serverSeedInputId = useId();
  const { t } = useTranslation();
  const { isDemo, isWon, date, time, formattedBetAmount, formattedCashOut } =
    usePlinkoBetResultDisplay(result);
  const serverSeed = result.fairness.serverSeed;
  const serverSeedHash = result.fairness.serverSeedHash;
  const clientSeed = result.fairness.clientSeed;
  const nonce = result.fairness.nonce;

  return (
    <Flex className="plinko-bet-history-detail" direction="column" gap="4">
      <Button
        className="plinko-bet-history-detail__back"
        size="2"
        variant="ghost"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} weight="bold" />
        {t('plinkoBetHistoryBack')}
      </Button>

      <Flex
        align="center"
        className="plinko-bet-history-detail__result"
        justify="center"
      >
        <Text
          className={clsx(
            'plinko-bet-history-detail__result-multiplier',
            isWon
              ? 'plinko-bet-history-detail__result-multiplier--won'
              : 'plinko-bet-history-detail__result-multiplier--lost',
          )}
          size="8"
          weight="bold"
        >
          {Number(result.gameData.multiplier.toFixed(2))}×
        </Text>
      </Flex>

      <div className="plinko-bet-history-detail__summary">
        <Flex
          className="plinko-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="plinko-bet-history-detail__summary-label" size="1">
            {t('plinkoBetHistoryDate')}
          </Text>
          <Text
            className="plinko-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {date}
          </Text>
          <Text
            className="plinko-bet-history-detail__summary-value plinko-bet-history-detail__summary-value--muted"
            size="1"
          >
            {time}
          </Text>
        </Flex>

        <Flex
          className="plinko-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="plinko-bet-history-detail__summary-label" size="1">
            {t('plinkoBetHistoryBet')}
          </Text>
          <Text
            className="plinko-bet-history-detail__summary-value"
            size="2"
            weight="medium"
          >
            {formattedBetAmount}
          </Text>
          {isDemo ? (
            <Text
              className="plinko-bet-history-detail__summary-value plinko-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>

        <Flex
          className="plinko-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="plinko-bet-history-detail__summary-label" size="1">
            {t('plinkoBetHistoryMultiplier')}
          </Text>
          <Text
            className={clsx(
              'plinko-bet-history-detail__summary-value',
              isWon
                ? 'plinko-bet-history-detail__summary-value--won'
                : 'plinko-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {Number(result.gameData.multiplier.toFixed(2))}x
          </Text>
        </Flex>

        <Flex
          className="plinko-bet-history-detail__summary-item"
          direction="column"
          gap="1"
        >
          <Text className="plinko-bet-history-detail__summary-label" size="1">
            {t('plinkoBetHistoryCashOut')}
          </Text>
          <Text
            className={clsx(
              'plinko-bet-history-detail__summary-value',
              isWon
                ? 'plinko-bet-history-detail__summary-value--won'
                : 'plinko-bet-history-detail__summary-value--lost',
            )}
            size="2"
            weight="medium"
          >
            {formattedCashOut}
          </Text>
          {isDemo ? (
            <Text
              className="plinko-bet-history-detail__summary-value plinko-bet-history-detail__summary-value--muted"
              size="1"
            >
              {t('shellDemo')}
            </Text>
          ) : null}
        </Flex>
      </div>

      <div className="plinko-bet-history-detail__config">
        <Text className="plinko-bet-history-detail__config-label" size="1">
          {t('plinkoRows')} / {t('plinkoRisk')}
        </Text>
        <Text
          className="plinko-bet-history-detail__config-value"
          size="2"
          weight="medium"
        >
          {result.gameData.rows} / {result.gameData.risk}
        </Text>
      </div>

      <div className="plinko-bet-history-detail__fair">
        <Text size="2" weight="medium">
          {t('plinkoProvablyFairTitle')}
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
              className="plinko-bet-history-detail__fair-hint"
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
