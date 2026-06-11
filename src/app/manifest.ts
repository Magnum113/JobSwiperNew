import type { MetadataRoute } from "next";

// Web App Manifest → served at /manifest.webmanifest; Next auto-adds the
// <link rel="manifest"> in <head>. Icons live in public/ (see scripts/gen-icons.cjs).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobSwiper — ИИ-подбор вакансий по резюме",
    short_name: "JobSwiper",
    description:
      "ИИ подбирает релевантные вакансии по резюме, оценивает совпадение и помогает откликнуться с персональным сопроводительным письмом.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
