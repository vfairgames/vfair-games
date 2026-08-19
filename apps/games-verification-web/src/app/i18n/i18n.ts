import type { VerificationLanguage } from '../bootstrap/bootstrap-verification-settings';
import en from './locales/en.json';
import ru from './locales/ru.json';

type MessageKey = keyof typeof en;

const catalogs: Record<VerificationLanguage, Record<MessageKey, string>> = {
  en,
  ru,
};

export const createTranslator = (lang: VerificationLanguage) => {
  const catalog = catalogs[lang] ?? catalogs.en;

  return (key: MessageKey): string => catalog[key] ?? catalogs.en[key] ?? key;
};
