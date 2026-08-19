export const PARTNER_THEME_PREVIEW_MESSAGE_TYPE =
  'vfair:partner-theme-preview' as const;

export type PartnerThemePreviewMessage = {
  type: typeof PARTNER_THEME_PREVIEW_MESSAGE_TYPE;
  css: string;
  logo: string | null;
};

export const isPartnerThemePreviewMessage = (
  data: unknown,
): data is PartnerThemePreviewMessage => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const record = data as Record<string, unknown>;
  const logo = record['logo'];

  return (
    record['type'] === PARTNER_THEME_PREVIEW_MESSAGE_TYPE &&
    typeof record['css'] === 'string' &&
    (logo === null || typeof logo === 'string')
  );
};
