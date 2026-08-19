import clsx from 'clsx';
import {
  calculateProfitOnWin,
  KENO_MULTIPLIER_DECIMALS,
} from '@vfair/game-math';
import { Box, Flex, Grid, Text, Tooltip } from '@radix-ui/themes';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { formatCurrency } from '@vfair/app-common';
import { useMainStore, useTranslation } from '@vfair/games-web-shell';

import { useKenoGameStore } from '../../store/keno-game-store';

import './keno-paytable.scss';

const formatChancePercent = (chance: number): string => {
  const percent = chance * 100;

  if (percent === 0) {
    return '0';
  }

  if (percent >= 0.01) {
    return percent.toFixed(2);
  }

  const magnitude = Math.floor(Math.log10(percent));
  const decimalPlaces = Math.min(-magnitude + 1, 10);

  return percent.toFixed(decimalPlaces);
};

export const KenoPaytable = () => {
  const { t } = useTranslation();
  const {
    kenoOdds,
    form,
    selectedPicks,
    roundStatus,
    revealedNumbers,
    lastResult,
  } = useKenoGameStore(
    useShallow((state) => ({
      kenoOdds: state.kenoOdds,
      form: state.form,
      selectedPicks: state.selectedPicks,
      roundStatus: state.roundStatus,
      revealedNumbers: state.revealedNumbers,
      lastResult: state.lastResult,
    })),
  );
  const { betAmount, currency, currencyDecimals } = useMainStore(
    useShallow((state) => ({
      betAmount: state.roundToCurrency(form.betAmount),
      currency: state.currency,
      currencyDecimals: state.currencyDecimals,
    })),
  );
  const pickCount = selectedPicks.length;

  const highlightedHitCount = useMemo(() => {
    if (roundStatus === 'idle') {
      return null;
    }

    if (roundStatus === 'settled' && lastResult) {
      return lastResult.gameData.hitCount;
    }

    const pickSet = new Set(selectedPicks);
    return revealedNumbers.filter((number) => pickSet.has(number)).length;
  }, [lastResult, revealedNumbers, roundStatus, selectedPicks]);

  const paytable = useMemo(() => {
    if (pickCount === 0) {
      return [0];
    }

    return kenoOdds.getPaytable(pickCount, form.risk);
  }, [kenoOdds, pickCount, form.risk]);

  return (
    <Grid
      className="keno-paytable"
      columns={String(paytable.length)}
      gap="1"
      width="100%"
    >
      {paytable.map((multiplier, hitCount) => {
        const profit = calculateProfitOnWin(
          betAmount,
          multiplier,
          currencyDecimals,
          KENO_MULTIPLIER_DECIMALS,
        );
        const payout = betAmount + profit;
        const displayProfit = Math.max(0, profit);
        const chance =
          pickCount === 0
            ? null
            : kenoOdds.getHitProbability(pickCount, hitCount);
        const chancePercent =
          chance === null ? '—' : formatChancePercent(chance);
        const multiplierLabel =
          pickCount === 0 || multiplier > 0 ? `${multiplier}x` : '—';

        return (
          <Box key={hitCount} className="keno-paytable__item" minWidth="0">
            <Tooltip
              content={
                <>
                  {t('kenoPaytableMultiplier')}: {multiplierLabel}
                  <br />
                  {t('kenoPaytablePayout')}:{' '}
                  {formatCurrency(payout, {
                    currency,
                    decimals: currencyDecimals,
                  })}
                  <br />
                  {t('kenoPaytableProfit')}:{' '}
                  {formatCurrency(displayProfit, {
                    currency,
                    decimals: currencyDecimals,
                  })}
                  <br />
                  {t('kenoPaytableChance')}:{' '}
                  {chance === null ? '—' : `${chancePercent}%`}
                </>
              }
            >
              <Flex
                className={clsx(
                  'keno-paytable__cell',
                  pickCount > 0 &&
                    highlightedHitCount === hitCount &&
                    'keno-paytable__cell--highlight',
                )}
                direction="column"
                align="center"
                justify="center"
                gap="1"
                width="100%"
              >
                <Text
                  align="center"
                  className="keno-paytable__hit-label"
                  color="gray"
                  size="1"
                >
                  {hitCount}x
                </Text>
                <Text
                  align="center"
                  className="keno-paytable__multiplier"
                  size="2"
                  weight="medium"
                >
                  {multiplierLabel}
                </Text>
              </Flex>
            </Tooltip>
          </Box>
        );
      })}
    </Grid>
  );
};
