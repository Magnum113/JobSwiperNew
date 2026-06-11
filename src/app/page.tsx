import type { Metadata } from "next";
import HomeClient from "@/components/home/home-client";
import { faqItems } from "@/components/landing/seo-content";

const title = "JobSwiper — ИИ-подбор вакансий по резюме";
const description =
  "JobSwiper подбирает релевантные вакансии по резюме, оценивает совпадение и помогает откликнуться с персональным сопроводительным письмом.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "JobSwiper",
        url: "https://jobswiper.ru/",
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
      },
      {
        "@type": "WebSite",
        name: "JobSwiper",
        url: "https://jobswiper.ru/",
        description,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomeClient />
    </>
  );
}
