import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PartnerLaunchCurrency } from '@vfair/app-common';
import type { PartnerPalette, PartnerThemeConfig } from '@vfair/radix-palette';

export const PARTNER_CONFIG_CACHE_TTL_SECONDS = 2 * 60 * 60;

export const partnerConfigCacheKey = (partnerCode: string): string =>
  `games-api:partner:config:${partnerCode}`;

export type PartnerCurrencyRuntimeConfig = {
  currency: string;
  minBet: number;
  maxBet: number;
  maxWin: number;
  currencyDecimals: number;
  countryCode: string;
};

export type PartnerGameRuntimeConfig = {
  enabled: boolean;
  rtp: number;
};

export type PartnerRuntimeConfig = {
  partnerId: number;
  partnerCode: string;
  lobbyUrl: string | null;
  webhookUrl: string | null;
  lightAccentColor: string;
  darkAccentColor: string;
  defaultAppearance: 'light' | 'dark';
  themeSwitcherEnabled: boolean;
  theme: string | null;
  logo: string | null;
  palette: PartnerPalette;
  currencyConfigs: Record<string, PartnerCurrencyRuntimeConfig>;
  gameConfigs: Record<string, PartnerGameRuntimeConfig>;
};

export const assertGameEnabled = (
  config: PartnerRuntimeConfig,
  gameId: string,
): PartnerGameRuntimeConfig => {
  const game = config.gameConfigs[gameId];

  if (!game) {
    throw new ForbiddenException({
      err_code: 'game_not_configured',
      message: `Game "${gameId}" is not configured for partner "${config.partnerCode}"`,
    });
  }

  if (!game.enabled) {
    throw new ForbiddenException({
      err_code: 'game_disabled',
      message: `Game "${gameId}" is disabled for partner "${config.partnerCode}"`,
    });
  }

  return game;
};

export const assertCurrencyConfigured = (
  config: PartnerRuntimeConfig,
  currency: string,
): PartnerCurrencyRuntimeConfig => {
  const currencyConfig = config.currencyConfigs[currency];
  if (!currencyConfig) {
    throw new BadRequestException({
      err_code: 'currency_not_configured',
      message: `Currency "${currency}" is not configured for partner "${config.partnerCode}"`,
    });
  }

  return currencyConfig;
};

export const assertWalletConfigured = (
  config: PartnerRuntimeConfig,
): PartnerRuntimeConfig & { webhookUrl: string } => {
  if (!config.webhookUrl) {
    throw new BadRequestException({
      err_code: 'partner_wallet_unavailable',
      message: 'Partner wallet webhook is not configured',
    });
  }

  return config;
};

export const runtimeConfigToTheme = (
  config: PartnerRuntimeConfig,
): PartnerThemeConfig => ({
  ...config.palette,
  defaultAppearance: config.defaultAppearance,
  themeSwitcherEnabled: config.themeSwitcherEnabled,
  lightAccentColor: config.lightAccentColor,
  darkAccentColor: config.darkAccentColor,
  theme: config.theme,
  logo: config.logo,
});

export const runtimeCurrencyToLaunchCurrency = (
  currencyConfig: PartnerCurrencyRuntimeConfig,
): PartnerLaunchCurrency => ({
  code: currencyConfig.currency,
  minBet: currencyConfig.minBet,
  maxBet: currencyConfig.maxBet,
  maxWin: currencyConfig.maxWin,
  decimals: currencyConfig.currencyDecimals,
});

export const isGameActiveInConfig = (
  config: PartnerRuntimeConfig,
  gameId: string,
): boolean => config.gameConfigs[gameId]?.enabled === true;

export const resolveLaunchContextFromConfig = (
  config: PartnerRuntimeConfig,
  gameId: string,
  currency: string,
): {
  theme: PartnerThemeConfig;
  partnerCurrency: PartnerLaunchCurrency;
  rtp: number;
  lobbyUrl: string | null;
} => {
  const gameConfig = assertGameEnabled(config, gameId);
  const currencyConfig = assertCurrencyConfigured(config, currency);

  return {
    theme: runtimeConfigToTheme(config),
    partnerCurrency: runtimeCurrencyToLaunchCurrency(currencyConfig),
    rtp: gameConfig.rtp,
    lobbyUrl: config.lobbyUrl,
  };
};
