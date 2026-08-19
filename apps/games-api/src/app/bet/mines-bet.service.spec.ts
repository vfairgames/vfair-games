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
  RoundStatus,
  SeedStatus,
  WalletTxStatus,
  WalletTxType,
} from '@vfair/prisma-client';
import type { MinesPlaceBetRequest } from '@vfair/game-contracts';
import { MINES_GAME_ID } from '@vfair/game-contracts';
import { generateMineLayout } from '@vfair/game-math';
import type { PartnerRuntimeConfig } from '../partner-config/partner-config-validation';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FairnessService } from '../fairness/fairness.service';
import type { PartnerWalletService } from '../partner-wallet/partner-wallet.service';
import type { RoundSettledPublisher } from '../messaging/round-settled.publisher';
import type { SessionTokenPayload } from '../session/session-token.service';
import { MinesBetService } from './mines-bet.service';
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
  gameId: MINES_GAME_ID,
  jti: 'session-1',
};

const gameConfig = {
  enabled: true,
  rtp: 0.98,
};

const request: MinesPlaceBetRequest = {
  requestId: 'req-1',
  betAmount: 1,
  currency: { code: 'USD', decimals: 2 },
  gameData: {
    mineCount: 3,
    gridSize: 25,
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
  gameConfigs: { [MINES_GAME_ID]: gameConfig },
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

const mineLayout = generateMineLayout(
  rotation.serverSeed.serverSeed,
  rotation.clientSeed,
  0,
  request.gameData.mineCount,
);
const safeTile = Array.from({ length: 25 }, (_, index) => index).find(
  (tile) => !mineLayout.includes(tile),
) as number;
const mineTile = mineLayout[0] as number;

const singleGemMineLayout = generateMineLayout(
  rotation.serverSeed.serverSeed,
  rotation.clientSeed,
  0,
  24,
);
const lastGemTile = Array.from({ length: 25 }, (_, index) => index).find(
  (tile) => !singleGemMineLayout.includes(tile),
) as number;

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
  gameId: MINES_GAME_ID,
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
    mineCount: 3,
    gridSize: 25,
    reveals: [],
    multiplier: 1,
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

describe('MinesBetService', () => {
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
  let service: MinesBetService;
  let serviceLogger: { error: jest.Mock; warn: jest.Mock };
  let currentRound: RoundSnapshot;
  let activeRoundLookup: RoundSnapshot | null;

  const expectWsError = async (
    promise: Promise<unknown>,
    errCode: string,
  ): Promise<void> => {
    try {
      await promise;
      throw new Error('expected call to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual(
        expect.objectContaining({ err_code: errCode }),
      );
    }
  };

  const expectCreditFailureMarked = (): void => {
    expect(roundSettledPublisher.publish).not.toHaveBeenCalled();
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
          mineLayout: expect.any(Array),
          err_code: 'bet_failed',
          failure_stage: 'credit',
        }),
        settledAt: expect.any(Date),
      },
    });
  };

  beforeEach(() => {
    currentRound = buildRound();
    activeRoundLookup = null;

    tx = {
      gameRound: {
        create: jest.fn().mockImplementation(({ data }) => {
          currentRound = buildRound({
            status: data.status,
            outcome: data.outcome,
            nonce: data.nonce,
            balanceAfter: null,
          });
          activeRoundLookup = currentRound;
          return Promise.resolve(currentRound);
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          currentRound = applyRoundUpdate(currentRound, data);
          activeRoundLookup =
            currentRound.status === RoundStatus.ACTIVE ? currentRound : null;
          return Promise.resolve(currentRound);
        }),
      },
      walletTransaction: {
        create: jest.fn().mockResolvedValue({ id: BigInt(100) }),
        update: jest.fn().mockResolvedValue({ id: BigInt(100) }),
      },
      fairnessRotation: {
        update: jest.fn().mockResolvedValue({ id: rotation.id }),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      gameRound: {
        findFirst: jest.fn().mockImplementation(() => {
          return Promise.resolve(activeRoundLookup);
        }),
        findUnique: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            status: currentRound.status,
            outcome: currentRound.outcome,
          });
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          currentRound = applyRoundUpdate(currentRound, data);
          activeRoundLookup =
            currentRound.status === RoundStatus.ACTIVE ? currentRound : null;
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
      debit: jest.fn().mockResolvedValue({
        partnerTransactionId: 'partner-tx-1',
        balanceBefore: 11,
        balance: 10,
      }),
      credit: jest.fn().mockResolvedValue({
        partnerTransactionId: 'partner-tx-win',
        balanceBefore: 10,
        balance: 12,
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

    service = new MinesBetService(
      serviceLogger as never,
      prisma,
      placeBetSupport,
      partnerWallet,
      fairnessService,
      roundSettledPublisher,
    );
  });

  it('places a bet and leaves the round active without KPI publish', async () => {
    const result = await service.placeBet(session, request);

    expect(result.status).toBe('active');
    expect(result.balance).toBe(10);
    expect(result.gameData.reveals).toEqual([]);
    expect(result.gameData).not.toHaveProperty('mineLayout');
    expect(tx.walletTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: WalletTxType.DEBIT,
        status: WalletTxStatus.PENDING,
        requestId: 'player-1:req-1:bet',
      }),
    });
    expect(
      tx.walletTransaction.create.mock.invocationCallOrder[0],
    ).toBeLessThan(
      (partnerWallet.debit as jest.Mock).mock.invocationCallOrder[0],
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
    expect(roundSettledPublisher.publish).not.toHaveBeenCalled();
    expect(tx.fairnessRotation.update).toHaveBeenCalledWith({
      where: { id: rotation.id },
      data: { nonceCount: 1 },
    });
  });

  it('rejects place bet when an active mines round already exists', async () => {
    activeRoundLookup = buildRound();

    await expectWsError(
      service.placeBet(session, request),
      'active_round_exists',
    );
    expect(partnerWallet.debit).not.toHaveBeenCalled();
  });

  it('reveals a gem and keeps the round active', async () => {
    activeRoundLookup = buildRound({ balanceAfter: 10 });

    const result = await service.revealTile(session, { tile: safeTile });

    expect(result.status).toBe('active');
    expect(result.gameData.reveals).toHaveLength(1);
    expect(result.gameData.reveals[0]?.tile).toBe(safeTile);
    expect(result.gameData).not.toHaveProperty('mineLayout');
    expect(roundSettledPublisher.publish).not.toHaveBeenCalled();
  });

  it('settles a lost round on mine hit and publishes KPI', async () => {
    activeRoundLookup = buildRound({ balanceAfter: 10 });

    const result = await service.revealTile(session, { tile: mineTile });

    expect(result.status).toBe('lost');
    expect(result.cashOut).toBe(0);
    expect(result.gameData.mineLayout).toEqual(mineLayout);
    expect(partnerWallet.credit).not.toHaveBeenCalled();
    expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: MINES_GAME_ID,
        status: RoundStatus.LOST,
        winAmount: '0',
      }),
    );
  });

  it('cashes out after a reveal, credits, and publishes KPI', async () => {
    activeRoundLookup = buildRound({
      balanceAfter: 10,
      outcome: {
        mineCount: 3,
        gridSize: 25,
        reveals: [{ tile: safeTile, order: 1, multiplier: 1.08 }],
        multiplier: 1.08,
      },
    });
    currentRound = activeRoundLookup;

    const result = await service.cashOut(session);

    expect(result.status).toBe('won');
    expect(result.cashOut).toBeGreaterThan(0);
    expect(partnerWallet.credit).toHaveBeenCalled();
    expect(tx.walletTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: WalletTxType.CREDIT,
        status: WalletTxStatus.PENDING,
        requestId: 'player-1:req-1:win',
      }),
    });
    expect(
      tx.walletTransaction.create.mock.invocationCallOrder[0],
    ).toBeLessThan(
      (partnerWallet.credit as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(tx.walletTransaction.update).toHaveBeenCalledWith({
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
        gameId: MINES_GAME_ID,
        status: RoundStatus.WON,
      }),
    );
  });

  it('settles a manual reveal at maxWin when profit would exceed the cap', async () => {
    (partnerConfig.getByPartnerCode as jest.Mock).mockResolvedValue({
      ...config,
      currencyConfigs: {
        USD: {
          ...currencyConfig,
          maxWin: 0.01,
        },
      },
    });

    activeRoundLookup = buildRound({ balanceAfter: 10 });
    currentRound = activeRoundLookup;

    const result = await service.revealTile(session, { tile: safeTile });

    expect(result.status).toBe('won');
    expect(result.cashOut).toBe(1.01);
    expect(partnerWallet.credit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        amount: 1.01,
        requestId: 'player-1:req-1:win',
      }),
    );
    expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: MINES_GAME_ID,
        status: RoundStatus.WON,
        winAmount: '1.01',
      }),
    );
  });

  it('rejects auto place when selected tiles would exceed maxWin', async () => {
    (partnerConfig.getByPartnerCode as jest.Mock).mockResolvedValue({
      ...config,
      currencyConfigs: {
        USD: {
          ...currencyConfig,
          maxWin: 0.01,
        },
      },
    });

    await expectWsError(
      service.placeAutoRound(session, {
        ...request,
        selectedTiles: [safeTile],
      }),
      'bet_limit_exceeded',
    );

    expect(partnerWallet.debit).not.toHaveBeenCalled();
    expect(partnerWallet.credit).not.toHaveBeenCalled();
    expect(roundSettledPublisher.publish).not.toHaveBeenCalled();
  });

  it('rejects cash out with no reveals', async () => {
    activeRoundLookup = buildRound({ balanceAfter: 10 });

    await expectWsError(service.cashOut(session), 'cash_out_requires_reveal');
    expect(roundSettledPublisher.publish).not.toHaveBeenCalled();
  });

  it('returns the active round for restore', async () => {
    activeRoundLookup = buildRound({
      balanceAfter: 10,
      outcome: {
        mineCount: 3,
        gridSize: 25,
        reveals: [{ tile: safeTile, order: 1, multiplier: 1.08 }],
        multiplier: 1.08,
      },
    });

    const result = await service.getActiveRound(session);

    expect(result?.status).toBe('active');
    expect(result?.gameData.reveals).toHaveLength(1);
    expect(result?.gameData).not.toHaveProperty('mineLayout');
  });

  it('returns null when no active round exists', async () => {
    await expect(service.getActiveRound(session)).resolves.toBeNull();
  });

  it('places an auto round that hits a mine and publishes KPI', async () => {
    const result = await service.placeAutoRound(session, {
      ...request,
      selectedTiles: [mineTile],
    });

    expect(result.status).toBe('lost');
    expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: MINES_GAME_ID,
        status: RoundStatus.LOST,
      }),
    );
  });

  it('places an auto round that cashes out selected gems', async () => {
    const result = await service.placeAutoRound(session, {
      ...request,
      selectedTiles: [safeTile],
    });

    expect(result.status).toBe('won');
    expect(result.gameData.reveals).toHaveLength(1);
    expect(partnerWallet.credit).toHaveBeenCalled();
    expect(roundSettledPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: MINES_GAME_ID,
        status: RoundStatus.WON,
      }),
    );
  });

  it('does not call partner debit when pending transaction creation fails', async () => {
    tx.walletTransaction.create.mockRejectedValueOnce(new Error('ledger down'));

    await expectWsError(service.placeBet(session, request), 'bet_failed');

    expect(partnerWallet.debit).not.toHaveBeenCalled();
    expect(prisma.gameRound.update).not.toHaveBeenCalled();
  });

  it('marks the pending transaction and round failed when debit confirmation fails', async () => {
    tx.walletTransaction.update.mockRejectedValueOnce(new Error('ledger down'));

    await expectWsError(service.placeBet(session, request), 'bet_failed');

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
            failure_stage: 'debit',
          }),
        }),
      }),
    );
  });

  it('marks the round failed when cash out credit fails', async () => {
    activeRoundLookup = buildRound({
      balanceAfter: 10,
      outcome: {
        mineCount: 3,
        gridSize: 25,
        reveals: [{ tile: safeTile, order: 1, multiplier: 1.08 }],
        multiplier: 1.08,
      },
    });
    currentRound = activeRoundLookup;
    (partnerWallet.credit as jest.Mock).mockRejectedValueOnce(
      new Error('wallet down'),
    );

    await expectWsError(service.cashOut(session), 'bet_failed');
    expectCreditFailureMarked();
  });

  it('marks the round failed when last-gem reveal credit fails', async () => {
    activeRoundLookup = buildRound({
      balanceAfter: 10,
      outcome: {
        mineCount: 24,
        gridSize: 25,
        reveals: [],
        multiplier: 1,
      },
    });
    currentRound = activeRoundLookup;
    (partnerWallet.credit as jest.Mock).mockRejectedValueOnce(
      new Error('wallet down'),
    );

    await expectWsError(
      service.revealTile(session, { tile: lastGemTile }),
      'bet_failed',
    );
    expectCreditFailureMarked();
  });

  it('marks the round failed when auto round credit fails', async () => {
    (partnerWallet.credit as jest.Mock).mockRejectedValueOnce(
      new Error('wallet down'),
    );

    await expectWsError(
      service.placeAutoRound(session, {
        ...request,
        selectedTiles: [safeTile],
      }),
      'bet_failed',
    );
    expectCreditFailureMarked();
  });
});
