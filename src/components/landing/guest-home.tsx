"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MailCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const proofPoints = [
  "Лучшие вакансии первыми",
  "ИИ-подбор под ваше резюме",
  "Письмо под вакансию",
];

const benefits = [
  {
    icon: Target,
    title: "Вакансии по смыслу резюме",
    text: "Сервис сравнивает опыт, навыки и требования, чтобы первыми показать самые подходящие варианты.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Карточки без лишнего шума",
    text: "В ленте сразу видно роль, зарплату, формат, город и почему вакансия подходит или не подходит.",
  },
  {
    icon: MailCheck,
    title: "Сопроводительное письмо",
    text: "ИИ берёт конкретную вакансию и ваше резюме, чтобы подготовить короткий отклик по делу.",
  },
] as const;

const steps = [
  "Загрузите резюме",
  "Получите подборку",
  "Откликайтесь с письмом",
] as const;

function ProductPreview() {
  return (
    <section
      aria-label="Превью продукта"
      className="border-y border-border/60 bg-white/72 px-4 py-5 shadow-[0_24px_70px_oklch(0.58_0.2_290_/_0.09)] backdrop-blur sm:px-6"
    >
      <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr] sm:items-stretch">
        <article className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl border border-border bg-muted/45">
                <BriefcaseBusiness className="size-5 text-violet-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Менеджер по продукту</p>
                <p className="text-xs text-muted-foreground">Москва · гибрид · 2 дня назад</p>
              </div>
            </div>
            <div className="grid size-12 place-items-center rounded-full border-[6px] border-emerald-100 border-r-emerald-400 text-sm font-black text-emerald-600">
              82
            </div>
          </div>

          <h2 className="text-2xl font-black leading-tight tracking-normal text-foreground">
            Подходит под ваш опыт в стратегии и запуске продуктов
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Совпали навыки: исследования, позиционирование, аналитика и работа с командой продаж.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Стратегия", "Исследования", "B2B", "Аналитика"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-muted/55 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-700">
            <WandSparkles className="size-4" />
            AI-письмо
          </div>
          <p className="text-sm leading-6 text-foreground">
            Имею опыт в анализе рынка, формировании позиционирования и подготовке материалов для запуска продуктов. Работал с исследованиями, сегментами аудитории и аргументацией ценности для продаж.
          </p>
          <div className="mt-4 rounded-xl border border-violet-200 bg-background/85 p-3 text-xs text-muted-foreground">
            Письмо собирается из конкретной вакансии и вашего резюме, без выдуманных фактов.
          </div>
        </article>
      </div>
    </section>
  );
}

export function GuestHome() {
  return (
    <div className="flex flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_48%,#f3fffb_100%)]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/45 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <BrandMark />
        <Button
          variant="outline"
          className="h-9 rounded-full px-4"
          nativeButton={false}
          render={<Link href="/profile" />}
        >
          Войти
        </Button>
      </header>

      <section className="px-4 pb-5 pt-7 sm:px-6 sm:pb-7 sm:pt-9">
        <div className="mx-auto flex max-w-xl flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-violet-700">
            <Sparkles className="size-3.5" />
            ИИ-подбор вакансий
          </div>

          <div className="space-y-3">
            <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-normal text-foreground sm:text-5xl">
              Вакансии, которые подходят именно вам
            </h1>
            <p className="max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Загрузите резюме — JobSwiper оценит совпадение, покажет лучшие вакансии и подготовит сопроводительное письмо.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              className="h-12 rounded-full bg-gradient-brand px-6 text-base font-bold shadow-[0_16px_34px_oklch(0.58_0.22_292_/_0.28)]"
              nativeButton={false}
              render={<Link href="/profile" />}
            >
              Начать бесплатно
              <ArrowRight className="size-4" />
            </Button>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Как это работает
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            {proofPoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ProductPreview />

      <section id="how-it-works" className="px-4 py-7 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-border/70 bg-background/78 p-4 shadow-sm"
            >
              <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Icon className="size-5" />
              </span>
              <h2 className="text-base font-bold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6">
        <div className="rounded-[1.4rem] border border-border/70 bg-background/82 p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="size-4 text-violet-600" />
            Первый отклик за несколько минут
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl bg-muted/55 px-3 py-3 text-sm font-semibold text-foreground"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background text-xs font-black text-violet-700">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
          <Button
            className="mt-4 h-11 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            nativeButton={false}
            render={<Link href="/profile" />}
          >
            Перейти к резюме
            <BadgeCheck className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
