import { Theme } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { usePartnerPrefsStore } from '../../store/partner-prefs-store';

type PartnerThemeProps = {
  children: ReactNode;
};

export const PartnerTheme = ({ children }: PartnerThemeProps) => {
  const appearance = usePartnerPrefsStore((s) => s.appearance);

  return <Theme appearance={appearance}>{children}</Theme>;
};
