import Color from 'colorjs.io';

export type ThemeAppearance = 'light' | 'dark';

export type PartnerPalette = {
  lightAccent: string;
  lightGray: string;
  lightBg: string;
  darkAccent: string;
  darkGray: string;
  darkBg: string;
};

export type PartnerThemeConfig = PartnerPalette & {
  defaultAppearance: ThemeAppearance;
  themeSwitcherEnabled: boolean;
  lightAccentColor: string;
  darkAccentColor: string;
  theme: string | null;
  logo: string | null;
};

export const defaultPartnerPalette: PartnerPalette = {
  lightAccent: '#3D63DD',
  lightGray: '#8B8D98',
  lightBg: '#FFFFFF',
  darkAccent: '#3D63DD',
  darkGray: '#8B8D98',
  darkBg: '#111111',
};

export const parsePartnerColor = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[0-9a-fA-F]{3,8}$/.test(trimmed)
    ? `#${trimmed}`
    : trimmed;

  try {
    new Color(candidate);
    return candidate;
  } catch {
    return null;
  }
};
