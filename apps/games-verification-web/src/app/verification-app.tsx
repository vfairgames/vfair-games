import { Theme } from '@radix-ui/themes';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import type { ResolvedVerificationSettings } from './bootstrap/bootstrap-verification-settings';
import { VerificationTool } from './components/verification-tool/verification-tool';

type RadixAccentColor = NonNullable<
  ComponentProps<typeof Theme>['accentColor']
>;

type VerificationAppProps = {
  settings: ResolvedVerificationSettings;
  hasSettingsError: boolean;
};

export const VerificationApp = ({
  settings,
  hasSettingsError,
}: VerificationAppProps) => {
  const [appearance, setAppearance] = useState<'light' | 'dark'>(
    settings.defaultAppearance,
  );

  const accentName =
    appearance === 'dark'
      ? (settings.darkAccentColor ?? settings.lightAccentColor)
      : (settings.lightAccentColor ?? settings.darkAccentColor);

  const accentColor: RadixAccentColor | undefined = !accentName
    ? 'indigo'
    : accentName === 'custom'
      ? undefined
      : (accentName as RadixAccentColor);

  return (
    <Theme
      appearance={appearance}
      accentColor={accentColor}
      {...(accentName === 'custom' ? { 'data-accent-color': 'custom' } : {})}
      hasBackground
    >
      <VerificationTool
        settings={settings}
        hasSettingsError={hasSettingsError}
        appearance={appearance}
        onToggleAppearance={() =>
          setAppearance((current) => (current === 'dark' ? 'light' : 'dark'))
        }
      />
    </Theme>
  );
};
