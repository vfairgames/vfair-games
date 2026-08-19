export const DICE_GAME_ID = 'v_dice' as const;
export const LIMBO_GAME_ID = 'v_limbo' as const;
export const MINES_GAME_ID = 'v_mines' as const;
export const PLINKO_GAME_ID = 'v_plinko' as const;
export const KENO_GAME_ID = 'v_keno' as const;

export const AVAILABLE_GAMES = [
  { id: DICE_GAME_ID, name: 'Dice' },
  { id: LIMBO_GAME_ID, name: 'Limbo' },
  { id: MINES_GAME_ID, name: 'Mines' },
  { id: PLINKO_GAME_ID, name: 'Plinko' },
  { id: KENO_GAME_ID, name: 'Keno' },
] as const;

export const PLINKO_RISKS = ['easy', 'medium', 'hard', 'expert'] as const;

export type PlinkoRisk = (typeof PLINKO_RISKS)[number];

export const KENO_RISKS = ['classic', 'low', 'medium', 'high'] as const;

export type KenoRisk = (typeof KENO_RISKS)[number];

export type GameId = (typeof AVAILABLE_GAMES)[number]['id'];

export const isAvailableGameId = (gameId: string): gameId is GameId =>
  AVAILABLE_GAMES.some((game) => game.id === gameId);

export const getAvailableGame = (gameId: string) =>
  AVAILABLE_GAMES.find((game) => game.id === gameId);

export const DICE_GAME_MODES = ['rollOver', 'rollUnder'] as const;

export type DiceGameMode = (typeof DICE_GAME_MODES)[number];

export const AVAILABLE_GAME_IDS = AVAILABLE_GAMES.map(
  (game) => game.id,
) satisfies readonly GameId[];
