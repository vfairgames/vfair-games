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

import { HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  Prisma,
  RoundStatus,
  SeedStatus,
  WalletTxStatus,
  WalletTxType,
} from '@vfair/prisma-client';
import type { DicePlaceBetRequest } from '@vfair/game-contracts';
import { DICE_GAME_ID } from '@vfair/game-contracts';
import { createDiceOdds } from '@vfair/game-math';
import type { PartnerRuntimeConfig } from '../partner-config/partner-config-validation';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FairnessService } from '../fairness/fairness.service';
import type { PartnerWalletService } from '../partner-wallet/partner-wallet.service';
import type { RoundSettledPublisher } from '../messaging/round-settled.publisher';
import type { SessionTokenPayload } from '../session/session-token.service';
import { DiceBetService } from './dice-bet.service';
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
  gameId: DICE_GAME_ID,
  jti: 'session-1',
};

const gameConfig = {
  enabled: true,
  rtp: 0.98,
};

const rollOverOdds = createDiceOdds(gameConfig.rtp).calculate({
  gameMode: 'rollOver',
  sliderValue: 50,
});

const request: DicePlaceBetRequest = {
  requestId: 'req-1',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: {
    gameMode: 'rollUnder',
    multiplier: 1.96,
    sliderValue: 50,
    winChance: 50,
  },
};

const winRequest: DicePlaceBetRequest = {
  ...request,
  gameData: {
    gameMode: 'rollOver',
    sliderValue: 50,
    multiplier: rollOverOdds.multiplier,
    winChance: rollOverOdds.winChance,
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
  gameConfigs: { [DICE_GAME_ID]: gameConfig },
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
  gameId: DICE_GAME_ID,
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
    rolledValue: 60.07,
    gameMode: 'rollUnder',
    sliderValue: 50,
    multiplier: 1.96,
    winChance: 50,
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

describe('DiceBetService', () => {
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
  let service: DiceBetService;
  let serviceLogger: { error: jest.Mock; warn: jest.Mock };
  let currentRound: RoundSnapshot;
  let walletTransactionCreateCount: number;

  const expectPlaceBetErrorLogged = (errCode: string): void => {
    expect(serviceLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errCode,
        requestId: request.requestId,
        playerId: session.sub,
        externalPlayerId: session.externalPlayerId,
        partnerId: session.partnerId,
        gameId: DICE_GAME_ID,
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

    service = new DiceBetService(
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
      const result = await service.placeBet(session, request);

      expect(result.status).toBe('lost');
      expect(result.cashOut).toBe(0);
      expect(result.balance).toBe(10);
      expect(result.betAmount).toBe(1);
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
          amount: request.betAmount,
          requestId: 'player-1:req-1:bet',
          gameId: DICE_GAME_ID,
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
      expect(fairnessService.withBetSettlementLock).toHaveBeenCalledWith(
        Number(session.sub),
        expect.any(Function),
      );
      expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: '10',
          playerId: Number(session.sub),
          partnerId: session.partnerId,
          gameId: DICE_GAME_ID,
          currency: 'USD',
          betAmount: '1',
          winAmount: '0',
          status: RoundStatus.LOST,
        }),
      );
    });

    it('settles a won bet, credits the partner, and records win ledger', async () => {
      const result = await service.placeBet(session, winRequest);

      expect(result.status).toBe('won');
      expect(result.cashOut).toBeGreaterThan(0);
      expect(result.balance).toBe(12);
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
          gameId: DICE_GAME_ID,
        }),
      );
      expect(tx.walletTransaction.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: WalletTxType.CREDIT,
            requestId: 'player-1:req-1:win',
            status: WalletTxStatus.PENDING,
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
          betAmount: '1',
          gameId: DICE_GAME_ID,
        }),
      );
    });

    it('bootstraps fairness rotation when none is open', async () => {
      (fairnessService.lockOpenRotation as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(rotation);

      await service.placeBet(session, request);

      expect(fairnessService.bootstrapInTransaction).toHaveBeenCalledTimes(1);
      expect(tx.fairnessRotation.update).toHaveBeenCalledWith({
        where: { id: rotation.id },
        data: { nonceCount: 1 },
      });
    });

    it('increments the fairness nonce when creating the active round', async () => {
      await service.placeBet(session, request);

      expect(tx.gameRound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nonce: 0,
            status: RoundStatus.ACTIVE,
          }),
        }),
      );
      expect(tx.fairnessRotation.update).toHaveBeenCalledWith({
        where: { id: rotation.id },
        data: { nonceCount: 1 },
      });
    });
  });

  describe('validation failures', () => {
    it('rejects invalid bet parameters before creating a round', async () => {
      const invalidRequest: DicePlaceBetRequest = {
        ...request,
        gameData: {
          ...request.gameData,
          multiplier: 99,
        },
      };

      await expectWsError(
        service.placeBet(session, invalidRequest),
        'invalid_bet',
      );

      expectPlaceBetErrorLogged('invalid_bet');

      expect(fairnessService.withBetSettlementLock).not.toHaveBeenCalled();
      expect(partnerWallet.debit).not.toHaveBeenCalled();
    });

    it('rejects bet amounts outside partner limits before creating a round', async () => {
      const invalidAmountRequest: DicePlaceBetRequest = {
        ...request,
        betAmount: 0.01,
      };

      await expectWsError(
        service.placeBet(session, invalidAmountRequest),
        'invalid_bet_amount',
      );

      expectPlaceBetErrorLogged('invalid_bet_amount');

      expect(fairnessService.withBetSettlementLock).not.toHaveBeenCalled();
    });

    it('rejects currency decimals that do not match partner config', async () => {
      const invalidCurrencyRequest: DicePlaceBetRequest = {
        ...request,
        currency: { code: 'USD', decimals: 3 },
      };

      await expectWsError(
        service.placeBet(session, invalidCurrencyRequest),
        'invalid_currency',
      );

      expectPlaceBetErrorLogged('invalid_currency');

      expect(fairnessService.withBetSettlementLock).not.toHaveBeenCalled();
    });
  });

  describe('failure paths', () => {
    it('maps round create constraint violation to round_create_conflict', async () => {
      tx.gameRound.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expectWsError(
        service.placeBet(session, request),
        'round_create_conflict',
      );

      expectPlaceBetErrorLogged('round_create_conflict');

      expect(partnerWallet.debit).not.toHaveBeenCalled();
      expect(prisma.gameRound.update).not.toHaveBeenCalled();
    });

    it('does not call partner debit when pending transaction creation fails', async () => {
      tx.walletTransaction.create.mockRejectedValueOnce(
        new Error('ledger down'),
      );

      await expect(service.placeBet(session, request)).rejects.toBeInstanceOf(
        WsException,
      );

      expectPlaceBetErrorLogged('bet_failed');
      expect(partnerWallet.debit).not.toHaveBeenCalled();
      expect(prisma.gameRound.update).not.toHaveBeenCalled();
    });

    it('throws fairness_state_invalid when bootstrap cannot open a rotation', async () => {
      (fairnessService.lockOpenRotation as jest.Mock).mockResolvedValue(null);

      await expectWsError(
        service.placeBet(session, request),
        'fairness_state_invalid',
      );

      expectPlaceBetErrorLogged('fairness_state_invalid');

      expect(fairnessService.bootstrapInTransaction).toHaveBeenCalledTimes(1);
      expect(partnerWallet.debit).not.toHaveBeenCalled();
    });

    it('marks the round failed when debit fails after round creation', async () => {
      (partnerWallet.debit as jest.Mock).mockRejectedValueOnce(
        new WsException({
          err_code: 'insufficient_balance',
          message: 'Insufficient balance',
        }),
      );

      await expect(service.placeBet(session, request)).rejects.toBeInstanceOf(
        WsException,
      );

      expectPlaceBetErrorLogged('insufficient_balance');

      expect(events).toEqual([
        'round:create',
        'tx:create:DEBIT',
        'round:update',
      ]);
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-1:bet',
          status: WalletTxStatus.PENDING,
        },
        data: { status: WalletTxStatus.FAILED },
      });
      expect(prisma.gameRound.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            err_code: 'insufficient_balance',
            failure_stage: 'debit',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('stores the full error payload on failed round outcome', async () => {
      const errorPayload = {
        err_code: 'insufficient_balance',
        message: 'Insufficient balance',
        detail: { available: 0.5 },
      };

      (partnerWallet.debit as jest.Mock).mockRejectedValueOnce(
        new HttpException(errorPayload, 400),
      );

      await expect(service.placeBet(session, request)).rejects.toBeInstanceOf(
        WsException,
      );

      expect(prisma.gameRound.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            ...errorPayload,
            failure_stage: 'debit',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('marks the pending transaction and round failed when debit confirmation fails', async () => {
      tx.walletTransaction.update.mockRejectedValueOnce(
        new Error('ledger down'),
      );

      await expect(service.placeBet(session, request)).rejects.toBeInstanceOf(
        WsException,
      );

      expectPlaceBetErrorLogged('bet_failed');

      expect(events).toEqual([
        'round:create',
        'tx:create:DEBIT',
        'debit',
        'round:update',
      ]);
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-1:bet',
          status: WalletTxStatus.PENDING,
        },
        data: { status: WalletTxStatus.FAILED },
      });
      expect(prisma.gameRound.update).toHaveBeenLastCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            err_code: 'bet_failed',
            failure_stage: 'debit',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('marks the round failed when settle fails after debit', async () => {
      tx.gameRound.update
        .mockImplementationOnce(({ data }) => {
          events.push('round:update');
          currentRound = applyRoundUpdate(currentRound, data);
          return Promise.resolve(currentRound);
        })
        .mockRejectedValueOnce(new Error('db down'));

      await expect(service.placeBet(session, request)).rejects.toBeInstanceOf(
        WsException,
      );

      expectPlaceBetErrorLogged('bet_failed');

      expect(prisma.gameRound.update).toHaveBeenLastCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            err_code: 'bet_failed',
            failure_stage: 'settle',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('does not call partner credit when pending transaction creation fails', async () => {
      tx.walletTransaction.create
        .mockResolvedValueOnce({ id: BigInt(101) })
        .mockRejectedValueOnce(new Error('ledger down'));

      await expect(
        service.placeBet(session, winRequest),
      ).rejects.toBeInstanceOf(WsException);

      expectPlaceBetErrorLogged('bet_failed');
      expect(partnerWallet.credit).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.updateMany).not.toHaveBeenCalled();
      expect(prisma.gameRound.update).toHaveBeenLastCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            err_code: 'bet_failed',
            failure_stage: 'settle',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('rejects bets that exceed max win before creating a round', async () => {
      (partnerConfig.getByPartnerCode as jest.Mock).mockResolvedValue({
        ...config,
        currencyConfigs: {
          USD: {
            ...currencyConfig,
            maxWin: 0.01,
          },
        },
      } as PartnerRuntimeConfig);

      await expectWsError(
        service.placeBet(session, winRequest),
        'bet_limit_exceeded',
      );

      expectPlaceBetErrorLogged('bet_limit_exceeded');

      expect(fairnessService.withBetSettlementLock).not.toHaveBeenCalled();
      expect(partnerWallet.debit).not.toHaveBeenCalled();
      expect(partnerWallet.credit).not.toHaveBeenCalled();
    });

    it('marks the round failed when win credit fails', async () => {
      (partnerWallet.credit as jest.Mock).mockRejectedValueOnce(
        new Error('wallet down'),
      );

      await expect(
        service.placeBet(session, winRequest),
      ).rejects.toBeInstanceOf(WsException);

      expectPlaceBetErrorLogged('bet_failed');

      expect(prisma.gameRound.update).toHaveBeenLastCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            rolledValue: expect.any(Number),
            err_code: 'bet_failed',
            failure_stage: 'credit',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('marks the round failed when win credit succeeds but ledger write fails', async () => {
      tx.walletTransaction.update
        .mockImplementationOnce(({ data }) => {
          events.push(`tx:update:${data.status}`);
          return Promise.resolve({ id: BigInt(100) });
        })
        .mockImplementationOnce(() => Promise.reject(new Error('ledger down')));

      await expect(
        service.placeBet(session, winRequest),
      ).rejects.toBeInstanceOf(WsException);

      expectPlaceBetErrorLogged('bet_failed');

      expect(partnerWallet.credit).toHaveBeenCalledTimes(1);
      expect(prisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          partnerId: session.partnerId,
          requestId: 'player-1:req-1:win',
          status: WalletTxStatus.PENDING,
        },
        data: { status: WalletTxStatus.FAILED },
      });
      expect(prisma.gameRound.update).toHaveBeenLastCalledWith({
        where: { id: BigInt(10) },
        data: {
          status: RoundStatus.FAILED,
          outcome: expect.objectContaining({
            rolledValue: expect.any(Number),
            err_code: 'bet_failed',
            failure_stage: 'credit',
          }),
          settledAt: expect.any(Date),
        },
      });
    });

    it('logs when markRoundFailed cannot persist the failed status', async () => {
      (partnerWallet.debit as jest.Mock).mockRejectedValueOnce(
        new Error('wallet down'),
      );
      (prisma.gameRound.update as jest.Mock).mockImplementation(({ data }) => {
        events.push('round:update');
        if (data.status === RoundStatus.FAILED) {
          return Promise.reject(new Error('db down'));
        }
        currentRound = applyRoundUpdate(currentRound, data);
        return Promise.resolve(currentRound);
      });

      await expect(service.placeBet(session, request)).rejects.toBeInstanceOf(
        WsException,
      );

      expectPlaceBetErrorLogged('bet_failed');

      expect(serviceLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          roundId: '10',
          errCode: 'bet_failed',
          failureStage: 'debit',
        }),
        'Failed to mark round as failed',
      );
    });
  });
});
