jest.mock('@vfair/prisma-client', () => ({
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

import { RoundStatus } from '@vfair/prisma-client';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { FairnessService } from '../fairness/fairness.service';
import type { SessionTokenService } from '../session/session-token.service';

jest.mock('@vfair/app-common', () => {
  const actual = jest.requireActual('@vfair/app-common') as Record<
    string,
    unknown
  >;

  return {
    ...actual,
    buildPartnerLaunchSettings: jest.fn(() => ({
      rtp: 0.98,
      token: 'session-jwt',
    })),
    buildLaunchUrl: jest.fn(
      (_baseUrl: string, settings: { token?: string }) =>
        `http://localhost:4200/?settings=encoded-${settings.token ?? ''}`,
    ),
  };
});

jest.mock('@vfair/game-contracts', () => {
  const actual = jest.requireActual('@vfair/game-contracts') as Record<
    string,
    unknown
  >;

  return {
    ...actual,
    getAvailableGame: jest.fn((gameId: string) => {
      if (gameId === 'v_dice') {
        return { id: 'v_dice', name: 'Dice' };
      }
      if (gameId === 'v_mines') {
        return { id: 'v_mines', name: 'Mines' };
      }
      if (gameId === 'v_limbo') {
        return { id: 'v_limbo', name: 'Limbo' };
      }
      return undefined;
    }),
  };
});

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PartnerRuntimeConfig } from '../partner-config/partner-config-validation';
import type { PrismaService } from '../prisma/prisma.service';
import { LaunchService } from './launch.service';

const baseRuntimeConfig = (): PartnerRuntimeConfig => ({
  partnerId: 1,
  partnerCode: 'acme',
  lobbyUrl: 'https://lobby.example.com',
  webhookUrl: null,
  lightAccentColor: 'blue',
  darkAccentColor: 'violet',
  defaultAppearance: 'light',
  themeSwitcherEnabled: true,
  theme: null,
  logo: null,
  palette: {
    lightAccent: 'blue',
    lightGray: 'slate',
    lightBg: 'white',
    darkAccent: 'violet',
    darkGray: 'slate',
    darkBg: 'black',
  },
  currencyConfigs: {
    USD: {
      currency: 'USD',
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      currencyDecimals: 2,
      countryCode: 'US',
    },
    EUR: {
      currency: 'EUR',
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      currencyDecimals: 2,
      countryCode: 'DE',
    },
  },
  gameConfigs: {
    v_dice: {
      enabled: true,
      rtp: 0.98,
    },
    v_mines: {
      enabled: true,
      rtp: 0.98,
    },
  },
});

describe('LaunchService', () => {
  const diceGameId = 'v_dice';
  const minesGameId = 'v_mines';
  const logger = {
    info: jest.fn(),
  } as unknown as PinoLogger;

  const gameRoundFindFirst = jest.fn();
  const prisma = {
    player: {
      upsert: jest.fn(),
    },
    gameRound: {
      findFirst: gameRoundFindFirst,
    },
  } as unknown as PrismaService;

  const sessionTokenService = {
    createToken: jest.fn(() => 'session-jwt'),
  } as unknown as SessionTokenService;

  const partnerConfig = {
    getByPartnerCode: jest.fn(),
  } as unknown as PartnerConfigService;

  const fairnessService = {
    ensureBootstrap: jest.fn(),
  } as unknown as FairnessService;

  let service: LaunchService;

  beforeEach(() => {
    jest.clearAllMocks();
    gameRoundFindFirst.mockResolvedValue(null);
    service = new LaunchService(
      logger,
      prisma,
      sessionTokenService,
      partnerConfig,
      fairnessService,
    );
    process.env.DICE_GAME_BASE_URL = 'http://localhost:4200';
    process.env.MINES_GAME_BASE_URL = 'http://localhost:4201';
    process.env.LIMBO_GAME_BASE_URL = 'http://localhost:4202';
    jest
      .spyOn(partnerConfig, 'getByPartnerCode')
      .mockResolvedValue(baseRuntimeConfig());
  });

  it('returns a launch URL with token embedded in settings', async () => {
    jest.spyOn(prisma.player, 'upsert').mockResolvedValue({ id: 42 } as never);

    const result = await service.launch(
      { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
      {
        partnerCode: 'acme',
        gameId: diceGameId,
        playerId: 'player-1',
        currency: 'USD',
        mode: 'real',
      },
    );

    expect(partnerConfig.getByPartnerCode).toHaveBeenCalledWith('acme', 1);
    expect(result.url).toMatch(/^http:\/\/localhost:4200\/\?settings=/);
    expect(sessionTokenService.createToken).toHaveBeenCalledWith({
      playerId: 42,
      partnerId: 1,
      partnerCode: 'acme',
      gameId: diceGameId,
      externalPlayerId: 'player-1',
    });
    expect(gameRoundFindFirst).toHaveBeenCalledWith({
      where: {
        playerId: 42,
        gameId: diceGameId,
        status: RoundStatus.ACTIVE,
      },
      select: { currency: true },
    });
  });

  it('returns a demo launch URL without creating a session token', async () => {
    const result = await service.launch(
      { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
      {
        partnerCode: 'acme',
        gameId: diceGameId,
        playerId: 'player-1',
        currency: 'USD',
        mode: 'demo',
      },
    );

    expect(result.url).toMatch(/^http:\/\/localhost:4200\/\?settings=/);
    expect(sessionTokenService.createToken).not.toHaveBeenCalled();
    expect(prisma.player.upsert).not.toHaveBeenCalled();
    expect(gameRoundFindFirst).not.toHaveBeenCalled();
  });

  it('rejects launch when an active round exists in a different currency', async () => {
    jest.spyOn(prisma.player, 'upsert').mockResolvedValue({ id: 42 } as never);
    gameRoundFindFirst.mockResolvedValue({ currency: 'USD' });

    let error: unknown;
    try {
      await service.launch(
        { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
        {
          partnerCode: 'acme',
          gameId: minesGameId,
          playerId: 'player-1',
          currency: 'EUR',
          mode: 'real',
        },
      );
    } catch (err: unknown) {
      error = err;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      err_code: 'active_round_currency_mismatch',
      message:
        'Cannot launch with currency "EUR" while an active round exists in "USD"',
    });
    expect(sessionTokenService.createToken).not.toHaveBeenCalled();
  });

  it('allows launch when an active round exists in the same currency', async () => {
    jest.spyOn(prisma.player, 'upsert').mockResolvedValue({ id: 42 } as never);
    gameRoundFindFirst.mockResolvedValue({ currency: 'USD' });

    const result = await service.launch(
      { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
      {
        partnerCode: 'acme',
        gameId: minesGameId,
        playerId: 'player-1',
        currency: 'USD',
        mode: 'real',
      },
    );

    expect(result.url).toMatch(/\?settings=/);
    expect(sessionTokenService.createToken).toHaveBeenCalled();
  });

  it('rejects partnerCode mismatch', async () => {
    await expect(
      service.launch(
        { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
        {
          partnerCode: 'other',
          gameId: diceGameId,
          playerId: 'player-1',
          currency: 'USD',
          mode: 'real',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects disabled games with a clear reason', async () => {
    const config = baseRuntimeConfig();
    config.gameConfigs.v_dice.enabled = false;
    jest.spyOn(partnerConfig, 'getByPartnerCode').mockResolvedValue(config);

    await expect(
      service.launch(
        { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
        {
          partnerCode: 'acme',
          gameId: diceGameId,
          playerId: 'player-1',
          currency: 'USD',
          mode: 'real',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects partner configuration mismatch with a clear reason', async () => {
    jest.spyOn(partnerConfig, 'getByPartnerCode').mockRejectedValue(
      new BadRequestException({
        err_code: 'partner_config_mismatch',
        message: 'Partner configuration mismatch for partner code "acme"',
      }),
    );

    await expect(
      service.launch(
        { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
        {
          partnerCode: 'acme',
          gameId: diceGameId,
          playerId: 'player-1',
          currency: 'USD',
          mode: 'real',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
