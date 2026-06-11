import type { MetadataRoute } from "next";
import { PROFESSIONS } from "@/lib/seo/catalog";

const SITE_URL = "https://jobswiper.ru";

const publicRoutes = [
  "/",
  "/legal",
  "/legal/offer",
  "/legal/privacy",
  "/legal/refund",
  "/legal/contacts",
  "/legal/personal-data",
] as const;

// Fixed content-update date (not `new Date()`): a sitemap that reports "now" on
// every request looks untrustworthy to crawlers. Bump this when public-page
// content meaningfully changes.
const lastModified = new Date("2026-06-11");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    // Root uses SITE_URL with no trailing slash to match the canonical tag
    // (`https://jobswiper.ru`); other routes append their path.
    url: route === "/" ? SITE_URL : `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.3,
  }));

  // SEO landing hub + one page per curated profession. Listings refresh often,
  // so a higher change frequency and priority than the legal pages.
  const landingEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/vakansii`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...PROFESSIONS.map((p) => ({
      url: `${SITE_URL}/vakansii/${p.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  return [...staticEntries, ...landingEntries];
}
