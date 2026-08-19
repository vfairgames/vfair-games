export const DEFAULT_PARTNER_ASSETS_BASE_URL = 'http://localhost:3000';

const stripTrailingSlash = (baseUrl: string): string =>
  baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

export const resolvePartnerAssetsBaseUrl = (
  env: Record<string, string | undefined>,
): string => {
  const configured = env['PARTNER_ASSETS_BASE_URL']?.trim();
  if (!configured) {
    return DEFAULT_PARTNER_ASSETS_BASE_URL;
  }

  return stripTrailingSlash(configured);
};

const partnerAssetPath = (
  baseUrl: string,
  partnerCode: string,
  filename: string,
  updatedAt: Date,
): string =>
  `${stripTrailingSlash(baseUrl)}/api/public/partners/${encodeURIComponent(partnerCode)}/${filename}?v=${updatedAt.getTime()}`;

export const buildPartnerThemeAssetUrl = (
  baseUrl: string,
  partnerCode: string,
  updatedAt: Date,
): string => partnerAssetPath(baseUrl, partnerCode, 'theme.css', updatedAt);

export const buildPartnerLogoAssetUrl = (
  baseUrl: string,
  partnerCode: string,
  updatedAt: Date,
): string => partnerAssetPath(baseUrl, partnerCode, 'logo', updatedAt);

export const buildPartnerPublicAssetUrls = (input: {
  partnerCode: string;
  updatedAt: Date;
  hasLogo: boolean;
  baseUrl: string;
}): { theme: string; logo: string | null } => ({
  theme: buildPartnerThemeAssetUrl(
    input.baseUrl,
    input.partnerCode,
    input.updatedAt,
  ),
  logo: input.hasLogo
    ? buildPartnerLogoAssetUrl(
        input.baseUrl,
        input.partnerCode,
        input.updatedAt,
      )
    : null,
});
