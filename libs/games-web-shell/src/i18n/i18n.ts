import i18next, { type TOptions } from 'i18next';
import {
  initReactI18next,
  useTranslation as useReactI18nextTranslation,
} from 'react-i18next';

type TranslationCatalog = Record<string, string>;
type LocaleModule = { default: TranslationCatalog };

export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const localeLoaders: Record<SupportedLanguage, () => Promise<LocaleModule>> = {
  en: () => import('./locales/en.json'),
  ru: () => import('./locales/ru.json'),
};

const isSupportedLanguage = (value: string): value is SupportedLanguage =>
  SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);

export const resolveLanguage = (value: string | null): SupportedLanguage => {
  const normalizedValue = value?.trim().toLowerCase();
  return normalizedValue && isSupportedLanguage(normalizedValue)
    ? normalizedValue
    : DEFAULT_LANGUAGE;
};

let initializedLanguage: SupportedLanguage | null = null;
let pendingLanguage: SupportedLanguage | null = null;
let pendingInitialization: Promise<SupportedLanguage> | null = null;

const loadCatalog = async (
  language: SupportedLanguage,
): Promise<TranslationCatalog> => {
  const module = await localeLoaders[language]();
  return module.default;
};

export const initializeTranslations = async (
  language: SupportedLanguage = DEFAULT_LANGUAGE,
): Promise<SupportedLanguage> => {
  if (initializedLanguage === language) {
    return language;
  }

  if (pendingLanguage === language && pendingInitialization) {
    return await pendingInitialization;
  }

  pendingLanguage = language;
  pendingInitialization = (async () => {
    const messages = await loadCatalog(language);

    if (i18next.isInitialized) {
      i18next.addResourceBundle(language, 'translation', messages, true, true);
      await i18next.changeLanguage(language);
    } else {
      await i18next.use(initReactI18next).init({
        defaultNS: 'translation',
        fallbackLng: false,
        interpolation: {
          escapeValue: false,
        },
        lng: language,
        ns: ['translation'],
        parseMissingKeyHandler: (key) => `[missing:${key}]`,
        resources: {
          [language]: {
            translation: messages,
          },
        },
        returnNull: false,
      });
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }

    initializedLanguage = language;
    return language;
  })();

  try {
    return await pendingInitialization;
  } finally {
    if (pendingLanguage === language) {
      pendingLanguage = null;
      pendingInitialization = null;
    }
  }
};

export const translate = (key: string, options?: TOptions): string =>
  i18next.isInitialized ? i18next.t(key, options) : key;

export const useTranslation = () => useReactI18nextTranslation();
