export type FairnessState = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

export type FairnessSnapshot = FairnessState & {
  serverSeed: string | null;
};

export type NextSeedPair = {
  newClientSeed: string;
  nextServerSeedHash: string;
};

export type ActiveRoundGame = {
  gameId: string;
  gameName: string;
};

export type ActiveRoundsState = {
  games: ActiveRoundGame[];
};

export type RotateFairnessRequest = {
  clientSeed: string;
};
