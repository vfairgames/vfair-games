export const diceQueryKeys = {
  queries: {
    betHistory: ['dice', 'betHistory'] as const,
  },
  mutations: {
    placeManualBet: ['dice', 'placeManualBet'] as const,
    placeAutoBet: ['dice', 'placeAutoBet'] as const,
  },
};
