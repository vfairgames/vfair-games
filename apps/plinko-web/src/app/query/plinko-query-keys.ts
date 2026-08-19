export const plinkoQueryKeys = {
  queries: {
    betHistory: ['plinko', 'betHistory'] as const,
  },
  mutations: {
    placeManualBet: ['plinko', 'placeManualBet'] as const,
    placeAutoBet: ['plinko', 'placeAutoBet'] as const,
  },
};
