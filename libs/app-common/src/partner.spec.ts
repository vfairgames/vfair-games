import { defaultPartnerThemeConfig } from '@vfair/radix-palette';
import { describe, expect, it } from 'vitest';
import {
  buildLaunchUrl,
  buildPartnerLaunchSettings,
  buildPartnerVerificationSettings,
  encodeLaunchSettingsParam,
} from './partner';

describe('buildPartnerLaunchSettings', () => {
  it('builds theme, currency, rtp, lobby, lang, and token fields', () => {
    const settings = buildPartnerLaunchSettings({
      theme: {
        ...defaultPartnerThemeConfig,
        theme: 'https://example.com/theme.css',
        logo: 'https://example.com/logo.png',
      },
      currency: {
        code: 'EUR',
        minBet: 1,
        maxBet: 100,
        maxWin: 1000,
        decimals: 2,
      },
      rtp: 0.97,
      lobbyUrl: 'https://lobby.example.com',
      lang: 'ru',
      token: 'session-token',
    });

    expect(settings).toMatchObject({
      defaultAppearance: defaultPartnerThemeConfig.defaultAppearance,
      themeSwitcherEnabled: defaultPartnerThemeConfig.themeSwitcherEnabled,
      theme: ['https://example.com/theme.css'],
      logo: 'https://example.com/logo.png',
      currency: 'EUR',
      countryCode: 'EU',
      currencyDecimals: 2,
      minBet: 1,
      maxBet: 100,
      maxWin: 1000,
      rtp: 0.97,
      lobbyUrl: 'https://lobby.example.com',
      lang: 'ru',
      token: 'session-token',
    });
  });

  it('omits currency fields when currency is not provided', () => {
    const settings = buildPartnerLaunchSettings({
      theme: defaultPartnerThemeConfig,
      rtp: 0.98,
    });

    expect(settings.currency).toBeUndefined();
    expect(settings.minBet).toBeUndefined();
  });
});

describe('buildPartnerVerificationSettings', () => {
  it('builds theme, games, partnerCode, and lang without currency or token', () => {
    const settings = buildPartnerVerificationSettings({
      partnerCode: 'acme',
      theme: {
        ...defaultPartnerThemeConfig,
        theme: 'https://example.com/theme.css',
        logo: 'https://example.com/logo.png',
      },
      games: [
        { id: 'v_dice', rtp: 0.99 },
        { id: 'v_limbo', rtp: 0.97 },
      ],
      lang: 'ru',
    });

    expect(settings).toEqual({
      partnerCode: 'acme',
      defaultAppearance: defaultPartnerThemeConfig.defaultAppearance,
      themeSwitcherEnabled: defaultPartnerThemeConfig.themeSwitcherEnabled,
      lightAccentColor: defaultPartnerThemeConfig.lightAccentColor,
      darkAccentColor: defaultPartnerThemeConfig.darkAccentColor,
      theme: ['https://example.com/theme.css'],
      logo: 'https://example.com/logo.png',
      games: [
        { id: 'v_dice', rtp: 0.99 },
        { id: 'v_limbo', rtp: 0.97 },
      ],
      lang: 'ru',
    });
  });
});

describe('buildLaunchUrl', () => {
  it('encodes settings into the launch URL', () => {
    const settings = buildPartnerLaunchSettings({
      theme: defaultPartnerThemeConfig,
      rtp: 0.98,
      token: 'abc',
    });

    const url = buildLaunchUrl('http://localhost:4200/', settings);
    const encoded = encodeURIComponent(encodeLaunchSettingsParam(settings));

    expect(url).toBe(`http://localhost:4200/?settings=${encoded}`);
  });

  it('encodes verification settings into the launch URL', () => {
    const settings = buildPartnerVerificationSettings({
      partnerCode: 'acme',
      theme: defaultPartnerThemeConfig,
      games: [{ id: 'v_dice', rtp: 0.99 }],
    });

    const url = buildLaunchUrl('http://localhost:4500/', settings);
    const encoded = encodeURIComponent(encodeLaunchSettingsParam(settings));

    expect(url).toBe(`http://localhost:4500/?settings=${encoded}`);
  });
});
