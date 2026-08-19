import { Theme } from '@radix-ui/themes';
import type { ThemeAppearance } from '@vfair/radix-palette';

import './theme-provider.scss';
import { ToastProvider } from '../toast/toast-provider';
import { type ComponentProps, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useMainStore } from '../../store/main-store/main-store';
import { APP_THEME_PROPS } from './theme-config';

type ThemeContextValue = {
  appearance: ThemeAppearance;
  toggleAppearance: () => void;
};

type RadixAccentColor = NonNullable<
  ComponentProps<typeof Theme>['accentColor']
>;

const pickAppearanceColor = (
  appearance: ThemeAppearance,
  light: string | null,
  dark: string | null,
): string | null => (appearance === 'dark' ? (dark ?? light) : (light ?? dark));

export const useAppTheme = (): ThemeContextValue =>
  useMainStore(
    useShallow((state) => ({
      appearance: state.appearance,
      toggleAppearance: state.toggleAppearance,
    })),
  );

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { appearance, lightAccentColor, darkAccentColor } = useMainStore(
    useShallow((state) => ({
      appearance: state.appearance,
      lightAccentColor: state.lightAccentColor,
      darkAccentColor: state.darkAccentColor,
    })),
  );

  const accentName = pickAppearanceColor(
    appearance,
    lightAccentColor,
    darkAccentColor,
  );
  const accentColor: RadixAccentColor | undefined = !accentName
    ? APP_THEME_PROPS.accentColor
    : accentName === 'custom'
      ? undefined
      : (accentName as RadixAccentColor);

  return (
    <Theme
      {...APP_THEME_PROPS}
      accentColor={accentColor}
      appearance={appearance}
      {...(accentName === 'custom' ? { 'data-accent-color': 'custom' } : {})}
    >
      <ToastProvider appearance={appearance}>{children}</ToastProvider>
    </Theme>
  );
};
