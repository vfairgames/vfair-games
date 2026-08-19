export const limboQueryKeys = {
  queries: {
    betHistory: ['limbo', 'betHistory'] as const,
  },
  mutations: {
    placeManualBet: ['limbo', 'placeManualBet'] as const,
    placeAutoBet: ['limbo', 'placeAutoBet'] as const,
  },
};
