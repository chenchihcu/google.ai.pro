/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationDictionary } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
}

const dictionaries: Record<Language, TranslationDictionary> = {
  zh,
  en,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

function getInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') {
      return saved;
    }
    // Check browser preference: if Chinese, use zh, otherwise default to zh as primary app locale or en
    if (navigator.language && navigator.language.toLowerCase().startsWith('en')) {
      return 'en';
    }
  }
  return 'zh';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-TW' : 'en';
      document.title =
        language === 'zh'
          ? '動態流體分析儀表板 - Animated Flow Analytics'
          : 'Animated Flow Analytics Dashboard';
    }
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: dictionaries[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
