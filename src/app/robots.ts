import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/company/reports/", "/company/settings/"],
      },
    ],
    sitemap: "https://listentips.com/sitemap.xml",
  };
}
