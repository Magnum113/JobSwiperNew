import type { Metadata } from "next";
import LikedPageClient from "@/components/liked/liked-page-client";

export const metadata: Metadata = {
  title: "Мои отклики | JobSwiper",
  description:
    "Личная страница откликов и сопроводительных писем JobSwiper.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LikedPage() {
  return <LikedPageClient />;
}
