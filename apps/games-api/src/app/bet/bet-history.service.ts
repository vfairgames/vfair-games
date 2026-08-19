import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type {
  GetBetHistoryRequest,
  GetBetHistoryResponse,
} from '@vfair/game-contracts';
import { MINES_GAME_ID } from '@vfair/game-contracts';
import { RoundStatus } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionTokenPayload } from '../session/session-token.service';
import {
  InvalidRoundOutcomeError,
  mapGameRoundToBetResult,
} from './round.mapper';
import { roundHistorySelect } from './round.types';

const DEFAULT_HISTORY_LIMIT = 30;
const MAX_HISTORY_LIMIT = 100;

const historyStatusesForGame = (gameId: string): RoundStatus[] => {
  if (gameId === MINES_GAME_ID) {
    return [RoundStatus.WON, RoundStatus.LOST, RoundStatus.ACTIVE];
  }

  return [RoundStatus.WON, RoundStatus.LOST];
};

@Injectable()
export class BetHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getBetHistory(
    session: SessionTokenPayload,
    request: GetBetHistoryRequest,
  ): Promise<GetBetHistoryResponse> {
    if (request.gameId && request.gameId !== session.gameId) {
      throw new WsException({
        err_code: 'game_not_available',
        message: 'Game not available',
      });
    }

    const playerId = Number(session.sub);
    const limit = Math.min(
      Math.max(request.limit ?? DEFAULT_HISTORY_LIMIT, 1),
      MAX_HISTORY_LIMIT,
    );
    const cursorId = request.cursor ? BigInt(request.cursor) : undefined;
    const gameId = session.gameId;

    const rounds = await this.prisma.gameRound.findMany({
      where: {
        playerId,
        gameId,
        status: {
          in: historyStatusesForGame(gameId),
        },
        ...(cursorId
          ? {
              id: {
                lt: cursorId,
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: roundHistorySelect,
    });

    const hasNextPage = rounds.length > limit;
    const page = hasNextPage ? rounds.slice(0, limit) : rounds;

    return {
      items: page.map((round) => {
        try {
          return mapGameRoundToBetResult(round);
        } catch (error: unknown) {
          if (error instanceof InvalidRoundOutcomeError) {
            throw new WsException({
              err_code: 'invalid_round_outcome',
              message: 'Bet history contains invalid round data',
            });
          }

          throw error;
        }
      }),
      ...(hasNextPage
        ? { nextCursor: page[page.length - 1]?.id.toString() }
        : {}),
    };
  }
}
