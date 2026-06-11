import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Briefcase, Percent, Wallet } from "lucide-react";
import {
  COMBOS,
  comboCitiesForProfession,
  comboExists,
  getCity,
  getProfession,
} from "@/lib/seo/catalog";
import {
  buildProfessionFaq,
  getProfessionLanding,
} from "@/lib/seo/landing-data";
import { VacancyRow } from "@/components/vakansii/vacancy-row";
import { LandingFaq } from "@/components/vakansii/landing-faq";
import { Button } from "@/components/ui/button";

export const revalidate = 21600; // 6h ISR
// Only the curated allowlist (COMBOS) gets pages — everything else 404s. This
// hard-caps the page count (no hundreds of thin combos).
export const dynamicParams = false;

const SITE = "https://jobswiper.ru";
const rub = new Intl.NumberFormat("ru-RU");

export function generateStaticParams() {
  return COMBOS.map((c) => ({ profession: c.profession, city: c.city }));
}

type Params = { params: Promise<{ profession: string; city: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { profession, city } = await params;
  const prof = getProfession(profession);
  const town = getCity(city);
  if (!prof || !town) return {};

  const data = await getProfessionLanding(prof, town.areaId);
  const title = `Вакансии ${prof.genitive} ${town.prepositional} — ${rub.format(data.found)} вакансий | JobSwiper`;
  const description = `${rub.format(data.found)} вакансий ${prof.genitive} ${town.prepositional}. JobSwiper подберёт подходящие по вашему резюме, оценит совпадение и поможет с откликом.`;
  const canonical = `/vakansii/${prof.slug}/${town.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: data.indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

function salaryHeadline(
  from: number | null,
  to: number | null,
  median: number | null,
): string {
  if (median != null) return `~${rub.format(median)} ₽`;
  if (from != null && to != null) return `${rub.format(from)}–${rub.format(to)} ₽`;
  if (from != null) return `от ${rub.format(from)} ₽`;
  if (to != null) return `до ${rub.format(to)} ₽`;
  return "—";
}

export default async function Page({ params }: Params) {
  const { profession, city } = await params;
  const prof = getProfession(profession);
  const town = getCity(city);
  if (!prof || !town || !comboExists(profession, city)) notFound();

  const data = await getProfessionLanding(prof, town.areaId);
  const faq = buildProfessionFaq(prof, data, town);
  const otherCities = comboCitiesForProfession(prof.slug).filter(
    (c) => c.slug !== town.slug,
  );
  const canonical = `${SITE}/vakansii/${prof.slug}/${town.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Вакансии", item: `${SITE}/vakansii` },
          {
            "@type": "ListItem",
            position: 3,
            name: `Вакансии ${prof.genitive}`,
            item: `${SITE}/vakansii/${prof.slug}`,
          },
          { "@type": "ListItem", position: 4, name: town.name, item: canonical },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `Вакансии ${prof.genitive} ${town.prepositional}`,
        url: canonical,
        description: `${prof.intro} Подборка вакансий ${town.prepositional}.`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: data.items.length,
          itemListElement: data.items.map((v, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: v.alternate_url ?? undefined,
            name: v.name,
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };

  const stats = [
    { icon: Briefcase, label: "Открытых вакансий", value: rub.format(data.found) },
    {
      icon: Wallet,
      label: "Зарплата",
      value: salaryHeadline(data.salary.from, data.salary.to, data.salary.median),
    },
    ...(data.remoteShare != null && data.remoteShare > 0
      ? [
          {
            icon: Percent,
            label: "Удалёнка",
            value: `${Math.round(data.remoteShare * 100)}%`,
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <div className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground" aria-label="Хлебные крошки">
          <Link href="/" className="hover:text-foreground hover:underline">
            Главная
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/vakansii" className="hover:text-foreground hover:underline">
            Вакансии
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/vakansii/${prof.slug}`}
            className="hover:text-foreground hover:underline"
          >
            {prof.nominative}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{town.name}</span>
        </nav>

        {/* Hero */}
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
            Вакансии {prof.genitive} {town.prepositional}
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            {prof.intro} JobSwiper подберёт подходящие вакансии {town.prepositional}{" "}
            по вашему резюме, оценит совпадение и поможет откликнуться с
            сопроводительным письмом.
          </p>
          <div>
            <Button
              className="h-11 rounded-full bg-gradient-brand px-6 font-bold"
              nativeButton={false}
              render={<Link href="/profile" />}
            >
              Подобрать вакансии по резюме
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </header>

        {/* Stats */}
        <section
          aria-label="Статистика по вакансиям"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <span className="mb-2 grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Icon className="size-4.5" />
              </span>
              <p className="text-xl font-black text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        {/* Listings */}
        {data.items.length > 0 && (
          <section aria-label="Список вакансий" className="flex flex-col gap-3">
            <h2 className="text-xl font-black text-foreground">
              Свежие вакансии {prof.genitive} {town.prepositional}
            </h2>
            <div className="grid gap-3">
              {data.items.map((v) => (
                <VacancyRow key={v.id} v={v} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Данные о вакансиях предоставлены hh.ru и обновляются автоматически.
            </p>
          </section>
        )}

        {/* FAQ */}
        <section aria-label="Частые вопросы" className="flex flex-col gap-4">
          <h2 className="text-xl font-black text-foreground">
            Частые вопросы о вакансиях {prof.genitive} {town.prepositional}
          </h2>
          <LandingFaq items={faq} />
        </section>

        {/* Internal links */}
        <section aria-label="Ещё вакансии" className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">Ещё вакансии</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/vakansii/${prof.slug}`}
              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-violet-300 hover:text-violet-700"
            >
              Вакансии {prof.genitive} по всей России
            </Link>
            {otherCities.map((c) => (
              <Link
                key={c.slug}
                href={`/vakansii/${prof.slug}/${c.slug}`}
                className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-violet-300 hover:text-violet-700"
              >
                {prof.nominative} {c.prepositional}
              </Link>
            ))}
            <Link
              href="/vakansii"
              className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Все профессии →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
