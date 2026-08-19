import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VERIFICATION_SETTINGS,
  bootstrapVerificationSettings,
} from './bootstrap-verification-settings';

describe('bootstrapVerificationSettings', () => {
  it('uses defaults when settings are missing', () => {
    const result = bootstrapVerificationSettings({ search: '', hash: '' });

    expect(result.hasSettingsError).toBe(false);
    expect(result.settings).toEqual(DEFAULT_VERIFICATION_SETTINGS);
  });

  it('decodes verification settings from the query string', () => {
    const payload = {
      partnerCode: 'acme',
      lang: 'ru',
      defaultAppearance: 'dark',
      themeSwitcherEnabled: false,
      lightAccentColor: 'blue',
      darkAccentColor: 'violet',
      theme: ['https://example.com/theme.css'],
      logo: 'https://example.com/logo.png',
      games: [{ id: 'v_dice', rtp: 0.97 }],
    };
    const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));

    const result = bootstrapVerificationSettings({
      search: `?settings=${encoded}`,
      hash: '',
    });

    expect(result.hasSettingsError).toBe(false);
    expect(result.settings).toEqual({
      partnerCode: 'acme',
      lang: 'ru',
      defaultAppearance: 'dark',
      themeSwitcherEnabled: false,
      lightAccentColor: 'blue',
      darkAccentColor: 'violet',
      theme: ['https://example.com/theme.css'],
      logo: 'https://example.com/logo.png',
      games: [{ id: 'v_dice', rtp: 0.97 }],
    });
  });

  it('keeps an empty enabled-games list from settings', () => {
    const payload = { games: [] };
    const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));

    const result = bootstrapVerificationSettings({
      search: `?settings=${encoded}`,
      hash: '',
    });

    expect(result.settings.games).toEqual([]);
  });

  it('falls back to defaults when settings are invalid', () => {
    const result = bootstrapVerificationSettings({
      search: '?settings=not-valid-base64!!!',
      hash: '',
    });

    expect(result.hasSettingsError).toBe(true);
    expect(result.settings).toEqual(DEFAULT_VERIFICATION_SETTINGS);
  });

  it('falls back to English for unsupported ISO languages', () => {
    for (const lang of ['fr', 'hy']) {
      const payload = { lang };
      const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));

      const result = bootstrapVerificationSettings({
        search: `?settings=${encoded}`,
        hash: '',
      });

      expect(result.hasSettingsError).toBe(false);
      expect(result.settings.lang).toBe('en');
    }
  });
});
