export type GamesApiConfig = {
  gamesApiUrl: string;
  partnerCode: string;
  partnerSecret: string;
};

export const resolveGamesApiConfig = (): GamesApiConfig => {
  const gamesApiUrl = process.env['GAMES_API_URL'];
  const partnerCode = process.env['PARTNER_CODE'];
  const partnerSecret = process.env['PARTNER_SECRET'];

  if (gamesApiUrl && partnerCode && partnerSecret) {
    return { gamesApiUrl, partnerCode, partnerSecret };
  }

  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'GAMES_API_URL, PARTNER_CODE, and PARTNER_SECRET are required when NODE_ENV is production',
    );
  }

  return {
    gamesApiUrl: gamesApiUrl ?? 'http://localhost:3000',
    partnerCode: partnerCode ?? 'demo-partner',
    partnerSecret: partnerSecret ?? 'dev-demo-partner-secret',
  };
};
