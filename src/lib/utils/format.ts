export function formatCurrency(
  amount: number,
  currency: string = "KRW"
): string {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  date: string | Date,
  locale: string = "ko"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeMap: Record<string, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    zh: "zh-CN",
  };
  return new Intl.DateTimeFormat(localeMap[locale] || "ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(
  date: string | Date,
  locale: string = "ko"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeMap: Record<string, string> = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    zh: "zh-CN",
  };
  return new Intl.DateTimeFormat(localeMap[locale] || "ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
