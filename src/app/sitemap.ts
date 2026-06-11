import type { MetadataRoute } from "next";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.3,
  }));
}
