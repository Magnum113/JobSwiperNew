// Curated catalog driving the programmatic SEO landing pages (/vakansii/[slug]).
// Hand-picked for product fit (knowledge/office roles where AI matching + cover
// letters add value) — NOT high-volume blue-collar roles that don't convert.
//
// `query` maps each profession to hh.ru search params:
//   - professionalRole: ids from GET https://api.hh.ru/professional_roles
//   - text: free-text query, used where hh.ru has no dedicated role (e.g. the
//     single role 96 "Программист, разработчик" can't separate Frontend/Backend).
// Grammar fields give natural Russian titles: "Вакансии {genitive}".
//
// Keep this list ≤ ~30 entries for now: one static page is generated per slug.

export type ProfessionCategory =
  | "IT и данные"
  | "Продукт и проекты"
  | "Маркетинг"
  | "Дизайн"
  | "Продажи и HR"
  | "Финансы и право";

export interface Profession {
  /** URL slug (latin), e.g. "marketolog" → /vakansii/marketolog */
  slug: string;
  /** Nominative, for cards/breadcrumbs: "Маркетолог" */
  nominative: string;
  /** Genitive, for "Вакансии {genitive}": "маркетолога" */
  genitive: string;
  category: ProfessionCategory;
  /** hh.ru search mapping. */
  query: { professionalRole?: string[]; text?: string };
  /** 1–2 unique sentences — real copy, lowers doorway-page risk. */
  intro: string;
}

export const PROFESSIONS: Profession[] = [
  // ── IT и данные ────────────────────────────────────────────────────────────
  {
    slug: "programmist",
    nominative: "Программист",
    genitive: "программиста",
    category: "IT и данные",
    query: { professionalRole: ["96"] },
    intro:
      "Программист проектирует и пишет код, развивает продукты и сервисы. Это одна из самых востребованных и высокооплачиваемых профессий на российском рынке.",
  },
  {
    slug: "frontend-razrabotchik",
    nominative: "Frontend-разработчик",
    genitive: "Frontend-разработчика",
    category: "IT и данные",
    query: { text: "Frontend разработчик" },
    intro:
      "Frontend-разработчик отвечает за интерфейс продукта: вёрстку, логику на JavaScript/TypeScript и работу с React, Vue или Angular.",
  },
  {
    slug: "backend-razrabotchik",
    nominative: "Backend-разработчик",
    genitive: "Backend-разработчика",
    category: "IT и данные",
    query: { text: "Backend разработчик" },
    intro:
      "Backend-разработчик отвечает за серверную логику, базы данных и API. Ключевая роль в любой продуктовой команде.",
  },
  {
    slug: "python-razrabotchik",
    nominative: "Python-разработчик",
    genitive: "Python-разработчика",
    category: "IT и данные",
    query: { text: "Python разработчик" },
    intro:
      "Python-разработчик создаёт бэкенд, автоматизацию и решения для анализа данных и ML. Python стабильно в топе спроса.",
  },
  {
    slug: "tester-qa",
    nominative: "Тестировщик (QA)",
    genitive: "тестировщика",
    category: "IT и данные",
    query: { professionalRole: ["124"] },
    intro:
      "Тестировщик проверяет качество продукта: ручное и автоматизированное тестирование, поиск дефектов и контроль релизов.",
  },
  {
    slug: "devops-inzhener",
    nominative: "DevOps-инженер",
    genitive: "DevOps-инженера",
    category: "IT и данные",
    query: { professionalRole: ["160"] },
    intro:
      "DevOps-инженер автоматизирует сборку, деплой и инфраструктуру, отвечает за CI/CD и надёжность сервисов.",
  },
  {
    slug: "analitik-dannyh",
    nominative: "Аналитик данных",
    genitive: "аналитика данных",
    category: "IT и данные",
    query: { professionalRole: ["156"] },
    intro:
      "Аналитик данных собирает и интерпретирует данные, строит дашборды и помогает бизнесу принимать решения на основе цифр.",
  },
  {
    slug: "sistemnyy-analitik",
    nominative: "Системный аналитик",
    genitive: "системного аналитика",
    category: "IT и данные",
    query: { professionalRole: ["148"] },
    intro:
      "Системный аналитик описывает требования, проектирует интеграции и связывает бизнес-задачи с технической реализацией.",
  },
  {
    slug: "biznes-analitik",
    nominative: "Бизнес-аналитик",
    genitive: "бизнес-аналитика",
    category: "IT и данные",
    query: { professionalRole: ["150"] },
    intro:
      "Бизнес-аналитик исследует процессы, формализует требования и помогает командам строить нужные продукты.",
  },
  {
    slug: "data-scientist",
    nominative: "Data Scientist",
    genitive: "Data Scientist",
    category: "IT и данные",
    query: { professionalRole: ["165"] },
    intro:
      "Data Scientist строит модели машинного обучения, работает с большими данными и решает прикладные задачи прогнозирования.",
  },
  {
    slug: "sistemnyy-administrator",
    nominative: "Системный администратор",
    genitive: "системного администратора",
    category: "IT и данные",
    query: { professionalRole: ["113"] },
    intro:
      "Системный администратор поддерживает ИТ-инфраструктуру компании: серверы, сети, доступы и работоспособность сервисов.",
  },

  // ── Продукт и проекты ───────────────────────────────────────────────────────
  {
    slug: "product-manager",
    nominative: "Менеджер по продукту",
    genitive: "менеджера по продукту",
    category: "Продукт и проекты",
    query: { professionalRole: ["73"] },
    intro:
      "Менеджер по продукту отвечает за стратегию, приоритеты и развитие продукта — от исследований до запуска и метрик.",
  },
  {
    slug: "project-manager",
    nominative: "Менеджер проектов",
    genitive: "менеджера проектов",
    category: "Продукт и проекты",
    query: { professionalRole: ["107"] },
    intro:
      "Менеджер проектов планирует работы, координирует команду и сроки, доводит проекты до результата в рамках бюджета.",
  },

  // ── Маркетинг ───────────────────────────────────────────────────────────────
  {
    slug: "marketolog",
    nominative: "Маркетолог",
    genitive: "маркетолога",
    category: "Маркетинг",
    query: { professionalRole: ["68"] },
    intro:
      "Маркетолог отвечает за привлечение клиентов, продвижение и аналитику каналов — от стратегии до конкретных кампаний.",
  },
  {
    slug: "smm-menedzher",
    nominative: "SMM-менеджер",
    genitive: "SMM-менеджера",
    category: "Маркетинг",
    query: { professionalRole: ["3"] },
    intro:
      "SMM-менеджер ведёт соцсети бренда: контент-план, тексты, визуал и работа с вовлечённостью аудитории.",
  },
  {
    slug: "kopirayter",
    nominative: "Копирайтер",
    genitive: "копирайтера",
    category: "Маркетинг",
    query: { professionalRole: ["55"] },
    intro:
      "Копирайтер создаёт тексты для сайтов, рассылок, рекламы и соцсетей, помогая бренду доносить ценность.",
  },
  {
    slug: "menedzher-marketpleysov",
    nominative: "Менеджер маркетплейсов",
    genitive: "менеджера маркетплейсов",
    category: "Маркетинг",
    query: { professionalRole: ["182"] },
    intro:
      "Менеджер маркетплейсов развивает продажи на Wildberries, Ozon и других площадках: карточки, аналитика, продвижение.",
  },
  {
    slug: "pr-menedzher",
    nominative: "PR-менеджер",
    genitive: "PR-менеджера",
    category: "Маркетинг",
    query: { professionalRole: ["2"] },
    intro:
      "PR-менеджер выстраивает репутацию и коммуникации бренда: работа со СМИ, инфоповоды и публичный образ компании.",
  },

  // ── Дизайн ──────────────────────────────────────────────────────────────────
  {
    slug: "ux-ui-dizayner",
    nominative: "UX/UI-дизайнер",
    genitive: "UX/UI-дизайнера",
    category: "Дизайн",
    query: { text: "UX/UI дизайнер" },
    intro:
      "UX/UI-дизайнер проектирует удобные интерфейсы: исследования, прототипы, визуальный стиль и забота о пользователе.",
  },
  {
    slug: "dizayner",
    nominative: "Дизайнер",
    genitive: "дизайнера",
    category: "Дизайн",
    query: { professionalRole: ["34"] },
    intro:
      "Дизайнер создаёт графику, макеты и визуальные решения для продуктов, рекламы и брендов.",
  },

  // ── Продажи и HR ────────────────────────────────────────────────────────────
  {
    slug: "menedzher-po-prodazham",
    nominative: "Менеджер по продажам",
    genitive: "менеджера по продажам",
    category: "Продажи и HR",
    query: { professionalRole: ["70"] },
    intro:
      "Менеджер по продажам работает с клиентами и сделками: переговоры, воронка, выполнение плана и развитие базы.",
  },
  {
    slug: "hr-menedzher",
    nominative: "HR-менеджер",
    genitive: "HR-менеджера",
    category: "Продажи и HR",
    query: { professionalRole: ["69"] },
    intro:
      "HR-менеджер отвечает за подбор, адаптацию и развитие сотрудников, а также за HR-процессы компании.",
  },
  {
    slug: "rekruter",
    nominative: "Рекрутер",
    genitive: "рекрутера",
    category: "Продажи и HR",
    query: { professionalRole: ["118"] },
    intro:
      "Рекрутер ищет и оценивает кандидатов, ведёт воронку найма и закрывает вакансии под потребности команд.",
  },

  // ── Финансы и право ─────────────────────────────────────────────────────────
  {
    slug: "buhgalter",
    nominative: "Бухгалтер",
    genitive: "бухгалтера",
    category: "Финансы и право",
    query: { professionalRole: ["18"] },
    intro:
      "Бухгалтер ведёт учёт, отчётность и расчёты, обеспечивая финансовую дисциплину и соответствие требованиям.",
  },
  {
    slug: "finansovy-analitik",
    nominative: "Финансовый аналитик",
    genitive: "финансового аналитика",
    category: "Финансы и право",
    query: { professionalRole: ["134"] },
    intro:
      "Финансовый аналитик строит модели, прогнозы и отчётность, помогая бизнесу планировать и оценивать решения.",
  },
  {
    slug: "yurist",
    nominative: "Юрист",
    genitive: "юриста",
    category: "Финансы и право",
    query: { professionalRole: ["146"] },
    intro:
      "Юрист сопровождает договоры, споры и комплаенс, защищая интересы компании в правовом поле.",
  },
];

/** Category display order for the hub page and grouping. */
export const CATEGORY_ORDER: ProfessionCategory[] = [
  "IT и данные",
  "Продукт и проекты",
  "Маркетинг",
  "Дизайн",
  "Продажи и HR",
  "Финансы и право",
];

const BY_SLUG = new Map(PROFESSIONS.map((p) => [p.slug, p]));

export function getProfession(slug: string): Profession | undefined {
  return BY_SLUG.get(slug);
}

/** Same-category siblings for the internal-link cluster. */
export function relatedProfessions(prof: Profession, limit = 6): Profession[] {
  const sameCat = PROFESSIONS.filter(
    (p) => p.category === prof.category && p.slug !== prof.slug,
  );
  if (sameCat.length >= limit) return sameCat.slice(0, limit);
  // Top up with other professions so the cluster is never thin.
  const others = PROFESSIONS.filter(
    (p) => p.category !== prof.category && p.slug !== prof.slug,
  );
  return [...sameCat, ...others].slice(0, limit);
}
