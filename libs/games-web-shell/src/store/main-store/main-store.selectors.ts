import { useMainStore } from './main-store';

type MainStore = ReturnType<typeof useMainStore.getState>;

export const selectBetLimits = (s: MainStore) => ({
  balance: s.balance,
  minBet: s.minBet,
  maxBet: s.maxBet,
  maxWin: s.maxWin,
});

export const selectFormLimits = (s: MainStore) => {
  const { minBet, maxBet, maxWin } = selectBetLimits(s);

  return { minBet, maxBet, maxWin, currencyDecimals: s.currencyDecimals };
};

export const selectManualBetMainStore = (s: MainStore) => ({
  ...selectBetLimits(s),
  currencyDecimals: s.currencyDecimals,
});
