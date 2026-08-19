import { beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_LANGUAGE,
  initializeTranslations,
  resolveLanguage,
  translate,
} from './i18n';

describe('resolveLanguage', () => {
  it('returns supported language codes', () => {
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('ru')).toBe('ru');
  });

  it('defaults unsupported or missing values to English', () => {
    expect(resolveLanguage(null)).toBe('en');
    expect(resolveLanguage('de')).toBe('en');
    expect(resolveLanguage('hy')).toBe('en');
  });
});

describe('initializeTranslations', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('loads the selected language catalog and updates the document language', async () => {
    await initializeTranslations('ru');

    expect(document.documentElement.lang).toBe('ru');
    expect(translate('shellManual')).toBe('Вручную');
  });

  it('defaults to English when no language is provided', async () => {
    await initializeTranslations();

    expect(document.documentElement.lang).toBe(DEFAULT_LANGUAGE);
    expect(translate('shellManual')).toBe('Manual');
  });
});
