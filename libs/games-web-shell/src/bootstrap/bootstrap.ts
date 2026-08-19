import { DEFAULT_GAME_RTP } from '@vfair/game-math';
import type {
  CountryCode,
  Currency,
  PartnerLaunchSettings,
} from '@vfair/app-common';
import type { ThemeAppearance } from '@vfair/radix-palette';

import { DEFAULT_LANGUAGE, resolveLanguage } from '../i18n/i18n';
import type { SupportedLanguage } from '../i18n/i18n';

export type GameSettings = {
  lang: SupportedLanguage;
  rtp: number;
  minBet: number;
  maxBet: number;
  maxWin: number;
  currency: Currency;
  countryCode: CountryCode;
  currencyDecimals: number;
  lobbyUrl: string | null;
  lightAccentColor: string | null;
  darkAccentColor: string | null;
  defaultAppearance: ThemeAppearance;
  themeSwitcherEnabled: boolean;
  theme: string[];
  logo: string | null;
  token?: string | null;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  lang: DEFAULT_LANGUAGE,
  rtp: DEFAULT_GAME_RTP,
  minBet: 0.01,
  maxBet: 1000,
  maxWin: 100000,
  currency: 'USD',
  countryCode: 'US',
  currencyDecimals: 2,
  lobbyUrl: null,
  lightAccentColor: null,
  darkAccentColor: null,
  defaultAppearance: 'light',
  themeSwitcherEnabled: true,
  theme: [],
  logo: null,
};

type LocationSearch = Pick<Location, 'hash' | 'search'>;

const decodeBase64Param = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );

  return atob(padded);
};

const readSettingsParam = (location: LocationSearch): string | null => {
  const fromQuery = new URLSearchParams(location.search).get('settings');
  if (fromQuery) {
    return fromQuery;
  }

  return new URLSearchParams(location.hash.replace(/^#/, '')).get('settings');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveGameSettings = (payload: Partial<GameSettings>): GameSettings => {
  const { token: _token, ...rest } = payload;

  return {
    ...DEFAULT_GAME_SETTINGS,
    ...rest,
    lang: rest.lang ? resolveLanguage(rest.lang) : DEFAULT_GAME_SETTINGS.lang,
    theme: Array.isArray(rest.theme) ? rest.theme : DEFAULT_GAME_SETTINGS.theme,
  };
};

const parseSettingsPayload = (encoded: string): Partial<GameSettings> => {
  let decoded: string;

  try {
    decoded = decodeBase64Param(encoded);
  } catch {
    throw new Error('Invalid settings: could not decode base64');
  }

  let json: unknown;

  try {
    json = JSON.parse(decoded);
  } catch {
    throw new Error('Invalid settings: payload is not valid JSON');
  }

  if (!isRecord(json)) {
    throw new Error('Invalid settings: payload must be a JSON object');
  }

  return json as Partial<GameSettings>;
};

const splitSettingsPayload = (
  payload: Partial<GameSettings>,
): { settings: GameSettings; token: string | null } => {
  const { token, ...rest } = payload;
  return {
    settings: resolveGameSettings(rest),
    token: typeof token === 'string' && token.length > 0 ? token : null,
  };
};

export const readSessionTokenFromSettings = (
  location: LocationSearch | null = typeof window === 'undefined'
    ? null
    : window.location,
): string | null => {
  const encoded = location ? readSettingsParam(location) : null;
  if (!encoded) {
    return null;
  }

  try {
    const payload = parseSettingsPayload(encoded);
    return typeof payload.token === 'string' && payload.token.length > 0
      ? payload.token
      : null;
  } catch {
    return null;
  }
};

export const encodeGameSettingsParam = (
  settings: Partial<GameSettings> | PartnerLaunchSettings,
): string => btoa(JSON.stringify(settings));

export const parseGameSettingsFromUrl = (
  location: LocationSearch | null = typeof window === 'undefined'
    ? null
    : window.location,
): GameSettings => {
  const encoded = location ? readSettingsParam(location) : null;

  if (!encoded) {
    return resolveGameSettings({});
  }

  return splitSettingsPayload(parseSettingsPayload(encoded)).settings;
};

export type BootstrapGameSettingsResult = {
  error: string | null;
  settings: GameSettings | null;
  token: string | null;
};

export const bootstrapGameSettings = (
  location: LocationSearch | null = typeof window === 'undefined'
    ? null
    : window.location,
): BootstrapGameSettingsResult => {
  try {
    const encoded = location ? readSettingsParam(location) : null;

    if (!encoded) {
      return { error: null, settings: resolveGameSettings({}), token: null };
    }

    const { settings, token } = splitSettingsPayload(
      parseSettingsPayload(encoded),
    );
    return { error: null, settings, token };
  } catch (error) {
    console.error(error);
    return {
      error: error instanceof Error ? error.message : 'Invalid game settings',
      settings: null,
      token: null,
    };
  }
};
