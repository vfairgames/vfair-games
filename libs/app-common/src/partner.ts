import { getCountryByCurrency } from './country';
import type { CountryCode } from './country';
import type { Currency } from './currency';
import type { Language } from './language';

type ThemeAppearance = 'light' | 'dark';

export type PartnerLaunchTheme = {
  defaultAppearance: ThemeAppearance;
  themeSwitcherEnabled: boolean;
  lightAccentColor: string;
  darkAccentColor: string;
  theme?: string | null;
  logo?: string | null;
};

export type PartnerLaunchCurrency = {
  code: string;
  minBet: number;
  maxBet: number;
  maxWin: number;
  decimals: number;
};

export type PartnerLaunchSettings = {
  lang?: Language;
  rtp?: number;
  minBet?: number;
  maxBet?: number;
  maxWin?: number;
  currency?: Currency;
  countryCode?: CountryCode;
  currencyDecimals?: number;
  lobbyUrl?: string | null;
  lightAccentColor?: string | null;
  darkAccentColor?: string | null;
  defaultAppearance?: ThemeAppearance;
  themeSwitcherEnabled?: boolean;
  theme?: string[];
  logo?: string | null;
  token?: string;
};

export type PartnerVerificationGame = {
  id: string;
  rtp: number;
};

export type PartnerVerificationSettings = {
  partnerCode: string;
  lang?: Language;
  lightAccentColor?: string | null;
  darkAccentColor?: string | null;
  defaultAppearance?: ThemeAppearance;
  themeSwitcherEnabled?: boolean;
  theme?: string[];
  logo?: string | null;
  games: PartnerVerificationGame[];
};

type LaunchUrlSettings = PartnerLaunchSettings | PartnerVerificationSettings;

const toCountryCode = (currency: Currency): CountryCode =>
  getCountryByCurrency(currency).toUpperCase() as CountryCode;

export const buildPartnerLaunchSettings = (input: {
  theme: PartnerLaunchTheme;
  currency?: PartnerLaunchCurrency;
  rtp?: number;
  lobbyUrl?: string | null;
  lang?: Language;
  token?: string;
}): PartnerLaunchSettings => ({
  defaultAppearance: input.theme.defaultAppearance,
  themeSwitcherEnabled: input.theme.themeSwitcherEnabled,
  lightAccentColor: input.theme.lightAccentColor,
  darkAccentColor: input.theme.darkAccentColor,
  ...(input.theme.theme ? { theme: [input.theme.theme] } : {}),
  ...(input.theme.logo ? { logo: input.theme.logo } : {}),
  ...(input.rtp !== undefined ? { rtp: input.rtp } : {}),
  ...(input.currency
    ? {
        currency: input.currency.code as Currency,
        countryCode: toCountryCode(input.currency.code as Currency),
        currencyDecimals: input.currency.decimals,
        minBet: input.currency.minBet,
        maxBet: input.currency.maxBet,
        maxWin: input.currency.maxWin,
      }
    : {}),
  ...(input.lobbyUrl ? { lobbyUrl: input.lobbyUrl } : {}),
  ...(input.lang ? { lang: input.lang } : {}),
  ...(input.token ? { token: input.token } : {}),
});

export const buildPartnerVerificationSettings = (input: {
  partnerCode: string;
  theme: PartnerLaunchTheme;
  games: PartnerVerificationGame[];
  lang?: Language;
}): PartnerVerificationSettings => ({
  partnerCode: input.partnerCode,
  defaultAppearance: input.theme.defaultAppearance,
  themeSwitcherEnabled: input.theme.themeSwitcherEnabled,
  lightAccentColor: input.theme.lightAccentColor,
  darkAccentColor: input.theme.darkAccentColor,
  games: input.games,
  ...(input.theme.theme ? { theme: [input.theme.theme] } : {}),
  ...(input.theme.logo ? { logo: input.theme.logo } : {}),
  ...(input.lang ? { lang: input.lang } : {}),
});

export const encodeLaunchSettingsParam = (
  settings: LaunchUrlSettings,
): string => btoa(JSON.stringify(settings));

export const buildLaunchUrl = (
  baseUrl: string,
  settings: LaunchUrlSettings,
): string => {
  const encoded = encodeURIComponent(encodeLaunchSettingsParam(settings));
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/?settings=${encoded}`;
};
