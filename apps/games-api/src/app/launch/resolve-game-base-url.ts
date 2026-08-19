import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
  type GameId,
  isAvailableGameId,
} from '@vfair/game-contracts';

const LOCAL_GAME_BASE_URLS: Record<GameId, string> = {
  [DICE_GAME_ID]: 'http://localhost:4200',
  [MINES_GAME_ID]: 'http://localhost:4201',
  [LIMBO_GAME_ID]: 'http://localhost:4202',
  [PLINKO_GAME_ID]: 'http://localhost:4203',
  [KENO_GAME_ID]: 'http://localhost:4204',
};

const GAME_BASE_URL_ENV: Record<GameId, string> = {
  [DICE_GAME_ID]: 'DICE_GAME_BASE_URL',
  [MINES_GAME_ID]: 'MINES_GAME_BASE_URL',
  [LIMBO_GAME_ID]: 'LIMBO_GAME_BASE_URL',
  [PLINKO_GAME_ID]: 'PLINKO_GAME_BASE_URL',
  [KENO_GAME_ID]: 'KENO_GAME_BASE_URL',
};

const resolveConfiguredUrl = (envKey: string, fallback: string): string => {
  const trimmed = process.env[envKey]?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${envKey} is required when NODE_ENV is production`);
  }

  return fallback;
};

export const resolveGameBaseUrl = (gameId: string): string => {
  const resolvedGameId = isAvailableGameId(gameId) ? gameId : DICE_GAME_ID;

  return resolveConfiguredUrl(
    GAME_BASE_URL_ENV[resolvedGameId],
    LOCAL_GAME_BASE_URLS[resolvedGameId],
  );
};
