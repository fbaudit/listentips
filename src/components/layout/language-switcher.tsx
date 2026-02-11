"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_NAMES } from "@/lib/constants/locales";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(newLocale: string) {
    // Remove current locale prefix and add new one
    const segments = pathname.split("/");
    const locales = Object.keys(LOCALE_NAMES);
    if (locales.includes(segments[1])) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join("/"));
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[100px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LOCALE_NAMES).map(([code, name]) => (
          <SelectItem key={code} value={code} className="text-xs">
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
