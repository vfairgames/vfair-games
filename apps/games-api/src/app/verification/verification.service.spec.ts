jest.mock('@vfair/app-common', () => {
  const actual = jest.requireActual('@vfair/app-common') as Record<
    string,
    unknown
  >;

  return {
    ...actual,
    buildPartnerVerificationSettings: jest.fn(() => ({
      games: [{ id: 'v_dice', rtp: 0.98 }],
    })),
    buildLaunchUrl: jest.fn(
      () => 'http://localhost:4500/?settings=encoded-verification',
    ),
  };
});

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import type { PinoLogger } from '@vfair/nest-utils';
import type { PartnerConfigService } from '../partner-config/partner-config.service';
import type { PartnerRuntimeConfig } from '../partner-config/partner-config-validation';
import type { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from './verification.service';

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
  },
  gameConfigs: {
    v_dice: {
      enabled: true,
      rtp: 0.98,
    },
    v_mines: {
      enabled: false,
      rtp: 0.97,
    },
    v_limbo: {
      enabled: true,
      rtp: 0.96,
    },
  },
});

describe('VerificationService', () => {
  const logger = {
    info: jest.fn(),
  } as unknown as PinoLogger;

  const partnerConfig = {
    getByPartnerCode: jest.fn(),
  } as unknown as PartnerConfigService;

  const prisma = {
    partner: {
      findFirst: jest.fn(),
    },
    gameVerificationContent: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new VerificationService(logger, partnerConfig, prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (partnerConfig.getByPartnerCode as jest.Mock).mockResolvedValue(
      baseRuntimeConfig(),
    );
  });

  it('returns a verification launch URL for enabled games', async () => {
    const { buildPartnerVerificationSettings } = jest.requireMock(
      '@vfair/app-common',
    ) as {
      buildPartnerVerificationSettings: jest.Mock;
    };

    const result = await service.launch(
      { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
      { partnerCode: 'acme', lang: 'en' },
    );

    expect(result).toEqual({
      url: 'http://localhost:4500/?settings=encoded-verification',
    });
    expect(partnerConfig.getByPartnerCode).toHaveBeenCalledWith('acme', 1);
    expect(buildPartnerVerificationSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerCode: 'acme',
      }),
    );
  });

  it('rejects partnerCode mismatches', async () => {
    await expect(
      service.launch(
        { partnerId: 1, partnerCode: 'acme', ipWhitelist: '*' },
        { partnerCode: 'other' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
