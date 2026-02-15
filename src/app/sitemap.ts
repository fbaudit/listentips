import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://listentips.com";
  const locales = ["", "en", "ja", "zh"];
  const pages = [""];

  return locales.flatMap((locale) =>
    pages.map((page) => {
      const path = [locale, page].filter(Boolean).join("/");
      return {
        url: path ? `${baseUrl}/${path}` : baseUrl,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: page === "" ? 1.0 : 0.8,
      };
    })
  );
}
