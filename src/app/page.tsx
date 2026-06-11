import type { Metadata } from "next";
import HomeClient from "@/components/home/home-client";

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
  return <HomeClient />;
}
