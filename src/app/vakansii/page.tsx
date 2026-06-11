import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORY_ORDER, PROFESSIONS } from "@/lib/seo/catalog";
import { Button } from "@/components/ui/button";

const SITE = "https://jobswiper.ru";

const title = "Вакансии по профессиям — подбор по резюме с ИИ | JobSwiper";
const description =
  "Каталог профессий: IT, маркетинг, аналитика, дизайн, продажи, финансы. JobSwiper подбирает вакансии по вашему резюме и оценивает совпадение.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/vakansii" },
  openGraph: { title, description, url: "/vakansii", type: "website" },
};

export default function VakansiiHubPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Вакансии", item: `${SITE}/vakansii` },
        ],
      },
      {
        "@type": "CollectionPage",
        name: "Вакансии по профессиям",
        url: `${SITE}/vakansii`,
        description,
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

      <div className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
            Вакансии по профессиям
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            Выберите профессию — JobSwiper подберёт подходящие вакансии по вашему
            резюме, покажет процент совпадения и поможет откликнуться с
            сопроводительным письмом.
          </p>
          <div>
            <Button
              className="h-11 rounded-full bg-gradient-brand px-6 font-bold"
              nativeButton={false}
              render={<Link href="/profile" />}
            >
              Загрузить резюме
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </header>

        {CATEGORY_ORDER.map((category) => {
          const items = PROFESSIONS.filter((p) => p.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-foreground">{category}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/vakansii/${p.slug}`}
                    className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm transition-colors hover:border-violet-300 hover:bg-accent/40"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      Вакансии {p.genitive}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
