export const minesQueryKeys = {
  queries: {
    betHistory: ['mines', 'betHistory'] as const,
  },
  mutations: {
    placeManualBet: ['mines', 'placeManualBet'] as const,
    placeAutoBet: ['mines', 'placeAutoBet'] as const,
    revealTile: ['mines', 'revealTile'] as const,
    cashOut: ['mines', 'cashOut'] as const,
  },
};
