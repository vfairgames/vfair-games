import { encodeGameSettingsParam } from '@vfair/games-web-shell';
import { buildPartnerLaunchSettings } from '@vfair/app-common';
import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
  type GameId,
} from '@vfair/game-contracts';
import {
  defaultPartnerPalette,
  resolvePartnerAccentColors,
  type PartnerPalette,
  type PartnerThemeConfig,
  type ThemeAppearance,
} from '@vfair/radix-palette';
import type { PartnerCurrency } from '../../services/admin-api.service';

export const PREVIEW_LANGUAGES = ['en', 'ru'] as const;

export type PreviewLanguage = (typeof PREVIEW_LANGUAGES)[number];

export const PREVIEW_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
] as const satisfies readonly {
  value: PreviewLanguage;
  label: string;
}[];

export const isPreviewLanguage = (value: string): value is PreviewLanguage =>
  (PREVIEW_LANGUAGES as readonly string[]).includes(value);

const GAME_PREVIEW_ORIGINS: Record<GameId, string> = {
  [DICE_GAME_ID]:
    import.meta.env.VITE_DICE_PREVIEW_ORIGIN ?? 'http://localhost:4200',
  [MINES_GAME_ID]:
    import.meta.env.VITE_MINES_PREVIEW_ORIGIN ?? 'http://localhost:4201',
  [LIMBO_GAME_ID]:
    import.meta.env.VITE_LIMBO_PREVIEW_ORIGIN ?? 'http://localhost:4202',
  [PLINKO_GAME_ID]:
    import.meta.env.VITE_PLINKO_PREVIEW_ORIGIN ?? 'http://localhost:4203',
  [KENO_GAME_ID]:
    import.meta.env.VITE_KENO_PREVIEW_ORIGIN ?? 'http://localhost:4204',
};

export const getGamePreviewOrigin = (gameId: GameId): string =>
  GAME_PREVIEW_ORIGINS[gameId];

export const DEFAULT_APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export type PaletteField = 'accent' | 'gray' | 'background';

export const PALETTE_FIELD_KEYS: Record<
  ThemeAppearance,
  Record<PaletteField, keyof PartnerPalette>
> = {
  light: {
    accent: 'lightAccent',
    gray: 'lightGray',
    background: 'lightBg',
  },
  dark: {
    accent: 'darkAccent',
    gray: 'darkGray',
    background: 'darkBg',
  },
};

export const PALETTE_COLOR_KEYS = [
  'lightAccent',
  'lightGray',
  'lightBg',
  'darkAccent',
  'darkGray',
  'darkBg',
] as const satisfies readonly (keyof PartnerPalette)[];

const WRITABLE_THEME_KEYS = [
  ...PALETTE_COLOR_KEYS,
  'defaultAppearance',
  'themeSwitcherEnabled',
] as const satisfies readonly (keyof PartnerThemeConfig)[];

const paletteAppearanceKeys = (appearance: ThemeAppearance) =>
  Object.values(PALETTE_FIELD_KEYS[appearance]);

export const paletteAppearanceDiffersFromDefault = (
  appearance: ThemeAppearance,
  theme: PartnerThemeConfig,
): boolean =>
  paletteAppearanceKeys(appearance).some(
    (key) => theme[key] !== defaultPartnerPalette[key],
  );

export const resetPaletteAppearance = (
  theme: PartnerThemeConfig,
  appearance: ThemeAppearance,
): PartnerThemeConfig => {
  const keys = PALETTE_FIELD_KEYS[appearance];

  return {
    ...theme,
    [keys.accent]: defaultPartnerPalette[keys.accent],
    [keys.gray]: defaultPartnerPalette[keys.gray],
    [keys.background]: defaultPartnerPalette[keys.background],
  };
};

export const writableThemeDiffers = (
  left: PartnerThemeConfig,
  right: PartnerThemeConfig,
): boolean => WRITABLE_THEME_KEYS.some((key) => left[key] !== right[key]);

export const toWritableTheme = (
  theme: PartnerThemeConfig,
): Omit<
  PartnerThemeConfig,
  'theme' | 'logo' | 'lightAccentColor' | 'darkAccentColor'
> => ({
  lightAccent: theme.lightAccent,
  lightGray: theme.lightGray,
  lightBg: theme.lightBg,
  darkAccent: theme.darkAccent,
  darkGray: theme.darkGray,
  darkBg: theme.darkBg,
  defaultAppearance: theme.defaultAppearance,
  themeSwitcherEnabled: theme.themeSwitcherEnabled,
});

export const buildCopyPreviewUrl = ({
  gameId,
  savedTheme,
  rtp,
  currency,
  lobbyUrl,
  lang,
}: {
  gameId: GameId;
  savedTheme: PartnerThemeConfig;
  rtp?: number;
  currency?: PartnerCurrency;
  lobbyUrl?: string | null;
  lang: PreviewLanguage;
}): string => {
  const settings = encodeURIComponent(
    encodeGameSettingsParam(
      buildPartnerLaunchSettings({
        theme: savedTheme,
        ...(currency ? { currency } : {}),
        rtp,
        lobbyUrl,
        lang,
      }),
    ),
  );

  return `${getGamePreviewOrigin(gameId)}/?settings=${settings}`;
};

export const buildPreviewSrc = ({
  gameId,
  previewTheme,
  editingAppearance,
  rtp,
  currency,
  lobbyUrl,
  lang,
  previewReloadToken,
}: {
  gameId: GameId;
  previewTheme: PartnerThemeConfig;
  editingAppearance: ThemeAppearance;
  rtp?: number;
  currency?: PartnerCurrency;
  lobbyUrl?: string | null;
  lang: PreviewLanguage;
  previewReloadToken: number;
}): string => {
  const accentColors = resolvePartnerAccentColors(previewTheme);

  const settings = encodeURIComponent(
    encodeGameSettingsParam(
      buildPartnerLaunchSettings({
        theme: {
          ...previewTheme,
          defaultAppearance: editingAppearance,
          lightAccentColor: accentColors.lightAccentColor,
          darkAccentColor: accentColors.darkAccentColor,
          theme: null,
        },
        ...(currency ? { currency } : {}),
        rtp,
        lobbyUrl,
        lang,
      }),
    ),
  );

  return `${getGamePreviewOrigin(gameId)}/?preview=true&settings=${settings}&_preview=${previewReloadToken}`;
};
