jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@vfair/prisma-client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(
        message: string,
        options: { code: string; clientVersion: string },
      ) {
        super(message);
        this.code = options.code;
      }
    },
  },
  RoundStatus: {
    ACTIVE: 'ACTIVE',
    WON: 'WON',
    LOST: 'LOST',
    FAILED: 'FAILED',
  },
  SeedStatus: {
    COMMITTED: 'COMMITTED',
    ACTIVE: 'ACTIVE',
    REVEALED: 'REVEALED',
  },
  WalletTxType: {
    DEBIT: 'DEBIT',
    CREDIT: 'CREDIT',
    ROLLBACK: 'ROLLBACK',
  },
  WalletTxStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED',
    ROLLED_BACK: 'ROLLED_BACK',
  },
}));
jest.mock('../partner-wallet/partner-wallet.service', () => ({
  PartnerWalletService: class PartnerWalletService {},
}));
jest.mock('../fairness/fairness.service', () => ({
  FairnessService: class FairnessService {},
}));
jest.mock('../partner-config/partner-config.service', () => ({
  PartnerConfigService: class PartnerConfigService {},
}));
jest.mock('../messaging/round-settled.publisher', () => ({
  RoundSettledPublisher: class RoundSettledPublisher {},
}));

import { WsException } from '@nestjs/websockets';
import {
  Prisma,
  RoundStatus,
  SeedStatus,
  WalletTxStatus,
  WalletTxType,
} from '@vfair/prisma-client';
import type { LimboPlaceBetRequest } from '@vfair/game-contracts';
import { LIMBO_GAME_ID } from '@vfair/game-contracts';
import { createLimboOdds } from '@vfair/game-math';
import type { PartnerRuntimeConfig } from '../partner-config/partner-config-validation';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FairnessService } from '../fairness/fairness.service';
import type { PartnerWalletService } from '../partner-wallet/partner-wallet.service';
import type { RoundSettledPublisher } from '../messaging/round-settled.publisher';
import type { SessionTokenPayload } from '../session/session-token.service';
import { LimboBetService } from './limbo-bet.service';
import { PlaceBetSupportService } from './place-bet-support.service';

const decimal = (value: number) => ({
  toNumber: () => value,
  toString: () => String(value),
});

const session: SessionTokenPayload = {
  sub: '7',
  partnerId: 1,
  partnerCode: 'acme',
  externalPlayerId: 'player-1',
  gameId: LIMBO_GAME_ID,
  jti: 'session-1',
};

const gameConfig = {
  enabled: true,
  rtp: 0.98,
};

const winOdds = createLimboOdds(gameConfig.rtp).calculate({
  targetMultiplier: 1.01,
});

const loseOdds = createLimboOdds(gameConfig.rtp).calculate({
  targetMultiplier: 2,
});

const winRequest: LimboPlaceBetRequest = {
  requestId: 'req-1',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: {
    targetMultiplier: winOdds.targetMultiplier,
    winChance: winOdds.winChance,
  },
};

const loseRequest: LimboPlaceBetRequest = {
  requestId: 'req-1',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: {
    targetMultiplier: loseOdds.targetMultiplier,
    winChance: loseOdds.winChance,
  },
};

const currencyConfig = {
  currency: 'USD',
  minBet: 0.1,
  maxBet: 100,
  maxWin: 1000,
  currencyDecimals: 2,
  countryCode: 'US',
};

const config = {
  partnerId: 1,
  partnerCode: 'acme',
  webhookUrl: 'https://partner.test',
  currencyConfigs: { USD: currencyConfig },
  gameConfigs: { [LIMBO_GAME_ID]: gameConfig },
} as unknown as PartnerRuntimeConfig;

const rotation = {
  id: 99,
  clientSeed: 'client-seed',
  nonceCount: 0,
  sequence: 1,
  serverSeedId: 55,
  serverSeed: {
    id: 55,
    serverSeed:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    serverSeedHash: 'hash',
    status: SeedStatus.ACTIVE,
  },
};

type RoundSnapshot = ReturnType<typeof buildRound>;

const buildRound = (
  overrides: Partial<{
    id: bigint;
    status: RoundStatus;
    winAmount: number;
    balanceAfter: number | null;
    outcome: Record<string, unknown>;
    nonce: number;
    settledAt: Date | null;
    payoutMultiplier: number;
  }> = {},
) => ({
  id: overrides.id ?? BigInt(10),
  rotationId: rotation.id,
  playerId: Number(session.sub),
  partnerId: session.partnerId,
  gameId: LIMBO_GAME_ID,
  nonce: overrides.nonce ?? 0,
  currency: 'USD',
  rtp: decimal(gameConfig.rtp),
  requestId: loseRequest.requestId,
  status: overrides.status ?? RoundStatus.ACTIVE,
  betAmount: decimal(loseRequest.betAmount),
  payoutMultiplier: decimal(overrides.payoutMultiplier ?? 0),
  winAmount: decimal(overrides.winAmount ?? 0),
  balanceAfter:
    overrides.balanceAfter === undefined || overrides.balanceAfter === null
      ? null
      : decimal(overrides.balanceAfter),
  outcome: overrides.outcome ?? {
    rolledMultiplier: 1.63,
    targetMultiplier: 2,
    winChance: loseOdds.winChance,
    multiplier: 0,
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  settledAt: overrides.settledAt === undefined ? null : overrides.settledAt,
  rotation: {
    clientSeed: rotation.clientSeed,
    serverSeed: {
      serverSeedHash: rotation.serverSeed.serverSeedHash,
      serverSeed: rotation.serverSeed.serverSeed,
      status: rotation.serverSeed.status,
    },
  },
  partnerCurrency: {
    decimals: 2,
  },
});

const applyRoundUpdate = (
  current: RoundSnapshot,
  data: {
    status?: RoundStatus;
    winAmount?: unknown;
    balanceAfter?: unknown;
    outcome?: Record<string, unknown>;
    settledAt?: Date;
    payoutMultiplier?: unknown;
  },
): RoundSnapshot =>
  buildRound({
    id: current.id,
    nonce: current.nonce,
    status: data.status ?? current.status,
    winAmount:
      data.winAmount === undefined
        ? current.winAmount.toNumber()
        : Number(data.winAmount),
    balanceAfter:
      data.balanceAfter === undefined
        ? (current.balanceAfter?.toNumber() ?? null)
        : Number(data.balanceAfter),
    outcome: data.outcome ?? (current.outcome as Record<string, unknown>),
    settledAt:
      data.settledAt === undefined ? current.settledAt : data.settledAt,
    payoutMultiplier:
      data.payoutMultiplier === undefined
        ? current.payoutMultiplier.toNumber()
        : Number(data.payoutMultiplier),
  });

describe('LimboBetService', () => {
  const events: string[] = [];
  let prisma: PrismaService;
  let tx: {
    gameRound: {
      create: jest.Mock;
      update: jest.Mock;
    };
    walletTransaction: {
      create: jest.Mock;
      update: jest.Mock;
    };
    fairnessRotation: {
      update: jest.Mock;
    };
  };
  let partnerConfig: PartnerConfigService;
  let placeBetSupport: PlaceBetSupportService;
  let partnerWallet: PartnerWalletService;
  let fairnessService: FairnessService;
  let roundSettledPublisher: RoundSettledPublisher;
  let service: LimboBetService;
  let serviceLogger: { error: jest.Mock; warn: jest.Mock };
  let currentRound: RoundSnapshot;
  let walletTransactionCreateCount: number;

  const expectPlaceBetErrorLogged = (errCode: string): void => {
    expect(serviceLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errCode,
        requestId: loseRequest.requestId,
        playerId: session.sub,
        externalPlayerId: session.externalPlayerId,
        partnerId: session.partnerId,
        gameId: LIMBO_GAME_ID,
      }),
      'Place bet failed',
    );
  };

  const expectWsError = async (
    promise: Promise<unknown>,
    errCode: string,
  ): Promise<void> => {
    try {
      await promise;
      throw new Error('expected placeBet to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual(
        expect.objectContaining({ err_code: errCode }),
      );
    }
  };

  beforeEach(() => {
    events.length = 0;
    walletTransactionCreateCount = 0;
    currentRound = buildRound();

    tx = {
      gameRound: {
        create: jest.fn().mockImplementation(({ data }) => {
          events.push('round:create');
          currentRound = buildRound({
            status: data.status,
            outcome: data.outcome,
            nonce: data.nonce,
          });
          return Promise.resolve(currentRound);
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          events.push('round:update');
          currentRound = applyRoundUpdate(currentRound, data);
          return Promise.resolve(currentRound);
        }),
      },
      walletTransaction: {
        create: jest.fn().mockImplementation(({ data }) => {
          events.push(`tx:create:${data.type}`);
          walletTransactionCreateCount += 1;
          return Promise.resolve({
            id: BigInt(100 + walletTransactionCreateCount),
          });
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          events.push(`tx:update:${data.status}`);
          return Promise.resolve({ id: BigInt(100) });
        }),
      },
      fairnessRotation: {
        update: jest.fn().mockResolvedValue({ id: rotation.id }),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      gameRound: {
        update: jest.fn().mockImplementation(({ data }) => {
          events.push('round:update');
          currentRound = applyRoundUpdate(currentRound, data);
          return Promise.resolve(currentRound);
        }),
      },
      walletTransaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;

    partnerConfig = {
      getByPartnerCode: jest.fn().mockResolvedValue(config),
    } as unknown as PartnerConfigService;

    partnerWallet = {
      debit: jest.fn().mockImplementation(() => {
        events.push('debit');
        return Promise.resolve({
          partnerTransactionId: 'partner-tx-1',
          balanceBefore: 11,
          balance: 10,
        });
      }),
      credit: jest.fn().mockImplementation(() => {
        events.push('credit');
        return Promise.resolve({
          partnerTransactionId: 'partner-tx-win',
          balanceBefore: 10,
          balance: 12,
        });
      }),
      markTransactionFailed: jest.fn((partnerId: number, requestId: string) =>
        prisma.walletTransaction.updateMany({
          where: {
            partnerId,
            requestId,
            status: WalletTxStatus.PENDING,
          },
          data: { status: WalletTxStatus.FAILED },
        }),
      ),
    } as unknown as PartnerWalletService;

    fairnessService = {
      withBetSettlementLock: jest.fn(
        async (_playerId: number, callback: () => Promise<unknown>) =>
          callback(),
      ),
      lockOpenRotation: jest.fn().mockResolvedValue(rotation),
      bootstrapInTransaction: jest.fn(),
    } as unknown as FairnessService;

    serviceLogger = {
      error: jest.fn(),
      warn: jest.fn(),
    };

    placeBetSupport = new PlaceBetSupportService(
      serviceLogger as never,
      prisma,
      partnerConfig,
    );

    roundSettledPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as RoundSettledPublisher;

    service = new LimboBetService(
      serviceLogger as never,
      prisma,
      placeBetSupport,
      partnerWallet,
      fairnessService,
      roundSettledPublisher,
    );
  });

  describe('happy paths', () => {
    it('settles a lost bet and returns the mapped result', async () => {
      const result = await service.placeBet(session, loseRequest);

      expect(result.status).toBe('lost');
      expect(result.cashOut).toBe(0);
      expect(result.balance).toBe(10);
      expect(result.betAmount).toBe(1);
      expect(result.gameData.targetMultiplier).toBe(2);
      expect(events).toEqual([
        'round:create',
        'tx:create:DEBIT',
        'debit',
        'tx:update:CONFIRMED',
        'round:update',
        'round:update',
      ]);
      expect(partnerWallet.debit).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          playerId: session.externalPlayerId,
          amount: loseRequest.betAmount,
          requestId: 'player-1:req-1:bet',
          gameId: LIMBO_GAME_ID,
        }),
      );
      expect(tx.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: WalletTxType.DEBIT,
            status: WalletTxStatus.PENDING,
            requestId: 'player-1:req-1:bet',
          }),
        }),
      );
      expect(tx.walletTransaction.update).toHaveBeenCalledWith({
        where: {
          partnerId_requestId: {
            partnerId: session.partnerId,
            requestId: 'player-1:req-1:bet',
          },
        },
        data: expect.objectContaining({
          status: WalletTxStatus.CONFIRMED,
          partnerTransactionId: 'partner-tx-1',
        }),
      });
      expect(partnerWallet.credit).not.toHaveBeenCalled();
      expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: '10',
          gameId: LIMBO_GAME_ID,
          status: RoundStatus.LOST,
          betAmount: '1',
          winAmount: '0',
        }),
      );
    });

    it('settles a won bet, credits the partner, and records win ledger', async () => {
      const result = await service.placeBet(session, winRequest);

      expect(result.status).toBe('won');
      expect(result.cashOut).toBeGreaterThan(0);
      expect(result.balance).toBe(12);
      expect(result.gameData.multiplier).toBe(1.01);
      expect(events).toEqual([
        'round:create',
        'tx:create:DEBIT',
        'debit',
        'tx:update:CONFIRMED',
        'round:update',
        'round:update',
        'tx:create:CREDIT',
        'credit',
        'tx:update:CONFIRMED',
        'round:update',
      ]);
      expect(partnerWallet.credit).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          playerId: session.externalPlayerId,
          requestId: 'player-1:req-1:win',
          roundId: '10',
          gameId: LIMBO_GAME_ID,
        }),
      );
      expect(tx.walletTransaction.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: WalletTxType.CREDIT,
            status: WalletTxStatus.PENDING,
            requestId: 'player-1:req-1:win',
          }),
        }),
      );
      expect(tx.walletTransaction.update).toHaveBeenLastCalledWith({
        where: {
          partnerId_requestId: {
            partnerId: session.partnerId,
            requestId: 'player-1:req-1:win',
          },
        },
        data: expect.objectContaining({
          status: WalletTxStatus.CONFIRMED,
          partnerTransactionId: 'partner-tx-win',
        }),
      });
      expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: '10',
          status: RoundStatus.WON,
          gameId: LIMBO_GAME_ID,
        }),
      );
    });

    it('bootstraps fairness rotation when none is open', async () => {
      (fairnessService.lockOpenRotation as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(rotation);

      await service.placeBet(session, loseRequest);

      expect(fairnessService.bootstrapInTransaction).toHaveBeenCalledTimes(1);
      expect(tx.fairnessRotation.update).toHaveBeenCalledWith({
        where: { id: rotation.id },
        data: { nonceCount: 1 },
      });
    });
  });

  describe('validation failures', () => {
    it('rejects invalid bet parameters before creating a round', async () => {
      const invalidRequest: LimboPlaceBetRequest = {
        ...loseRequest,
        gameData: {
          targetMultiplier: 2,
          winChance: 10,
        },
      };

      await expectWsError(
        service.placeBet(session, invalidRequest),
        'invalid_bet',
      );
      expect(tx.gameRound.create).not.toHaveBeenCalled();
      expectPlaceBetErrorLogged('invalid_bet');
    });

    it('rejects bets that exceed max win before creating a round', async () => {
      (partnerConfig.getByPartnerCode as jest.Mock).mockResolvedValue({
        ...config,
        currencyConfigs: {
          USD: {
            ...currencyConfig,
            maxWin: 0,
          },
        },
      } as PartnerRuntimeConfig);

      await expectWsError(
        service.placeBet(session, winRequest),
        'bet_limit_exceeded',
      );

      expectPlaceBetErrorLogged('bet_limit_exceeded');
      expect(fairnessService.withBetSettlementLock).not.toHaveBeenCalled();
      expect(tx.gameRound.create).not.toHaveBeenCalled();
      expect(partnerWallet.debit).not.toHaveBeenCalled();
      expect(partnerWallet.credit).not.toHaveBeenCalled();
    });
  });

  describe('failure stages', () => {
    it('does not call partner debit when pending transaction creation fails', async () => {
      tx.walletTransaction.create.mockRejectedValueOnce(
        new Error('ledger down'),
      );

      await expectWsError(service.placeBet(session, loseRequest), 'bet_failed');

      expect(partnerWallet.debit).not.toHaveBeenCalled();
      expect(prisma.gameRound.update).not.toHaveBeenCalled();
    });

    it('marks the round failed when debit fails', async () => {
      (partnerWallet.debit as jest.Mock).mockRejectedValueOnce(
        new WsException({
          err_code: 'insufficient_funds',
          message: 'Insufficient funds',
        }),
      );

      await expectWsError(
        service.placeBet(session, loseRequest),
        'insufficient_funds',
      );
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-1:bet',
          status: WalletTxStatus.PENDING,
        },
        data: { status: WalletTxStatus.FAILED },
      });
      expect(prisma.gameRound.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RoundStatus.FAILED,
            outcome: expect.objectContaining({
              err_code: 'insufficient_funds',
              failure_stage: 'debit',
            }),
          }),
        }),
      );
      expectPlaceBetErrorLogged('insufficient_funds');
    });

    it('marks the round failed when credit fails', async () => {
      (partnerWallet.credit as jest.Mock).mockRejectedValueOnce(
        new WsException({
          err_code: 'wallet_credit_failed',
          message: 'Credit failed',
        }),
      );

      await expectWsError(
        service.placeBet(session, winRequest),
        'wallet_credit_failed',
      );
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-1:win',
          status: WalletTxStatus.PENDING,
        },
        data: { status: WalletTxStatus.FAILED },
      });
      expect(prisma.gameRound.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RoundStatus.FAILED,
            outcome: expect.objectContaining({
              err_code: 'wallet_credit_failed',
              failure_stage: 'credit',
            }),
          }),
        }),
      );
      expectPlaceBetErrorLogged('wallet_credit_failed');
    });

    it('maps unique constraint conflicts to round_create_conflict', async () => {
      tx.gameRound.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expectWsError(
        service.placeBet(session, loseRequest),
        'round_create_conflict',
      );
      expectPlaceBetErrorLogged('round_create_conflict');
    });
  });
});
