export type Locale = "az" | "en" | "ru";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "az", label: "Azərbaycan", flag: "🇦🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export { LanguageProvider, useTranslation } from "./language-context";
export type { TranslationKey } from "./locales/az";
