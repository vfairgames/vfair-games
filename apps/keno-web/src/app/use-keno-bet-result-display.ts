import { useMemo } from 'react';

import { formatCurrency } from '@vfair/app-common';
import type { KenoBetResult } from '@vfair/game-contracts';
import { formatBetHistoryDate, useMainStore } from '@vfair/games-web-shell';

export const useKenoBetResultDisplay = (result: KenoBetResult) => {
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

  return { isDemo, isWon, date, time, formattedBetAmount, formattedCashOut };
};
