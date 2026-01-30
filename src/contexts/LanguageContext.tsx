import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { languages, LanguageCode } from '@/i18n/config';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguageState] = useState<LanguageCode>(
    (i18n.language as LanguageCode) || 'en'
  );

  const setLanguage = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    setLanguageState(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  useEffect(() => {
    const currentLang = (i18n.language?.split('-')[0] as LanguageCode) || 'en';
    const validLang = languages[currentLang] ? currentLang : 'en';
    setLanguageState(validLang);
  }, [i18n.language]);

  useEffect(() => {
    const dir = languages[language].dir;
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    
    // Update font family based on language
    if (language === 'ar') {
      document.documentElement.style.setProperty('--font-body', '"IBM Plex Sans Arabic", sans-serif');
    } else {
      document.documentElement.style.setProperty('--font-body', '"Inter", sans-serif');
    }
  }, [language]);

  const dir = languages[language].dir;
  const isRTL = dir === 'rtl';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
