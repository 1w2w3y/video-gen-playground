import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zh from './zh.json';

const supportedLangs = ['en', 'zh'];

function detectLang(): string {
  // 1. User's explicit choice
  const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
  if (saved && supportedLangs.includes(saved)) return saved;

  // 2. Browser language (e.g. "zh-CN" → "zh", "en-US" → "en")
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const prefix = lang.split('-')[0];
      if (supportedLangs.includes(prefix)) return prefix;
    }
  }

  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLang(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
