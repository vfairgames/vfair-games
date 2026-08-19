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
} from '@vfair/prisma-client';
import type { PlinkoPlaceBetRequest } from '@vfair/game-contracts';
import { PLINKO_GAME_ID } from '@vfair/game-contracts';
import type { PartnerRuntimeConfig } from '../partner-config/partner-config-validation';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FairnessService } from '../fairness/fairness.service';
import type { PartnerWalletService } from '../partner-wallet/partner-wallet.service';
import type { RoundSettledPublisher } from '../messaging/round-settled.publisher';
import type { SessionTokenPayload } from '../session/session-token.service';
import { PlinkoBetService } from './plinko-bet.service';
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
  gameId: PLINKO_GAME_ID,
  jti: 'session-1',
};

const gameConfig = {
  enabled: true,
  rtp: 0.98,
};

const baseGameData = {
  rows: 16,
  risk: 'medium' as const,
};

const winRequest: PlinkoPlaceBetRequest = {
  requestId: 'req-win',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: baseGameData,
};

const partialRequest: PlinkoPlaceBetRequest = {
  requestId: 'req-partial',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: baseGameData,
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
  gameConfigs: { [PLINKO_GAME_ID]: gameConfig },
} as unknown as PartnerRuntimeConfig;

const serverSeed =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const buildRotation = (nonceCount: number) => ({
  id: 99,
  clientSeed: 'client-seed',
  nonceCount,
  sequence: 1,
  serverSeedId: 55,
  serverSeed: {
    id: 55,
    serverSeed,
    serverSeedHash: 'hash',
    status: SeedStatus.ACTIVE,
  },
});

type RoundSnapshot = ReturnType<typeof buildRound>;

const buildRound = (
  request: PlinkoPlaceBetRequest,
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
  rotationId: 99,
  playerId: Number(session.sub),
  partnerId: session.partnerId,
  gameId: PLINKO_GAME_ID,
  nonce: overrides.nonce ?? 0,
  currency: 'USD',
  rtp: decimal(gameConfig.rtp),
  requestId: request.requestId,
  status: overrides.status ?? RoundStatus.ACTIVE,
  betAmount: decimal(request.betAmount),
  payoutMultiplier: decimal(overrides.payoutMultiplier ?? 0),
  winAmount: decimal(overrides.winAmount ?? 0),
  balanceAfter:
    overrides.balanceAfter === undefined || overrides.balanceAfter === null
      ? null
      : decimal(overrides.balanceAfter),
  outcome: overrides.outcome ?? {
    rows: request.gameData.rows,
    risk: request.gameData.risk,
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  settledAt: overrides.settledAt === undefined ? null : overrides.settledAt,
  rotation: {
    clientSeed: 'client-seed',
    serverSeed: {
      serverSeedHash: 'hash',
      serverSeed,
      status: SeedStatus.ACTIVE,
    },
  },
  partnerCurrency: {
    decimals: 2,
  },
});

const applyRoundUpdate = (
  current: RoundSnapshot,
  request: PlinkoPlaceBetRequest,
  data: {
    status?: RoundStatus;
    winAmount?: unknown;
    balanceAfter?: unknown;
    outcome?: Record<string, unknown>;
    settledAt?: Date;
    payoutMultiplier?: unknown;
  },
): RoundSnapshot =>
  buildRound(request, {
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

describe('PlinkoBetService', () => {
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
  let service: PlinkoBetService;
  let serviceLogger: { error: jest.Mock; warn: jest.Mock };
  let currentRound: RoundSnapshot;
  let activeRequest: PlinkoPlaceBetRequest;
  let activeRotation: ReturnType<typeof buildRotation>;

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

  const expectPlaceBetErrorLogged = (
    errCode: string,
    requestId = partialRequest.requestId,
  ): void => {
    expect(serviceLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errCode,
        requestId,
        playerId: session.sub,
        externalPlayerId: session.externalPlayerId,
        partnerId: session.partnerId,
        gameId: PLINKO_GAME_ID,
      }),
      'Place bet failed',
    );
  };

  const setupService = (rotationNonce: number): void => {
    events.length = 0;
    activeRotation = buildRotation(rotationNonce);
    currentRound = buildRound(activeRequest, { nonce: rotationNonce });

    tx = {
      gameRound: {
        create: jest.fn().mockImplementation(({ data }) => {
          events.push('round:create');
          currentRound = buildRound(activeRequest, {
            status: data.status,
            outcome: data.outcome,
            nonce: data.nonce,
          });
          return Promise.resolve(currentRound);
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          events.push('round:update');
          currentRound = applyRoundUpdate(currentRound, activeRequest, data);
          return Promise.resolve(currentRound);
        }),
      },
      walletTransaction: {
        create: jest.fn().mockImplementation(({ data }) => {
          events.push(`tx:create:${data.type}`);
          return Promise.resolve({ id: BigInt(100) });
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          events.push(`tx:update:${data.status}`);
          return Promise.resolve({ id: BigInt(100) });
        }),
      },
      fairnessRotation: {
        update: jest.fn().mockResolvedValue({ id: activeRotation.id }),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      gameRound: {
        update: jest.fn().mockImplementation(({ data }) => {
          events.push('round:update');
          currentRound = applyRoundUpdate(currentRound, activeRequest, data);
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
      credit: jest.fn().mockImplementation(({ amount }) => {
        events.push('credit');
        return Promise.resolve({
          partnerTransactionId: 'partner-tx-win',
          balanceBefore: 10,
          balance: 10 + amount,
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
      lockOpenRotation: jest.fn().mockResolvedValue(activeRotation),
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

    service = new PlinkoBetService(
      serviceLogger as never,
      prisma,
      placeBetSupport,
      partnerWallet,
      fairnessService,
      roundSettledPublisher,
    );
  };

  beforeEach(() => {
    activeRequest = partialRequest;
    setupService(0);
  });

  it('settles a won bet with multiplier >= 1, credits, and publishes', async () => {
    activeRequest = winRequest;
    setupService(5);

    const result = await service.placeBet(session, winRequest);

    expect(result.status).toBe('won');
    expect(result.cashOut).toBeGreaterThanOrEqual(winRequest.betAmount);
    expect(result.gameData.multiplier).toBeGreaterThanOrEqual(1);
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
        amount: expect.any(Number),
        requestId: 'player-1:req-win:win',
        gameId: PLINKO_GAME_ID,
      }),
    );
    expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RoundStatus.WON,
        gameId: PLINKO_GAME_ID,
      }),
    );
  });

  it('credits partial return on LOST when multiplier < 1', async () => {
    const result = await service.placeBet(session, partialRequest);

    expect(result.status).toBe('lost');
    expect(result.cashOut).toBeGreaterThan(0);
    expect(result.cashOut).toBeLessThan(10);
    expect(result.gameData.multiplier).toBeLessThan(1);
    expect(events).toContain('tx:create:CREDIT');
    expect(events).toContain('credit');
    expect(partnerWallet.credit).toHaveBeenCalledWith(
      config,
      expect.objectContaining({
        amount: 0.5,
        requestId: 'player-1:req-partial:win',
      }),
    );
    expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: RoundStatus.LOST,
        winAmount: '0.5',
      }),
    );
  });

  it('rejects invalid rows and risk before creating a round', async () => {
    await expectWsError(
      service.placeBet(session, {
        ...partialRequest,
        gameData: { rows: 7, risk: 'medium' },
      }),
      'invalid_bet',
    );
    await expectWsError(
      service.placeBet(session, {
        ...partialRequest,
        gameData: { rows: 16, risk: 'insane' as 'medium' },
      }),
      'invalid_bet',
    );
    expect(tx.gameRound.create).not.toHaveBeenCalled();
  });

  it('rejects bets whose max bucket profit exceeds max win', async () => {
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
    expectPlaceBetErrorLogged('bet_limit_exceeded', winRequest.requestId);
    expect(fairnessService.withBetSettlementLock).not.toHaveBeenCalled();
    expect(partnerWallet.debit).not.toHaveBeenCalled();
  });

  describe('failure stages', () => {
    it('does not call partner debit when pending transaction creation fails', async () => {
      tx.walletTransaction.create.mockRejectedValueOnce(
        new Error('ledger down'),
      );

      await expectWsError(
        service.placeBet(session, partialRequest),
        'bet_failed',
      );

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
        service.placeBet(session, partialRequest),
        'insufficient_funds',
      );
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-partial:bet',
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
        service.placeBet(session, partialRequest),
        'wallet_credit_failed',
      );
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-partial:win',
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
        service.placeBet(session, partialRequest),
        'round_create_conflict',
      );
      expectPlaceBetErrorLogged('round_create_conflict');
    });
  });
});
