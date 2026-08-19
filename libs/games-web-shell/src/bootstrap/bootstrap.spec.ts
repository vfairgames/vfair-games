import { DEFAULT_GAME_RTP } from '@vfair/game-math';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_GAME_SETTINGS,
  bootstrapGameSettings,
  encodeGameSettingsParam,
  parseGameSettingsFromUrl,
  readSessionTokenFromSettings,
} from './bootstrap';

const encodeSettings = (value: unknown): string => btoa(JSON.stringify(value));

describe('encodeGameSettingsParam', () => {
  it('round-trips with parseGameSettingsFromUrl', () => {
    const payload = {
      defaultAppearance: 'dark' as const,
      themeSwitcherEnabled: false,
      lightAccentColor: 'blue',
      darkAccentColor: 'violet',
    };

    window.history.pushState(
      {},
      '',
      `/?settings=${encodeGameSettingsParam(payload)}`,
    );

    expect(parseGameSettingsFromUrl()).toMatchObject(payload);
  });
});

describe('parseGameSettingsFromUrl', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('returns defaults when settings param is absent', () => {
    window.history.pushState({}, '', '/?lang=fr');

    expect(parseGameSettingsFromUrl()).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it('applies valid settings and fills omitted keys with defaults', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ lang: 'ru', minBet: 2, maxBet: 50 })}`,
    );

    expect(parseGameSettingsFromUrl()).toEqual({
      ...DEFAULT_GAME_SETTINGS,
      lang: 'ru',
      minBet: 2,
      maxBet: 50,
    });
  });

  it('reads settings from the hash when query param is missing', () => {
    window.history.pushState(
      {},
      '',
      `/#settings=${encodeSettings({ currency: 'EUR', countryCode: 'DE' })}`,
    );

    expect(parseGameSettingsFromUrl()).toMatchObject({
      currency: 'EUR',
      countryCode: 'DE',
    });
  });

  it('applies provided values without field validation', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({
        currency: 'INVALID',
        rtp: 0.5,
        minBet: 10,
        maxBet: 5,
      })}`,
    );

    expect(parseGameSettingsFromUrl()).toMatchObject({
      currency: 'INVALID',
      rtp: 0.5,
      minBet: 10,
      maxBet: 5,
    });
  });

  it('applies json fields via spread over defaults', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ minBet: '1', maxBet: true, rtp: '0.97' })}`,
    );

    expect(parseGameSettingsFromUrl()).toMatchObject({
      minBet: '1',
      maxBet: true,
      rtp: '0.97',
    });
  });

  it('decodes base64url settings', () => {
    const encoded = btoa(JSON.stringify({ lang: 'ru' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    window.history.pushState({}, '', `/?settings=${encoded}`);

    expect(parseGameSettingsFromUrl().lang).toBe('ru');
  });

  it('throws when settings cannot be decoded', () => {
    window.history.pushState({}, '', '/?settings=%%%');

    expect(() => parseGameSettingsFromUrl()).toThrow(
      'Invalid settings: could not decode base64',
    );
  });

  it('throws when settings payload is not valid JSON', () => {
    window.history.pushState({}, '', `/?settings=${btoa('not-json')}`);

    expect(() => parseGameSettingsFromUrl()).toThrow(
      'Invalid settings: payload is not valid JSON',
    );
  });

  it('throws when settings payload is not a JSON object', () => {
    window.history.pushState({}, '', `/?settings=${encodeSettings([1, 2, 3])}`);

    expect(() => parseGameSettingsFromUrl()).toThrow(
      'Invalid settings: payload must be a JSON object',
    );
  });

  it('accepts rtp from settings', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ rtp: 0.97 })}`,
    );

    expect(parseGameSettingsFromUrl().rtp).toBe(0.97);
  });

  it('applies lobbyUrl from settings as provided', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ lobbyUrl: '   ' })}`,
    );

    expect(parseGameSettingsFromUrl().lobbyUrl).toBe('   ');
  });

  it('applies logo from settings as provided', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ logo: 'https://example.com/logo.png' })}`,
    );

    expect(parseGameSettingsFromUrl().logo).toBe(
      'https://example.com/logo.png',
    );
  });

  it('keeps default rtp when settings param is absent', () => {
    expect(parseGameSettingsFromUrl().rtp).toBe(DEFAULT_GAME_RTP);
  });

  it('extracts token from settings payload', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ token: 'session-token', minBet: 2 })}`,
    );

    expect(bootstrapGameSettings()).toEqual({
      error: null,
      settings: {
        ...DEFAULT_GAME_SETTINGS,
        minBet: 2,
      },
      token: 'session-token',
    });
  });

  it('reads token via readSessionTokenFromSettings', () => {
    window.history.pushState(
      {},
      '',
      `/?settings=${encodeSettings({ token: 'embedded-token' })}`,
    );

    expect(readSessionTokenFromSettings()).toBe('embedded-token');
  });
});
