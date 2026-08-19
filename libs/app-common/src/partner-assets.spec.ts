import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PARTNER_ASSETS_BASE_URL,
  buildPartnerLogoAssetUrl,
  buildPartnerPublicAssetUrls,
  buildPartnerThemeAssetUrl,
  resolvePartnerAssetsBaseUrl,
} from './partner-assets';

describe('resolvePartnerAssetsBaseUrl', () => {
  it('defaults to localhost games-api', () => {
    expect(resolvePartnerAssetsBaseUrl({})).toBe(
      DEFAULT_PARTNER_ASSETS_BASE_URL,
    );
  });

  it('strips a trailing slash from the configured base', () => {
    expect(
      resolvePartnerAssetsBaseUrl({
        PARTNER_ASSETS_BASE_URL: 'https://games-api.example.com/',
      }),
    ).toBe('https://games-api.example.com');
  });
});

describe('partner asset URLs', () => {
  const updatedAt = new Date('2026-08-14T12:00:00.000Z');
  const version = updatedAt.getTime();

  it('builds versioned theme and logo URLs', () => {
    expect(
      buildPartnerThemeAssetUrl(
        'http://localhost:3000',
        'demo-partner',
        updatedAt,
      ),
    ).toBe(
      `http://localhost:3000/api/public/partners/demo-partner/theme.css?v=${version}`,
    );
    expect(
      buildPartnerLogoAssetUrl(
        'http://localhost:3000',
        'demo-partner',
        updatedAt,
      ),
    ).toBe(
      `http://localhost:3000/api/public/partners/demo-partner/logo?v=${version}`,
    );
  });

  it('encodes the partner code and omits logo when absent', () => {
    expect(
      buildPartnerPublicAssetUrls({
        partnerCode: 'acme/co',
        updatedAt,
        hasLogo: false,
        baseUrl: 'http://localhost:3000/',
      }),
    ).toEqual({
      theme: `http://localhost:3000/api/public/partners/acme%2Fco/theme.css?v=${version}`,
      logo: null,
    });
  });
});
