import { resolvePartnerAccentColors } from './palette-css';
import {
  defaultPartnerPalette,
  type PartnerThemeConfig,
} from './palette-types';

export const defaultPartnerThemeConfig: PartnerThemeConfig = {
  ...defaultPartnerPalette,
  defaultAppearance: 'light',
  themeSwitcherEnabled: true,
  ...resolvePartnerAccentColors(defaultPartnerPalette),
  theme: null,
  logo: null,
};
