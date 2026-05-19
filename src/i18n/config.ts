import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import frTranslations from './locales/fr.json';
import enTranslations from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: frTranslations },
      en: { translation: enTranslations }
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  }, (err) => {
    if (err) {
      console.error("[i18n] Initialization failed (callback):", err);
    } else {
      console.log("[i18n] System Ready:", i18n.language);
    }
  });

export default i18n;
