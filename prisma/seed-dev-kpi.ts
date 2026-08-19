import { AVAILABLE_GAME_IDS } from '../libs/game-contracts/src/games';
import { KpiScope, type PrismaClient } from '../generated/prisma/client';

const KPI_DAYS = 30;
const CURRENCY_SCALE: Record<string, number> = {
  USD: 1,
  EUR: 0.85,
  RUB: 90,
};

type KpiGameRow = {
  gameId: string;
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
};

type KpiTotals = {
  totalWagered: number;
  totalWon: number;
  ggr: number;
  totalBets: number;
  games: KpiGameRow[];
};

const hash32 = (input: string): number => {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const unit = (seed: string): number => hash32(seed) / 0xffffffff;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const utcDateDaysAgo = (daysAgo: number): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysAgo,
    ),
  );
};

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const emptyTotals = (): KpiTotals => ({
  totalWagered: 0,
  totalWon: 0,
  ggr: 0,
  totalBets: 0,
  games: [],
});

const addGame = (totals: KpiTotals, game: KpiGameRow): void => {
  totals.totalWagered = roundMoney(totals.totalWagered + game.totalWagered);
  totals.totalWon = roundMoney(totals.totalWon + game.totalWon);
  totals.ggr = roundMoney(totals.ggr + game.ggr);
  totals.totalBets += game.totalBets;

  const existing = totals.games.find((row) => row.gameId === game.gameId);

  if (existing) {
    existing.totalWagered = roundMoney(
      existing.totalWagered + game.totalWagered,
    );
    existing.totalWon = roundMoney(existing.totalWon + game.totalWon);
    existing.ggr = roundMoney(existing.ggr + game.ggr);
    existing.totalBets += game.totalBets;
    return;
  }

  totals.games.push({ ...game });
};

const mergeTotals = (into: KpiTotals, from: KpiTotals): void => {
  for (const game of from.games) {
    addGame(into, game);
  }
};

const buildPlayerDay = (
  playerIndex: number,
  playerId: number,
  currency: string,
  date: string,
): KpiTotals | null => {
  if (playerIndex > 0 && unit(`${playerId}:${currency}:${date}:skip`) < 0.18) {
    return null;
  }

  const scale = CURRENCY_SCALE[currency] ?? 1;
  const volume = 0.45 + playerIndex * 0.22;
  const totals = emptyTotals();

  for (const gameId of AVAILABLE_GAME_IDS) {
    if (unit(`${playerId}:${currency}:${date}:${gameId}:play`) < 0.28) {
      continue;
    }

    const bets =
      3 + Math.floor(unit(`${playerId}:${date}:${gameId}:bets`) * 36 * volume);
    const avgBet =
      (1.5 + unit(`${playerId}:${date}:${gameId}:bet`) * 22) * scale;
    const totalWagered = roundMoney(bets * avgBet);
    const rtp = 0.8 + unit(`${playerId}:${date}:${gameId}:rtp`) * 0.32;
    const totalWon = roundMoney(totalWagered * rtp);

    addGame(totals, {
      gameId,
      totalWagered,
      totalWon,
      ggr: roundMoney(totalWagered - totalWon),
      totalBets: bets,
    });
  }

  return totals.totalBets === 0 ? null : totals;
};

export const seedDevKpi = async (
  prisma: PrismaClient,
  input: { partnerId: number; playerIds: number[]; currencies: string[] },
): Promise<void> => {
  const kpiRows: {
    date: Date;
    scope: KpiScope;
    partnerId: number;
    playerId: number;
    currency: string;
    totalWagered: number;
    totalWon: number;
    ggr: number;
    totalBets: number;
  }[] = [];
  const gamesByKey = new Map<string, KpiGameRow[]>();

  const rowKey = (
    date: Date,
    scope: KpiScope,
    partnerId: number,
    playerId: number,
    currency: string,
  ): string => `${dateKey(date)}|${scope}|${partnerId}|${playerId}|${currency}`;

  const pushRow = (
    date: Date,
    scope: KpiScope,
    partnerId: number,
    playerId: number,
    currency: string,
    totals: KpiTotals,
  ): void => {
    kpiRows.push({
      date,
      scope,
      partnerId,
      playerId,
      currency,
      totalWagered: totals.totalWagered,
      totalWon: totals.totalWon,
      ggr: totals.ggr,
      totalBets: totals.totalBets,
    });
    gamesByKey.set(
      rowKey(date, scope, partnerId, playerId, currency),
      totals.games,
    );
  };

  for (let daysAgo = KPI_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = utcDateDaysAgo(daysAgo);
    const day = dateKey(date);

    for (const currency of input.currencies) {
      const partnerTotals = emptyTotals();

      for (const [playerIndex, playerId] of input.playerIds.entries()) {
        const playerDay = buildPlayerDay(playerIndex, playerId, currency, day);

        if (!playerDay) {
          continue;
        }

        mergeTotals(partnerTotals, playerDay);
        pushRow(
          date,
          KpiScope.PLAYER,
          input.partnerId,
          playerId,
          currency,
          playerDay,
        );
      }

      if (partnerTotals.totalBets === 0) {
        continue;
      }

      pushRow(
        date,
        KpiScope.PARTNER,
        input.partnerId,
        0,
        currency,
        partnerTotals,
      );
      pushRow(date, KpiScope.GLOBAL, 0, 0, currency, partnerTotals);
    }
  }

  await prisma.dailyKpi.createMany({ data: kpiRows });

  const created = await prisma.dailyKpi.findMany({
    select: {
      id: true,
      date: true,
      scope: true,
      partnerId: true,
      playerId: true,
      currency: true,
    },
  });

  const gameRows = created.flatMap((row) => {
    const games = gamesByKey.get(
      rowKey(row.date, row.scope, row.partnerId, row.playerId, row.currency),
    );

    if (!games) {
      throw new Error(
        `Dev KPI seed missed games for ${dateKey(row.date)} ${row.scope} ${row.currency}`,
      );
    }

    return games.map((game) => ({
      dailyKpiId: row.id,
      gameId: game.gameId,
      totalWagered: game.totalWagered,
      totalWon: game.totalWon,
      ggr: game.ggr,
      totalBets: game.totalBets,
    }));
  });

  await prisma.dailyKpiGame.createMany({ data: gameRows });
};
