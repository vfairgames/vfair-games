import type { PartnerVerificationSettings } from '@vfair/app-common';
import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
  isAvailableGameId,
} from '@vfair/game-contracts';
import { DEFAULT_GAME_RTP, UNSUPPORTED_GAME_RTP } from '@vfair/game-math';

export type VerificationLanguage = 'en' | 'ru';

export type ResolvedVerificationSettings = {
  partnerCode: string | null;
  lang: VerificationLanguage;
  lightAccentColor: string | null;
  darkAccentColor: string | null;
  defaultAppearance: 'light' | 'dark';
  themeSwitcherEnabled: boolean;
  theme: string[];
  logo: string | null;
  games: { id: string; rtp: number }[];
};

export const DEFAULT_VERIFICATION_SETTINGS: ResolvedVerificationSettings = {
  partnerCode: null,
  lang: 'en',
  lightAccentColor: 'indigo',
  darkAccentColor: 'indigo',
  defaultAppearance: 'light',
  themeSwitcherEnabled: true,
  theme: [],
  logo: null,
  games: [
    { id: DICE_GAME_ID, rtp: DEFAULT_GAME_RTP },
    { id: LIMBO_GAME_ID, rtp: DEFAULT_GAME_RTP },
    { id: MINES_GAME_ID, rtp: DEFAULT_GAME_RTP },
    { id: PLINKO_GAME_ID, rtp: UNSUPPORTED_GAME_RTP },
    { id: KENO_GAME_ID, rtp: UNSUPPORTED_GAME_RTP },
  ],
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

const resolveLanguage = (value: unknown): VerificationLanguage =>
  value === 'ru' || value === 'en' ? value : DEFAULT_VERIFICATION_SETTINGS.lang;

const resolveGames = (
  value: unknown,
): ResolvedVerificationSettings['games'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      return [];
    }
    if (!isAvailableGameId(entry.id)) {
      return [];
    }
    const rtp =
      typeof entry.rtp === 'number' && Number.isFinite(entry.rtp)
        ? entry.rtp
        : DEFAULT_GAME_RTP;
    return [{ id: entry.id, rtp }];
  });
};

const resolvePartnerCode = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveSettings = (
  payload: Partial<PartnerVerificationSettings>,
): ResolvedVerificationSettings => ({
  ...DEFAULT_VERIFICATION_SETTINGS,
  partnerCode: resolvePartnerCode(payload.partnerCode),
  lang: resolveLanguage(payload.lang),
  lightAccentColor:
    typeof payload.lightAccentColor === 'string'
      ? payload.lightAccentColor
      : DEFAULT_VERIFICATION_SETTINGS.lightAccentColor,
  darkAccentColor:
    typeof payload.darkAccentColor === 'string'
      ? payload.darkAccentColor
      : DEFAULT_VERIFICATION_SETTINGS.darkAccentColor,
  defaultAppearance:
    payload.defaultAppearance === 'dark' ||
    payload.defaultAppearance === 'light'
      ? payload.defaultAppearance
      : DEFAULT_VERIFICATION_SETTINGS.defaultAppearance,
  themeSwitcherEnabled:
    typeof payload.themeSwitcherEnabled === 'boolean'
      ? payload.themeSwitcherEnabled
      : DEFAULT_VERIFICATION_SETTINGS.themeSwitcherEnabled,
  theme: Array.isArray(payload.theme)
    ? payload.theme.filter((url): url is string => typeof url === 'string')
    : DEFAULT_VERIFICATION_SETTINGS.theme,
  logo: typeof payload.logo === 'string' ? payload.logo : null,
  games:
    payload.games === undefined
      ? DEFAULT_VERIFICATION_SETTINGS.games
      : resolveGames(payload.games),
});

export const bootstrapVerificationSettings = (
  location: LocationSearch = window.location,
): {
  hasSettingsError: boolean;
  settings: ResolvedVerificationSettings;
} => {
  const encoded = readSettingsParam(location);
  if (!encoded) {
    return { hasSettingsError: false, settings: DEFAULT_VERIFICATION_SETTINGS };
  }

  try {
    const decoded = decodeBase64Param(encoded);
    const json: unknown = JSON.parse(decoded);
    if (!isRecord(json)) {
      throw new Error('invalid');
    }
    return {
      hasSettingsError: false,
      settings: resolveSettings(json as Partial<PartnerVerificationSettings>),
    };
  } catch {
    return { hasSettingsError: true, settings: DEFAULT_VERIFICATION_SETTINGS };
  }
};
