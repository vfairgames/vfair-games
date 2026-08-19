import { getAvailableGame } from '@vfair/game-contracts';

type DecimalLike = {
  toNumber: () => number;
};

type DailyKpiGameRow = {
  gameId: string;
  totalWagered: DecimalLike;
  totalWon: DecimalLike;
  ggr: DecimalLike;
  totalBets: number;
};

type DailyKpiRow = {
  date: Date;
  totalWagered: DecimalLike;
  totalWon: DecimalLike;
  ggr: DecimalLike;
  totalBets: number;
  games: DailyKpiGameRow[];
};

type DailyKpiSummary = {
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
  avgBet: number | null;
  playerRtp: number | null;
};

type DailyKpiDaily = {
  date: string;
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
};

type DailyKpiGame = {
  gameId: string;
  gameName: string;
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
  playerRtp: number | null;
};

type DailyKpiRollup = {
  summary: DailyKpiSummary;
  daily: DailyKpiDaily[];
  games: DailyKpiGame[];
};

const toPlayerRtp = (totalWon: number, totalWagered: number): number | null =>
  totalWagered > 0 ? totalWon / totalWagered : null;

const toAvgBet = (totalWagered: number, totalBets: number): number | null =>
  totalBets > 0 ? totalWagered / totalBets : null;

const formatUtcDateOnly = (value: Date): string =>
  value.toISOString().slice(0, 10);

export const startOfUtcDay = (value: string): Date =>
  new Date(`${value}T00:00:00.000Z`);

export const endOfUtcDay = (value: string): Date =>
  new Date(`${value}T23:59:59.999Z`);

export const rollupDailyKpiRows = (rows: DailyKpiRow[]): DailyKpiRollup => {
  let totalWagered = 0;
  let totalWon = 0;
  let ggr = 0;
  let totalBets = 0;
  const gamesById = new Map<
    string,
    {
      gameId: string;
      totalWagered: number;
      totalWon: number;
      ggr: number;
      totalBets: number;
    }
  >();

  const daily: DailyKpiDaily[] = rows.map((row) => {
    const dayWagered = row.totalWagered.toNumber();
    const dayWon = row.totalWon.toNumber();
    const dayGgr = row.ggr.toNumber();
    const dayBets = row.totalBets;

    totalWagered += dayWagered;
    totalWon += dayWon;
    ggr += dayGgr;
    totalBets += dayBets;

    for (const game of row.games) {
      const existing = gamesById.get(game.gameId);
      const gameWagered = game.totalWagered.toNumber();
      const gameWon = game.totalWon.toNumber();
      const gameGgr = game.ggr.toNumber();

      if (existing) {
        existing.totalWagered += gameWagered;
        existing.totalWon += gameWon;
        existing.ggr += gameGgr;
        existing.totalBets += game.totalBets;
      } else {
        gamesById.set(game.gameId, {
          gameId: game.gameId,
          totalWagered: gameWagered,
          totalWon: gameWon,
          ggr: gameGgr,
          totalBets: game.totalBets,
        });
      }
    }

    return {
      date: formatUtcDateOnly(row.date),
      totalWagered: dayWagered,
      totalWon: dayWon,
      ggr: dayGgr,
      totalBets: dayBets,
    };
  });

  const games: DailyKpiGame[] = [...gamesById.values()]
    .map((game) => {
      const available = getAvailableGame(game.gameId);

      return {
        gameId: game.gameId,
        gameName: available?.name ?? game.gameId,
        totalWagered: game.totalWagered,
        totalWon: game.totalWon,
        ggr: game.ggr,
        totalBets: game.totalBets,
        playerRtp: toPlayerRtp(game.totalWon, game.totalWagered),
      };
    })
    .sort((a, b) => b.totalWagered - a.totalWagered);

  return {
    summary: {
      totalWagered,
      totalWon,
      ggr,
      totalBets,
      avgBet: toAvgBet(totalWagered, totalBets),
      playerRtp: toPlayerRtp(totalWon, totalWagered),
    },
    daily,
    games,
  };
};
