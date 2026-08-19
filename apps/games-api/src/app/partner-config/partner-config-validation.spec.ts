import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  assertCurrencyConfigured,
  assertGameEnabled,
  isGameActiveInConfig,
  partnerConfigCacheKey,
  resolveLaunchContextFromConfig,
  runtimeConfigToTheme,
  runtimeCurrencyToLaunchCurrency,
  type PartnerRuntimeConfig,
} from './partner-config-validation';

const baseConfig = (): PartnerRuntimeConfig => ({
  partnerId: 1,
  partnerCode: 'acme',
  lobbyUrl: 'https://lobby.example.com',
  webhookUrl: null,
  lightAccentColor: 'blue',
  darkAccentColor: 'violet',
  defaultAppearance: 'light',
  themeSwitcherEnabled: true,
  theme: 'https://theme.example.com/theme.css',
  logo: 'https://theme.example.com/logo.png',
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
  },
});

const expectErrorResponse = (
  run: () => void,
  ErrorClass: typeof BadRequestException | typeof ForbiddenException,
  response: { err_code: string; message: string },
) => {
  try {
    run();
    throw new Error('expected throw');
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorClass);
    expect(
      (error as BadRequestException | ForbiddenException).getResponse(),
    ).toEqual(response);
  }
};

describe('isGameActiveInConfig', () => {
  it('returns true when the game is enabled', () => {
    expect(isGameActiveInConfig(baseConfig(), 'v_dice')).toBe(true);
  });

  it('returns false when the game is disabled', () => {
    const config = baseConfig();
    config.gameConfigs.v_dice.enabled = false;

    expect(isGameActiveInConfig(config, 'v_dice')).toBe(false);
  });

  it('returns false when the game is not configured', () => {
    expect(isGameActiveInConfig(baseConfig(), 'missing')).toBe(false);
  });
});

describe('runtimeConfigToTheme', () => {
  it('maps palette and theme fields to PartnerThemeConfig', () => {
    const theme = runtimeConfigToTheme(baseConfig());

    expect(theme).toEqual({
      lightAccent: 'blue',
      lightGray: 'slate',
      lightBg: 'white',
      darkAccent: 'violet',
      darkGray: 'slate',
      darkBg: 'black',
      defaultAppearance: 'light',
      themeSwitcherEnabled: true,
      lightAccentColor: 'blue',
      darkAccentColor: 'violet',
      theme: 'https://theme.example.com/theme.css',
      logo: 'https://theme.example.com/logo.png',
    });
  });
});

describe('runtimeCurrencyToLaunchCurrency', () => {
  it('maps runtime currency fields to launch currency', () => {
    const currency = runtimeCurrencyToLaunchCurrency(
      baseConfig().currencyConfigs.USD,
    );

    expect(currency).toEqual({
      code: 'USD',
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      decimals: 2,
    });
  });
});

describe('resolveLaunchContextFromConfig', () => {
  it('returns launch context when game and currency are valid', () => {
    const context = resolveLaunchContextFromConfig(
      baseConfig(),
      'v_dice',
      'USD',
    );

    expect(context.rtp).toBe(0.98);
    expect(context.lobbyUrl).toBe('https://lobby.example.com');
    expect(context.partnerCurrency.code).toBe('USD');
    expect(context.theme.lightAccent).toBe('blue');
  });

  it('throws ForbiddenException when the game is disabled', () => {
    const config = baseConfig();
    config.gameConfigs.v_dice.enabled = false;

    expectErrorResponse(
      () => resolveLaunchContextFromConfig(config, 'v_dice', 'USD'),
      ForbiddenException,
      {
        err_code: 'game_disabled',
        message: 'Game "v_dice" is disabled for partner "acme"',
      },
    );
  });

  it('throws ForbiddenException when the game is not configured', () => {
    expectErrorResponse(
      () => resolveLaunchContextFromConfig(baseConfig(), 'v_mines', 'USD'),
      ForbiddenException,
      {
        err_code: 'game_not_configured',
        message: 'Game "v_mines" is not configured for partner "acme"',
      },
    );
  });

  it('throws BadRequestException when the currency is not configured', () => {
    expectErrorResponse(
      () => resolveLaunchContextFromConfig(baseConfig(), 'v_dice', 'EUR'),
      BadRequestException,
      {
        err_code: 'currency_not_configured',
        message: 'Currency "EUR" is not configured for partner "acme"',
      },
    );
  });
});

describe('partnerConfigCacheKey', () => {
  it('builds a namespaced redis key from partner code', () => {
    expect(partnerConfigCacheKey('acme')).toBe('games-api:partner:config:acme');
  });
});

describe('assertGameEnabled', () => {
  it('passes when the game is enabled', () => {
    expect(() => assertGameEnabled(baseConfig(), 'v_dice')).not.toThrow();
  });

  it('throws when the game is disabled', () => {
    const config = baseConfig();
    config.gameConfigs.v_dice.enabled = false;

    expectErrorResponse(
      () => assertGameEnabled(config, 'v_dice'),
      ForbiddenException,
      {
        err_code: 'game_disabled',
        message: 'Game "v_dice" is disabled for partner "acme"',
      },
    );
  });

  it('throws when the game is missing', () => {
    expectErrorResponse(
      () => assertGameEnabled(baseConfig(), 'missing'),
      ForbiddenException,
      {
        err_code: 'game_not_configured',
        message: 'Game "missing" is not configured for partner "acme"',
      },
    );
  });
});

describe('assertCurrencyConfigured', () => {
  it('returns the currency config when configured', () => {
    const currency = assertCurrencyConfigured(baseConfig(), 'USD');
    expect(currency.minBet).toBe(1);
    expect(currency.maxBet).toBe(100);
  });

  it('throws when the currency is not configured', () => {
    expectErrorResponse(
      () => assertCurrencyConfigured(baseConfig(), 'EUR'),
      BadRequestException,
      {
        err_code: 'currency_not_configured',
        message: 'Currency "EUR" is not configured for partner "acme"',
      },
    );
  });
});
