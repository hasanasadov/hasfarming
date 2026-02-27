"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { az } from "./locales/az";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import type { Locale } from "./index";
import type { TranslationKey } from "./locales/az";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  az,
  en,
  ru,
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "barakat-lang";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "az";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "az" || stored === "en" || stored === "ru") return stored;
  } catch {
    // ignore
  }
  return "az";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("az");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    document.documentElement.lang = next;
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return dictionaries[locale][key] ?? dictionaries.az[key] ?? key;
    },
    [locale],
  );

  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ locale: "az", setLocale, t }}>
        <div suppressHydrationWarning>{children}</div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be inside LanguageProvider");
  return ctx;
}
