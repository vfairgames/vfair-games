import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { Injectable } from '@nestjs/common';
import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from '@vfair/game-math';
import type {
  ActiveRoundsState,
  FairnessState,
  NextSeedPair,
  RotateFairnessRequest,
} from '@vfair/game-contracts';
import { getAvailableGame } from '@vfair/game-contracts';
import { InjectPinoLogger, PinoLogger } from '@vfair/nest-utils';
import { WsException } from '@nestjs/websockets';
import { RoundStatus, SeedStatus, type Prisma } from '@vfair/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { toFairnessState } from '../bet/round.mapper';
import {
  type LockedOpenRotation,
  type LockedOpenRotationRow,
  mapLockedOpenRotationRow,
} from './fairness-rotation.types';

const BET_SETTLEMENT_LOCK_TTL_SECONDS = 60;
const BET_SETTLEMENT_LOCK_WAIT_MS = 3000;
const BET_SETTLEMENT_LOCK_RETRY_MS = 50;

const betSettlementLockKey = (playerId: number): string =>
  `games-api:player:${playerId}:bet-settlement`;

const releaseBetSettlementLockScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

@Injectable()
export class FairnessService {
  constructor(
    @InjectPinoLogger(FairnessService.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async withBetSettlementLock<T>(
    playerId: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    const key = betSettlementLockKey(playerId);
    const token = randomUUID();
    const deadline = Date.now() + BET_SETTLEMENT_LOCK_WAIT_MS;

    try {
      while (true) {
        const acquired = await this.redisService.client.set(
          key,
          token,
          'EX',
          BET_SETTLEMENT_LOCK_TTL_SECONDS,
          'NX',
        );

        if (acquired === 'OK') {
          break;
        }

        if (Date.now() >= deadline) {
          throw new WsException({
            err_code: 'bet_in_progress',
            message: 'Another bet is currently being settled',
          });
        }

        await sleep(BET_SETTLEMENT_LOCK_RETRY_MS);
      }
    } catch (error: unknown) {
      if (error instanceof WsException) {
        throw error;
      }

      this.logger.error(
        { error, playerId },
        'Failed to acquire bet settlement lock',
      );

      throw new WsException({
        err_code: 'bet_failed',
        message: 'Bet failed',
      });
    }

    try {
      return await callback();
    } finally {
      try {
        await this.redisService.client.eval(
          releaseBetSettlementLockScript,
          1,
          key,
          token,
        );
      } catch (error: unknown) {
        this.logger.fatal(
          { error, playerId },
          'Failed to release bet settlement lock',
        );
      }
    }
  }

  async ensureBootstrap(playerId: number): Promise<void> {
    const existing = await this.prisma.fairnessRotation.findFirst({
      where: { playerId, endedAt: null },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.bootstrapInTransaction(tx, playerId);
      });
    } catch (error: unknown) {
      this.logger.warn(
        { error, playerId },
        'Fairness bootstrap raced; verifying rotation exists',
      );

      const created = await this.prisma.fairnessRotation.findFirst({
        where: { playerId, endedAt: null },
        select: { id: true },
      });

      if (!created) {
        throw new WsException({
          err_code: 'fairness_bootstrap_failed',
          message: 'Failed to initialize provably fair state',
        });
      }
    }
  }

  async bootstrapInTransaction(
    tx: Prisma.TransactionClient,
    playerId: number,
  ): Promise<void> {
    const openRotation = await tx.fairnessRotation.findFirst({
      where: { playerId, endedAt: null },
      select: { id: true },
    });

    if (openRotation) {
      return;
    }

    const serverSeedA = generateServerSeed();
    const serverSeedB = generateServerSeed();
    const clientSeed = generateClientSeed();

    const activeSeed = await tx.provablyFairSeed.create({
      data: {
        playerId,
        serverSeed: serverSeedA,
        serverSeedHash: hashServerSeed(serverSeedA),
        status: SeedStatus.ACTIVE,
      },
    });

    await tx.provablyFairSeed.create({
      data: {
        playerId,
        serverSeed: serverSeedB,
        serverSeedHash: hashServerSeed(serverSeedB),
        status: SeedStatus.COMMITTED,
      },
    });

    await tx.fairnessRotation.create({
      data: {
        playerId,
        serverSeedId: activeSeed.id,
        clientSeed,
        sequence: 1,
        nonceCount: 0,
      },
    });
  }

  async lockOpenRotation(
    tx: Prisma.TransactionClient,
    playerId: number,
  ): Promise<LockedOpenRotation | null> {
    const rows = await tx.$queryRaw<LockedOpenRotationRow[]>`
      SELECT
        fr.id,
        fr."clientSeed",
        fr."nonceCount",
        fr.sequence,
        fr."serverSeedId",
        pfs.id AS "seedId",
        pfs."serverSeed",
        pfs."serverSeedHash",
        pfs.status AS "seedStatus"
      FROM "FairnessRotation" fr
      INNER JOIN "ProvablyFairSeed" pfs ON pfs.id = fr."serverSeedId"
      WHERE fr."playerId" = ${playerId}
        AND fr."endedAt" IS NULL
      FOR UPDATE OF fr
    `;

    const row = rows[0];

    if (!row) {
      return null;
    }

    return mapLockedOpenRotationRow(row);
  }

  async getFairnessState(playerId: number): Promise<FairnessState> {
    await this.ensureBootstrap(playerId);

    const rotation = await this.loadOpenRotation(playerId);

    return toFairnessState(rotation);
  }

  async getNextSeedPair(playerId: number): Promise<NextSeedPair> {
    const nextServerSeedHash = await this.resolveCommittedSeedHash(playerId);

    return {
      newClientSeed: generateClientSeed(),
      nextServerSeedHash,
    };
  }

  async getActiveRounds(playerId: number): Promise<ActiveRoundsState> {
    const activeRounds = await this.prisma.gameRound.findMany({
      where: { playerId, status: RoundStatus.ACTIVE },
      select: { gameId: true },
      orderBy: { gameId: 'asc' },
    });

    return {
      games: activeRounds.map((round) => ({
        gameId: round.gameId,
        gameName: getAvailableGame(round.gameId)?.name ?? round.gameId,
      })),
    };
  }

  async rotateFairness(
    playerId: number,
    request: RotateFairnessRequest,
  ): Promise<FairnessState> {
    if (await this.isBetSettlementInProgress(playerId)) {
      throw new WsException({
        err_code: 'bet_settlement_in_progress',
        message: 'Finish the in-progress bet before rotating seeds',
      });
    }

    const activeRounds = await this.getActiveRounds(playerId);

    if (activeRounds.games.length > 0) {
      throw new WsException({
        err_code: 'active_round_exists',
        message: 'Finish the active round before rotating seeds',
        games: activeRounds.games,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      let currentRotation = await this.lockOpenRotation(tx, playerId);

      if (!currentRotation) {
        await this.bootstrapInTransaction(tx, playerId);
        currentRotation = await this.lockOpenRotation(tx, playerId);
      }

      if (!currentRotation) {
        throw new WsException({
          err_code: 'fairness_state_invalid',
          message: 'Active fairness rotation was not found',
        });
      }

      const committedSeed = await tx.provablyFairSeed.findFirst({
        where: { playerId, status: SeedStatus.COMMITTED },
      });

      if (!committedSeed) {
        throw new WsException({
          err_code: 'fairness_state_invalid',
          message: 'Committed server seed was not found',
        });
      }

      const now = new Date();

      await tx.provablyFairSeed.update({
        where: { id: currentRotation.serverSeedId },
        data: {
          status: SeedStatus.REVEALED,
          revealedAt: now,
        },
      });

      await tx.fairnessRotation.update({
        where: { id: currentRotation.id },
        data: { endedAt: now },
      });

      await tx.provablyFairSeed.update({
        where: { id: committedSeed.id },
        data: { status: SeedStatus.ACTIVE },
      });

      const nextCommittedSeed = generateServerSeed();

      await tx.provablyFairSeed.create({
        data: {
          playerId,
          serverSeed: nextCommittedSeed,
          serverSeedHash: hashServerSeed(nextCommittedSeed),
          status: SeedStatus.COMMITTED,
        },
      });

      const nextRotation = await tx.fairnessRotation.create({
        data: {
          playerId,
          serverSeedId: committedSeed.id,
          clientSeed: request.clientSeed,
          sequence: currentRotation.sequence + 1,
          nonceCount: 0,
        },
        include: { serverSeed: true },
      });

      return toFairnessState(nextRotation);
    });
  }

  private resolveCommittedSeedHash = async (
    playerId: number,
  ): Promise<string> => {
    return this.prisma.$transaction(async (tx) => {
      const [rotation, committedSeed] = await Promise.all([
        tx.fairnessRotation.findFirst({
          where: { playerId, endedAt: null },
          select: { id: true },
        }),
        tx.provablyFairSeed.findFirst({
          where: { playerId, status: SeedStatus.COMMITTED },
          select: { serverSeedHash: true },
        }),
      ]);

      if (rotation && committedSeed) {
        return committedSeed.serverSeedHash;
      }

      await this.bootstrapInTransaction(tx, playerId);

      const afterBootstrap = await tx.provablyFairSeed.findFirst({
        where: { playerId, status: SeedStatus.COMMITTED },
        select: { serverSeedHash: true },
      });

      if (!afterBootstrap) {
        throw new WsException({
          err_code: 'fairness_state_invalid',
          message: 'Committed server seed is missing',
        });
      }

      return afterBootstrap.serverSeedHash;
    });
  };

  private isBetSettlementInProgress = async (
    playerId: number,
  ): Promise<boolean> => {
    try {
      return (
        (await this.redisService.client.exists(
          betSettlementLockKey(playerId),
        )) === 1
      );
    } catch (error: unknown) {
      this.logger.warn(
        { error, playerId },
        'Failed to read bet settlement lock; blocking seed rotation',
      );
      return true;
    }
  };

  private loadOpenRotation = async (playerId: number) => {
    const rotation = await this.prisma.fairnessRotation.findFirst({
      where: { playerId, endedAt: null },
      include: { serverSeed: true },
    });

    if (!rotation) {
      throw new WsException({
        err_code: 'fairness_state_invalid',
        message: 'Active fairness rotation was not found',
      });
    }

    return rotation;
  };
}
