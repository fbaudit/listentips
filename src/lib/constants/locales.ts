export const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh"] as const;

export const LOCALE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

export const COUNTRY_TO_LOCALE: Record<string, string> = {
  KR: "ko",
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  JP: "ja",
  CN: "zh",
  TW: "zh",
  HK: "zh",
};

export const DEFAULT_LOCALE = "ko";
