// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface I18nContextType {
  locale: string;
  translations: Record<string, string>;
  languages: { code: string; name: string; native_name?: string }[];
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  translations: {},
  languages: [],
  setLocale: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  isLoading: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<{ code: string; name: string; native_name?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTranslations = useCallback(async (loc: string) => {
    setIsLoading(true);
    try {
      const trans = await api.getTranslations(loc);
      setTranslations(trans || {});
    } catch (error) {
      logger.error("Failed to load translations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setLocale = useCallback(async (newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem("nexus-locale", newLocale);
    await loadTranslations(newLocale);
    try {
      await api.setLanguagePreference(newLocale);
    } catch (error) {
      logger.error("Failed to save language preference:", error);
    }
  }, [loadTranslations]);

  const t = useCallback((key: string, fallback?: string) => {
    return translations[key] || fallback || key;
  }, [translations]);

  useEffect(() => {
    const savedLocale = localStorage.getItem("nexus-locale") || "en";
    setLocaleState(savedLocale);
    loadTranslations(savedLocale);
    api.getSupportedLanguages().then((langs) => setLanguages(langs || [])).catch(() => {});
  }, [loadTranslations]);

  return (
    <I18nContext.Provider value={{ locale, translations, languages, setLocale, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
