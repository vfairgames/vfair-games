import { describe, expect, it } from 'vitest';

import { LANGUAGE_CODES, isLanguage } from './language';

describe('LANGUAGE_CODES', () => {
  it('includes common ISO 639-1 codes', () => {
    expect(LANGUAGE_CODES.en).toBe(1);
    expect(LANGUAGE_CODES.hy).toBe(1);
    expect(LANGUAGE_CODES.ru).toBe(1);
    expect(LANGUAGE_CODES.fr).toBe(1);
  });
});

describe('isLanguage', () => {
  it('returns true for catalog members', () => {
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('hy')).toBe(true);
    expect(isLanguage('fr')).toBe(true);
  });

  it('returns false for unknown or invalid codes', () => {
    expect(isLanguage('xx')).toBe(false);
    expect(isLanguage('EN')).toBe(false);
    expect(isLanguage('')).toBe(false);
  });
});
