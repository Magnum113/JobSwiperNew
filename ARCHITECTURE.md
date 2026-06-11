# JobSwiper — техническая документация

Полное описание проекта: стек, библиотеки, архитектура, логика работы и все важные
нюансы для разработки. Для краткого обзора возможностей см. [README.md](README.md).

---

## 1. Что это за проект

**JobSwiper** — «Tinder для вакансий с hh.ru». Пользователь:

1. Добавляет резюме (текстом или файлом PDF/DOCX) в личном кабинете.
2. ИИ разбирает резюме → определяет профессию, навыки, уровень, опыт.
3. На главной появляется лента вакансий с hh.ru, подобранных под профессию.
4. Для каждой карточки ИИ заранее считает **% соответствия** резюме ↔ вакансия.
5. Свайп вправо («Откликнуться») → вакансия попадает в «Отклики», и ИИ пишет
   персональное **сопроводительное письмо** под неё.
6. В «Откликах» письмо можно скопировать и перейти на hh.ru для отклика.
7. Дополнительно: можно вставить текст **произвольной вакансии** (не из hh.ru) и
   получить под неё письмо.

Авторизация через Google реализована на Supabase Auth (`@supabase/ssr`, PKCE,
cookie-сессия). Яндекс реализован отдельным серверным OAuth2 + PKCE flow:
приложение само обменивает `code` на токен Яндекса, получает профиль через
`login.yandex.ru/info` и ставит подписанную httpOnly app-session cookie.

---

## 2. Технологический стек

| Слой | Технология | Зачем |
|---|---|---|
| Фреймворк | **Next.js 16** (App Router, Turbopack) | SSR + API-роуты (прячут ключи на сервере, обходят CORS) |
| Язык | **TypeScript 5** | типобезопасность |
| UI-рантайм | **React 19** | — |
| Стили | **Tailwind CSS v4** | utility-стили, CSS-токены темы |
| Компоненты | **shadcn/ui (стиль `base-nova`)** на **Base UI** (`@base-ui/react`) | доступные примитивы |
| Анимации/свайпы | **motion** (Framer Motion v12) | drag-жесты колоды |
| Стейт | **Zustand** | клиентское состояние (зеркало БД в памяти) |
| База данных | **Supabase** (Postgres) + `@supabase/supabase-js` + `@supabase/ssr` | хранение данных и Auth через Google |
| Данные/кэш | **TanStack Query** (`@tanstack/react-query`) | загрузка вакансий с hh.ru, кэш |
| Аналитика | **Yandex Metrika** | счётчик, Webvisor, цели продукта |
| Тема | **next-themes** | светлая/тёмная тема |
| Тосты | **sonner** | уведомления |
| Поиск-комбобокс | **cmdk** | поиск по 14k городов |
| Санитайзер HTML | **dompurify** | безопасный рендер описаний вакансий |
| Извлечение текста | **unpdf** (PDF), **mammoth** (DOCX) | резюме из файлов |
| Иконки | **lucide-react** | — |
| Утилиты | `clsx`, `tailwind-merge`, `class-variance-authority`, `server-only`, `tw-animate-css` | — |

> ⚠️ **Важно:** проект использует **Base UI**, а НЕ Radix. Это меняет API
> компонентов shadcn (см. раздел 12 «Нюансы Base UI»).

Версия Node при разработке — **24** (подойдёт 18+).

---

## 3. Переменные окружения и ключи

Файл **`.env.local`** (читается только на сервере, в браузер не попадает):

```
AITUNNEL_API_KEY=...           # ключ AITunnel (Mistral, ИИ)
HH_CLIENT_ID=...               # OAuth-приложение hh.ru (app-token И вход соискателя)
HH_CLIENT_SECRET=...           # секрет приложения hh.ru
SUPABASE_URL=...               # URL проекта Supabase
SUPABASE_PUBLISHABLE_KEY=...   # publishable-ключ (используется только серверно)
NEXT_PUBLIC_SITE_URL=https://jobswiper.ru  # production URL для OAuth callback
YANDEX_CLIENT_ID=...           # OAuth Client ID приложения Яндекс ID
YANDEX_CLIENT_SECRET=...       # опционально; direct OAuth может работать через PKCE без секрета
YANDEX_SCOPE=...               # опционально; обычно лучше не задавать и брать доступы из приложения
APP_SESSION_SECRET=...         # секрет HMAC для подписанной app-session cookie (Яндекс и hh.ru)
```

Для OAuth:
- в Supabase Auth включён Google Provider с Client ID/Secret;
- в OAuth-приложении Google redirect URI указывает на Supabase callback:
  `https://<project-ref>.supabase.co/auth/v1/callback`;
- в OAuth-приложении Яндекс redirect URI указывает на приложение:
  `https://jobswiper.ru/api/auth/yandex/callback`
  (`http://localhost:3000/api/auth/yandex/callback` для локальной проверки);
- в Supabase Auth Redirect URLs добавлены app callbacks:
  `http://localhost:3000/auth/callback` для dev и `https://jobswiper.ru/auth/callback`
  для production.

`/api/auth/google` строит `redirectTo` из `NEXT_PUBLIC_SITE_URL` / `SITE_URL` /
`APP_URL` / Vercel URL, а только затем из request origin. Это важно за reverse
proxy: иначе OAuth может получить `http://localhost:3000` и Supabase вернёт code
на локальный URL вместо production-домена. `/auth/callback` обменивает Google
`code` на Supabase cookie-сессию и возвращает пользователя на `next`, сохраняя
query `auth=success|error` и `provider=google`.
`AuthCodeBridge` дополнительно подхватывает `?code=...` на клиенте, если внешний
редирект неожиданно пришёл не на `/auth/callback`.

Yandex OAuth:
- `/api/auth/yandex` генерирует `state`, `code_verifier`, `code_challenge` и
  редиректит на `https://oauth.yandex.ru/authorize`;
- `/api/auth/yandex/callback` валидирует `state`, обменивает `code` на токен через
  `https://oauth.yandex.ru/token`, запрашивает профиль через
  `https://login.yandex.ru/info?format=json`;
- токены Яндекса не пишутся в браузер и не логируются;
- `scope` обычно не передаётся: Яндекс выдаёт токен с доступами, выбранными при
  регистрации приложения. Если нужен override, используется `YANDEX_SCOPE`;
- серверные логи помечены `jobswiper_yandex_auth` и содержат request id, этап и
  безопасные признаки ошибки, без code/token/secret/cookie values.

App-токен hh.ru кэшируется в таблице Supabase **`app_tokens`** (строка
`id = 'hh'`). См. раздел 5.

В **localStorage** хранится только анонимный `userId` устройства (ключ
`jobswiper-user-id`). После входа текущая сессия задаёт настоящий `userId`: для
Google это `auth.users.id`, для Яндекса — стабильный UUID из `yandex:<id>`.
Анонимные данные устройства мержатся в аккаунт.

---

## 4. Структура проекта

```
src/
├── app/
│   ├── layout.tsx            # корневой layout: шрифты, Providers, контейнер, нижняя навигация
│   ├── providers.tsx         # ThemeProvider + QueryClientProvider + Toaster
│   ├── globals.css           # токены темы (oklch) + кастомные утилиты
│   ├── page.tsx              # ГЛАВНАЯ — guest-экран или лента-свайпер
│   ├── robots.ts             # robots.txt: закрывает API/auth/profile/liked
│   ├── sitemap.ts            # sitemap.xml для публичных страниц
│   ├── liked/page.tsx        # ОТКЛИКИ — лайки + письма под свои вакансии
│   ├── profile/page.tsx      # КАБИНЕТ — резюме, авторизация, тема
│   └── api/                  # серверные роуты (прокси к hh.ru и AITunnel)
│       ├── vacancies/route.ts        # GET поиск вакансий
│       ├── vacancies/[id]/route.ts   # GET детали вакансии
│       ├── areas/route.ts            # GET регионы/города
│       ├── parse-resume/route.ts     # POST резюме → профиль (ИИ)
│       ├── match/route.ts            # POST батч-оценка % (ИИ)
│       ├── cover-letter/route.ts     # POST сопроводительное письмо (ИИ)
│       ├── extract-resume/route.ts   # POST файл PDF/DOCX → текст
│       ├── auth/                     # Google/Yandex sign-in, session, sign-out
│       └── db/                       # CRUD в Supabase (state/profile/swipe/matches/cover-letter/quota/reset/merge)
│   └── auth/callback/route.ts        # OAuth callback: code → Supabase cookie-session
├── components/
│   ├── auth-code-bridge.tsx  # страховка для OAuth code, пришедшего не на callback path
│   ├── ui/                   # сгенерированные shadcn-примитивы (Base UI)
│   ├── home/home-client.tsx   # клиентская логика главной: auth gate + лента
│   ├── landing/guest-home.tsx # guest landing + SEO-секции для неавторизованных
│   ├── landing/seo-content.ts # текстовые SEO-блоки и FAQ для landing/JSON-LD
│   ├── layout/bottom-nav.tsx # плавающая нижняя навигация (3 вкладки + бейдж)
│   ├── swipe/
│   │   ├── swipe-deck.tsx     # колода: drag, штампы LIKE/NOPE, кнопки, стрелки
│   │   ├── swipe-card.tsx     # визуал карточки вакансии
│   │   └── deck-refill-banner.tsx # CTA над колодой (загрузить ещё/Pro/фильтры)
│   ├── vacancy/vacancy-detail-dialog.tsx  # модалка с полным описанием (ленивый fetch)
│   ├── filters/
│   │   ├── filters-sheet.tsx  # панель фильтров (Sheet снизу)
│   │   └── area-combobox.tsx  # поиск города по 14k записей
│   ├── liked/liked-card.tsx   # карточка отклика (hh.ru) + письмо
│   ├── custom/
│   │   ├── custom-vacancy-sheet.tsx  # форма «своя вакансия → письмо»
│   │   └── custom-letter-card.tsx    # карточка письма под свою вакансию
│   ├── profile/
│   │   ├── auth-buttons.tsx   # Google/Yandex OAuth + выход из аккаунта
│   │   └── resume-form.tsx    # ввод/загрузка резюме + ИИ-анализ
│   ├── paywall/               # пакеты лимитов, лимит-диалог, временный gift +50 откликов
│   ├── brand.tsx              # логотип JobSwiper
│   ├── empty-state.tsx        # переиспользуемое «пусто»
│   ├── employer-logo.tsx      # лого работодателя + фолбэк на инициалы
│   ├── match-ring.tsx         # кольцо % соответствия (SVG)
│   ├── theme-toggle.tsx       # переключатель темы
│   └── store-bootstrap.tsx    # загрузка состояния из Supabase при старте
└── lib/
    ├── hh/
    │   ├── types.ts           # типы hh.ru API
    │   ├── dictionaries.ts     # справочники фильтров (опыт/график/занятость) + города
    │   ├── format.ts          # форматирование зарплаты, очистка HTML/сниппета, даты
    │   ├── client.ts          # серверный клиент hh.ru (поиск/детали/регионы)
    │   └── token.ts           # менеджер app-токена hh.ru (кэш память+Supabase)
    ├── ai/
    │   ├── client.ts          # клиент AITunnel (Mistral) + извлечение JSON
    │   └── prompts.ts         # сборка промптов (резюме/матч/письмо)
    ├── store/use-app-store.ts # Zustand-стор (зеркало БД, синхронизация)
    ├── supabase/
    │   ├── auth.ts            # SSR auth client + verified user id
    │   ├── server.ts          # серверный клиент Supabase (publishable-ключ)
    │   └── queries.ts         # слой запросов к БД (загрузка/сохранение/merge)
    ├── db-sync.ts             # браузерные обёртки к /api/db/* + auth/session bootstrap
    ├── deck-supply.ts         # чистая логика догрузки ленты + выбор CTA (раздел 9.1)
    ├── deck-supply.test.ts    # юнит-тесты deck-supply (node --test)
    ├── analytics.ts           # Yandex Metrika counter + reachGoal helper
    ├── plans.ts               # бесплатные лимиты, тарифы, бонус +50 откликов
    ├── site-url.ts            # production/dev origin для OAuth redirectTo
    ├── hooks/
    │   ├── use-vacancies.ts   # useInfiniteQuery вакансий
    │   ├── use-match-scores.ts# батч-расчёт % для верха колоды
    │   └── use-areas.ts       # загрузка списка городов
    ├── types.ts               # прикладные типы (профиль, матч, письмо, фильтры)
    ├── resume.ts              # сборка контекста резюме для ИИ
    ├── api-client.ts          # браузерные обёртки к нашим /api
    ├── cover-letter.ts        # генерация писем (свайп + своя вакансия)
    ├── match-style.ts         # цвет/подпись по % соответствия
    ├── resume-extract.ts      # серверное извлечение текста из PDF/DOCX
    └── utils.ts               # cn() (clsx + tailwind-merge)
```

Конфиги в корне: `next.config.ts`, `components.json` (shadcn), `tsconfig.json`,
`postcss.config.mjs`, `eslint.config.mjs`. `.claude/launch.json` — для dev-превью.

---

## 4.1. Главная страница и guest-экран

`src/app/page.tsx` — серверная SEO-обёртка с metadata/canonical для главной.
Интерактивная логика главной вынесена в `src/components/home/home-client.tsx`,
который работает в двух режимах:

1. **Неавторизованный пользователь** (`authChecked === true`, `authUser === null`) —
   вместо ленты рендерится `src/components/landing/guest-home.tsx`.
2. **Авторизованный пользователь** — остаётся рабочий сценарий приложения:
   если резюме ещё нет, показывается CTA в кабинет; если резюме есть, загружается
   лента вакансий.

До hydration/auth-check client shell рендерит `GuestHome`. Это важно для SEO:
поисковик и первый HTML получают публичный первый экран с текстом продукта, а
авторизованный пользователь после проверки сессии видит рабочую ленту или CTA
добавления резюме. Гостю не нужно запускать запросы к hh.ru и расчёт матчей,
пока он не вошёл в аккаунт и не добавил резюме. Поэтому флаг `enabled` для
`useVacancies()` требует сразу четыре условия:

```
hydrated && authChecked && !!authUser && !!profile
```

Guest-экран следует product-led SaaS-паттерну: короткий value proposition,
один основной CTA в кабинет, proof chips и визуальное превью продукта с карточкой
вакансии, AI-оценкой и примером сопроводительного письма. Это не отдельный
маркетинговый сайт: он живёт внутри текущего app-shell и ведёт пользователя к
первому практическому действию — авторизации и загрузке резюме.

SEO P0:
- базовые metadata, `metadataBase`, canonical, Open Graph и Twitter metadata
  заданы в `src/app/layout.tsx` и уточняются на главной;
- `src/app/robots.ts` разрешает публичные страницы и закрывает `/api/`,
  `/auth/`, `/profile`, `/liked`;
- `src/app/sitemap.ts` отдаёт только публичные URL;
- `/profile` и `/liked` дополнительно имеют route metadata `robots: noindex,
  nofollow`, потому что это личные app-страницы без стабильного публичного
  поискового контента.

SEO P1 без отдельной `/promo`:
- `src/components/landing/guest-home.tsx` расширен текстовыми блоками ниже
  основного продающего экрана: аудитории, сценарии использования ИИ-подбора,
  доверительные тезисы и FAQ. Первый экран, основной CTA и продуктовый preview
  остаются вверху, чтобы главная не превращалась в SEO-простыню и продолжала
  вести пользователя к авторизации/загрузке резюме.
- Контент для этих блоков хранится в `src/components/landing/seo-content.ts`.
  Этот же массив FAQ используется серверной страницей `src/app/page.tsx` для
  JSON-LD `FAQPage`. Там же добавлена базовая JSON-LD разметка `WebApplication`
  и `WebSite`, поэтому видимый FAQ и структурированные данные не должны
  расходиться.
- `/promo` пока не создаётся и не добавляется в sitemap. Расширенный контент
  индексируется на главной `/`, а sitemap остаётся с публичными legal-страницами
  и корневой страницей.
- Нижний app tabbar скрывается на корневом guest landing, пока нет `authUser`,
  чтобы публичная главная оставалась landing-страницей с одним главным CTA. Для
  авторизованной ленты tabbar появляется после восстановления сессии.

После анализа резюме приложение обновляет поисковый текст фильтров по найденной
профессии, но **не выставляет фильтр опыта автоматически**. `experienceId`
хранится в профиле и показывается в кабинете как результат разбора резюме, но
фильтр опыта остаётся ручным выбором пользователя. Это важно, потому что hh.ru
может размечать вакансии по опыту иначе, чем резюме кандидата, и автофильтр
легко скрывает релевантные вакансии.

---

## 5. Интеграция с hh.ru API

Серверный клиент: [`src/lib/hh/client.ts`](src/lib/hh/client.ts), токен:
[`src/lib/hh/token.ts`](src/lib/hh/token.ts). Базовый URL — `https://api.hh.ru`.

### Обязательный User-Agent
hh.ru требует заголовок `User-Agent` в формате `AppName/Version (контакт)`, иначе
`400`. Используем `JobSwiper/1.0 (kadimagomedovv@gmail.com)`.

### App-токен (ключевой нюанс!)
Анонимный поиск технически открыт, **но** с дата-центровых IP анти-бот hh.ru
(`ddos-guard`) отдаёт `403`. Поэтому получаем **application access token** через
`client_credentials`:

```
POST https://api.hh.ru/token
grant_type=client_credentials&client_id=...&client_secret=...
→ { "access_token": "...", "token_type": "bearer" }
```

Токен **долгоживущий** и hh.ru отказывается выдавать новый слишком рано
(`"app token refresh too early"`). Поэтому он кэшируется:

- **в памяти процесса** (`mem`) и
- **в Supabase** — таблица `app_tokens`, строка `id = 'hh'` (`token`,
  `expires_at`, `cooldown_until`). Это переживает рестарт dev-сервера и, в
  отличие от файла на диске, общее для всех serverless-инстансов на Vercel
  (там ФС эфемерна и не шарится между инстансами).

Логика `getAppToken()`:
1. Есть валидный токен в памяти → отдать.
2. Иначе прочитать строку из `app_tokens`.
3. Иначе запросить новый, записать в память и в Supabase.
4. Если запрос отклонён, но старый токен есть — переиспользовать его.

Колонка `cooldown_until` хранит метку «не запрашивать новый токен раньше N»
(после ошибки `too early` — на 5 минут), раньше это был отдельный файл
`.hh-token-cooldown.json`.

Все запросы идут через `hhGet()`, который добавляет `Authorization: Bearer`. При
`401/403` делается **один** форс-рефреш токена и повтор запроса.

> При первом запуске токен запросится автоматически и сохранится в `app_tokens`.
> RLS таблицы повторяет общий паттерн приложения (политика `anon_all_app_tokens`,
> доступ через publishable-ключ, который используется только на сервере).

### Используемые эндпоинты
| Эндпоинт | Назначение | Заметки |
|---|---|---|
| `GET /vacancies` | поиск | `cache: no-store` |
| `GET /vacancies/{id}` | детали (полное `description` HTML, `key_skills`) | `revalidate: 3600` |
| `GET /areas/113` | дерево регионов России | ~2.8 МБ, см. ниже |
| `POST /token` | app-токен | кэшируется |

### Параметры поиска
`text`, `area`, `salary`+`currency`, `only_with_salary`, `experience[]`,
`employment[]`, `schedule[]`, `order_by`, `per_page` (макс 100, используем 30),
`page` (0-based). Массивы (`experience` и т.д.) передаются повторяющимися параметрами.

### Ограничения и подводные камни
- **Пагинация:** `page * per_page ≤ 2000`. Сборка query учитывает это; `getNextPageParam`
  в [`use-vacancies.ts`](src/lib/hooks/use-vacancies.ts) останавливается на пределе.
- **Регионы 2.8 МБ:** ответ `/areas/113` больше лимита fetch-кэша Next (2 МБ). Поэтому
  запрос идёт `no-store`, а **плоский** список `{id, name}` (≈14 400 записей)
  кэшируется в памяти процесса (`areasCache`).
- **Зарплата** может быть `null` целиком или иметь null-поля `from`/`to` — всегда
  проверяем (см. `formatSalary` в [`format.ts`](src/lib/hh/format.ts)).
- **HTML:** `snippet` содержит теги `<highlighttext>` (вырезаем), `description` —
  полный HTML (санитайзим, см. раздел 11).

### Кнопка «Откликнуться на hh.ru»
Каждая вакансия содержит `apply_alternate_url`
(`https://hh.ru/applicant/vacancy_response?vacancyId={id}`) — ведёт прямо в форму
отклика. Реальный отклик через API не делаем (это потребовало бы соискательский OAuth).

### Вход через hh.ru (реализовано — только авторизация)
Помимо **application token** (серверный поиск вакансий) приложение умеет входить
**от имени пользователя** через hh.ru. Это **просто ещё один способ авторизации**
(наряду с Google и Яндексом) — резюме из hh.ru **не импортируется** (см. врезку).

> ⛔ **Почему нет импорта резюме:** hh.ru **закрыл API резюме соискателя 15.12.2025**
> — `GET /resumes/mine` и `GET /resumes/{id}` отдают `403 forbidden` обычным
> OAuth-приложениям (доступ остался только у B2B-партнёров с отдельным соглашением
> по базе резюме). Поэтому весь код вытягивания/маппинга резюме и таблица токенов
> `hh_connections` **удалены**; резюме пользователь добавляет вручную (файл/текст,
> раздел 11). Не пытайтесь снова тянуть резюме без партнёрского доступа hh.ru.

Реализован как **standalone app-session** (та же подписанная cookie-сессия, что у
Яндекса), а **не** как Supabase custom provider: hh.ru не OIDC.

Поток (`authorization_code` + PKCE):
1. `GET /api/auth/hh` ([route.ts](src/app/api/auth/hh/route.ts)) — генерит
   `state` + PKCE (`code_challenge`, S256), кладёт во временные httpOnly-cookie,
   редиректит на `https://hh.ru/oauth/authorize` (`response_type=code`,
   `client_id`, `redirect_uri=/api/auth/hh/callback`, `state`, `code_challenge`).
2. `GET /api/auth/hh/callback` ([route.ts](src/app/api/auth/hh/callback/route.ts)):
   - проверяет `state`, меняет `code`+`verifier` на user-токен через
     `POST https://api.hh.ru/token` (`grant_type=authorization_code`);
   - `GET https://api.hh.ru/me` → `id`, `email`, имя (токен используется **один
     раз** для идентификации и **не сохраняется**);
   - ставит подписанную cookie `jobswiper-app-session`
     (`id = stableProviderUserId("hh", me.id)`) и редиректит назад с
     `auth=success&provider=hh`.

Хелперы обмена кода и `/me` — в [hh.ts](src/lib/auth/hh.ts)
(`exchangeHhCodeForToken`, `fetchHhMe`). После входа пользователь — обычный
app-session-аккаунт; данные грузятся как у всех (`pullState`).

> ⚠️ Тот же `HH_CLIENT_ID/SECRET` обслуживает и `client_credentials` (app-token),
> и `authorization_code` (вход пользователя). В кабинете dev.hh.ru у приложения
> должен быть прописан Redirect URI `https://jobswiper.ru/api/auth/hh/callback`
> (+ `http://localhost:3000/...` для dev). Нужен также `APP_SESSION_SECRET`
> (фолбэки — раздел 3).

---

## 6. Интеграция с AITunnel / Mistral (ИИ)

Клиент: [`src/lib/ai/client.ts`](src/lib/ai/client.ts), промпты:
[`src/lib/ai/prompts.ts`](src/lib/ai/prompts.ts).

### Модель
```
mistral-nemo   ← Mistral через AITunnel (контекст ~131K)
```
Модель задаётся одним полем `model` (можно переопределить переменной `AI_MODEL`).

Эндпоинт: `POST https://api.aitunnel.ru/v1/chat/completions` (OpenAI-совместимый),
заголовки `Authorization: Bearer ${AITUNNEL_API_KEY}`, `Content-Type`.

### Расход токенов
Тариф платный, поэтому расчёт % сделан **батчами + лениво + с кэшем** (раздел 9),
а каждая вакансия оценивается максимум один раз. Подробная экономика — в `PRICING.md`.

### JSON без `response_format`
Структурированный вывод не запрашиваем. Поэтому:
- в промпте просим «верни ТОЛЬКО минифицированный JSON»;
- ответ парсим **защитно** функцией `extractJson()`: пробуем `JSON.parse`, затем
  снимаем ```` ```json ```` обёртки, затем берём первый сбалансированный `{...}`/`[...]`.

### Обработка ошибок
- `429`/`503` → ретрай с экспоненциальным бэк-оффом (учитываем `Retry-After`),
  до 3 попыток.
- Эндпоинт может вернуть **HTTP 200 с телом `error`** — проверяем это.
- Текст ответа — `choices[0].message.content`.

### Температуры
- разбор резюме / оценка % → `0.1` (детерминизм);
- сопроводительное письмо → `0.7` (живой текст).

---

## 7. API-роуты (сервер)

Все — `runtime = "nodejs"`, ИИ-роуты ещё `maxDuration = 60`. Возвращают
`{ error }` со статусом при сбое.

| Роут | Метод | Вход | Выход |
|---|---|---|---|
| `/api/vacancies` | GET | query-фильтры | `HHSearchResponse` (`items`, `found`, `pages`) |
| `/api/vacancies/[id]` | GET | id в пути | `HHVacancyDetail` (+`description`, `key_skills`) |
| `/api/areas` | GET | — | `{ areas: {id,name}[] }` (плоский список) |
| `/api/parse-resume` | POST | `{ resumeText }` | `{ title, skills[], seniority, summary, experienceId }` |
| `/api/match` | POST | `{ resumeContext, vacancies[] }` (≤10) | `{ results: {id,score,strengths,gaps,summary,ok}[] }` |
| `/api/cover-letter` | POST | `{ resumeContext, vacancy }` | `{ text }` |
| `/api/extract-resume` | POST | multipart `file` (PDF/DOCX, ≤8 МБ) | `{ text, name }` |
| `/api/auth/google` | GET | `next` query | редирект на Google OAuth через Supabase |
| `/api/auth/yandex` | GET | `next` query | прямой редирект на Яндекс OAuth2 + PKCE |
| `/api/auth/yandex/callback` | GET | `code`, `state`, OAuth errors | обмен code на токен Яндекса, userinfo, signed app-session |
| `/api/auth/hh` | GET | `next` query | прямой редирект на hh.ru OAuth2 + PKCE |
| `/api/auth/hh/callback` | GET | `code`, `state`, OAuth errors | обмен code на user-токен hh.ru, `/me`, signed app-session (вход) |
| `/auth/callback` | GET | `code`, `next`, `provider` query | обмен Google code на Supabase cookie-сессию, редирект обратно |
| `/api/auth/session` | GET | — | `{ user }` из Supabase Auth или signed Яндекс app-session |
| `/api/auth/sign-out` | POST | — | выход из Supabase-сессии и очистка Яндекс app-session |
| `/api/db/quota` | PUT | `{ quota, bonusClaimed }` | сохранить usage-лимиты и флаг бонуса |

Нюансы:
- **`/api/match`** ограничивает батч 10 вакансиями, клампит `score` в 0–100,
  возвращает результат для каждой запрошенной вакансии в том же порядке (`ok=false`,
  если модель что-то пропустила).
- **`/api/cover-letter`** универсален: если передан `vacancy.id` без `description`,
  он сам дотягивает полное описание через `getVacancy(id)`; если передан
  `description` напрямую (своя вакансия) — использует его.
- **`/api/parse-resume`** валидирует `experienceId` по белому списку и обрезает поля.
- **`/api/auth/yandex`** не использует Supabase custom provider. Это сознательно:
  Яндекс OAuth чувствителен к scope/redirect URI, а custom provider давал ошибки
  уровня `invalid_scope`/`missing provider id`. Прямой flow делает состояние
  наблюдаемым через `jobswiper_yandex_auth` logs.

---

## 8. Клиентское состояние (Zustand)

Стор: [`src/lib/store/use-app-store.ts`](src/lib/store/use-app-store.ts) — это
**зеркало данных в памяти**. Источник истины — **Supabase** (раздел 8.1). В
localStorage хранится только анонимный `userId` (ключ `jobswiper-user-id`).

### Что в сторе
```ts
userId         // анонимный id устройства (единственное в localStorage)
authUser       // текущий Supabase user из verified session
authChecked    // завершена ли проверка Supabase session
profile        // ResumeProfile | null
filters        // Filters
seen           // Record<id, "liked" | "passed">  — что уже свайпнули
liked          // Record<id, LikedItem>            — лайкнутые вакансии hh.ru
matches        // Record<id, MatchResult>          — кэш % соответствия
customLetters  // Record<id, CustomLetter>         — письма под свои вакансии
quota          // usage: отклики, анализы вакансий, разборы резюме
proBonusClaimed // выдан ли временный бонус +50 откликов
paywallOpen / limitDialogKind / giftDialogOpen // UI-состояния монетизации
```

### Загрузка (bootstrap)
Компонент [`store-bootstrap.tsx`](src/components/store-bootstrap.tsx) (в провайдерах)
при монтировании: `getOrCreateUserId()` → `GET /api/db/state` → `hydrateFromServer()`
→ `hydrated=true`. То есть состояние приходит из Supabase, а не из localStorage.
`pullState` делает несколько ретраев на случай холодного старта. Если есть
сессия, bootstrap использует authenticated app user id; если пользователь впервые
вошёл с устройства, `/api/db/merge` переносит данные анонимного `userId` в аккаунт.

### Запись (sync)
Действия стора меняют состояние локально **и** дублируют изменение в Supabase через
[`db-sync.ts`](src/lib/db-sync.ts) (fire-and-forget POST на `/api/db/*`):
- `setProfile` / `setFilters` → `PUT /api/db/profile`;
- `like` / `pass` → `POST /api/db/swipe` (апсерт вакансии + свайп + матч);
- `removeLiked` → удаление свайпа и письма;
- генерация письма ([`cover-letter.ts`](src/lib/cover-letter.ts)) → `POST /api/db/cover-letter`;
- расчёт % ([`use-match-scores.ts`](src/lib/hooks/use-match-scores.ts)) → `POST /api/db/matches`.
- расход лимитов / бонус ([`plans.ts`](src/lib/plans.ts)) → `PUT /api/db/quota`.

### Гидратация (против mismatch)
Флаг **`hydrated`** = «данные из Supabase загружены». На сервере и при первом
клиентском рендере он `false` (данные пустые) — SSR и первый рендер совпадают.
Компоненты (лента, отклики, бейдж, форма резюме) показывают скелетон, пока
`hydrated` не станет `true`. На полной перезагрузке стор сбрасывается и
перезагружается из Supabase.

---

## 8.1. Хранение данных (Supabase)

Проект Supabase (Postgres). Доступ — только из серверных роутов
[`src/app/api/db/*`](src/app/api/db) через клиент
[`server.ts`](src/lib/supabase/server.ts) (publishable-ключ) и слой запросов
[`queries.ts`](src/lib/supabase/queries.ts). Браузер к Supabase напрямую **не** ходит.

### Таблицы
| Таблица | Назначение | Первичный ключ |
|---|---|---|
| `users` | пользователь + резюме + фильтры + usage-лимиты (`responses_used`, `analyses_used`, `resumes_used`, `bonus_claimed`) | `id` (uuid) |
| `vacancies` | кэш вакансий, с которыми взаимодействовали (снапшот + поля) | `id` (hh.ru id) |
| `match_scores` | ИИ-% соответствия резюме↔вакансия | `(user_id, vacancy_id)` |
| `swipes` | история свайпов («seen»); лайки = `direction='liked'` | `(user_id, vacancy_id)` |
| `cover_letters` | письма: `kind='liked'` (id=vacancy) или `kind='custom'` (id=uuid) | `(user_id, id)` |
| `app_tokens` | серверные app-токены внешних API, сейчас `id='hh'` | `id` |

`match_scores`, `swipes`, `cover_letters` ссылаются на `users` и `vacancies`
(FK, `on delete cascade`). Поэтому перед записью свайпа/матча/письма роут сначала
апсертит вакансию.

### Роуты `/api/db/*`
| Роут | Метод | Назначение |
|---|---|---|
| `state` | GET | собрать всё состояние пользователя в одном ответе |
| `profile` | PUT | сохранить резюме и/или фильтры |
| `swipe` | POST | записать/удалить свайп (+ апсерт вакансии и матча) |
| `matches` | POST | апсерт батча оценок (со снапшотами вакансий) |
| `cover-letter` | POST | сохранить/удалить письмо (liked/custom) |
| `quota` | PUT | сохранить usage-лимиты и флаг временного бонуса |
| `reset` | POST | очистить свайпы и письма лайков |
| `billing/create-payment` | POST | создать заказ и платёжную ссылку T-Bank для выбранного пакета |
| `billing/order` | GET | получить статус заказа текущего пользователя после возврата с оплаты |
| `billing/tbank/webhook` | POST | принять webhook T-Bank, проверить подпись и выдать лимиты |

### RLS и безопасность
RLS включён на всех таблицах. API-роуты теперь auth-aware: при наличии cookie-сессии
они игнорируют клиентский `userId` и используют verified `auth.getUser().id`; без
сессии сохраняется гостевой режим с анонимным `userId` устройства.

Если в Supabase ещё остались MVP-политики `using (true)` для роли `anon`, их стоит
заменить на политики по `auth.uid()` после решения, нужен ли публичный гостевой
режим на уровне PostgREST. Сейчас браузер всё равно не ходит в Supabase напрямую,
но строгие RLS-политики нужны для полноценного hardening. Смена резюме чистит
устаревшие оценки колоды (`clearDeckMatches`), сохраняя оценки уже лайкнутых вакансий.

## 8.2. Лимиты, paywall и тарифы

Источник правил — [`src/lib/plans.ts`](src/lib/plans.ts):
- бесплатный лимит: 10 откликов, 100 анализов вакансий, 3 разбора резюме;
- временный бонус из paywall: +50 откликов один раз (`bonus_claimed`);
- платные пакеты UI: «Старт» 99 ₽ и «Максимум» 299 ₽ — разовая покупка лимитов
  без подписки и автопродления.

Расчёт доступных лимитов в UI идёт через `src/lib/hooks/use-limits.ts`:
`free + purchased - used`. Автоскоринг вакансий в
`src/lib/hooks/use-match-scores.ts` должен использовать тот же смысловой лимит
для `analyses`, иначе после исчерпания бесплатных анализов карточки будут
появляться без AI-оценок даже при купленном пакете.

Таблицы для платёжной части лежат в [`supabase/billing.sql`](supabase/billing.sql):
- `billing_orders` — внутренний заказ, выбранный `plan_id`, сумма в копейках,
  статус, `PaymentId`, платёжная ссылка и последний raw-payload банка;
- `user_entitlements` — купленные лимиты пользователя, привязанные к заказу,
  срок действия пакета — 12 месяцев.
- `billing_events` — технический журнал платежей: webhook-и T-Bank, результаты
  `GetState`, `Confirm`, ручные repair-события. Таблица нужна для production-
  диагностики, когда Vercel logs недоступны или уже ротированы.

Обе таблицы находятся в `public`, поэтому в SQL включён RLS. Серверные payment API
работают через `getSupabaseAdmin()` и требуют `SUPABASE_SERVICE_ROLE_KEY`; этот ключ
нельзя добавлять в `NEXT_PUBLIC_*` и нельзя использовать в клиентских компонентах.

Платёжный flow:
1. Клиент выбирает пакет из `PLANS`.
2. UI не даёт начать покупку без аккаунта: paywall закрывается и открывает
   auth-dialog с входом через Google/Яндекс/hh.ru. Это нужно, чтобы пакет
   лимитов всегда был привязан к конкретному `user_id`.
3. `POST /api/billing/create-payment` требует авторизованного пользователя,
   создаёт `billing_orders`, вызывает T-Bank `/v2/Init` и возвращает
   `paymentUrl`.
4. Paywall переводит пользователя на `paymentUrl`; `SuccessURL` и `FailURL`
   возвращают его в `/profile?payment=...&orderId=...`.
5. `PaymentStatusBridge` на странице профиля вызывает `GET /api/billing/order`.
   Этот endpoint не только читает БД, но и для незавершённых заказов сверяет
   статус в T-Bank через `/v2/GetState`. Если T-Bank возвращает `AUTHORIZED`,
   backend вызывает `/v2/Confirm`, чтобы завершить двухстадийную оплату.
   После `confirmed` профиль заново загружает `/api/db/state`, чтобы в UI
   появились купленные лимиты.
6. T-Bank отправляет уведомление в `POST /api/billing/tbank/webhook`.
7. Webhook проверяет SHA-256 `Token`, ищет заказ, сверяет сумму и выдаёт лимиты
   только при финальном статусе `CONFIRMED`.
8. Начисление идемпотентное: `user_entitlements.order_id` уникален, повторный
   webhook не создаст второй пакет по одному заказу.
9. Если T-Bank позже присылает `REFUNDED`, заказ получает статус `refunded`,
   а entitlement по этому `order_id` удаляется. Это важно для тестовых сценариев
   банка и реальных возвратов.

Статусы нельзя безусловно перетирать в порядке прихода webhook-ов: T-Bank может
прислать `CONFIRMED`, а затем более ранний по смыслу `AUTHORIZED`. Поэтому
webhook сохраняет `confirmed`, если новый статус не `REFUNDED`; иначе UI может
увидеть `unknown/authorized` после уже успешного начисления и зависнуть на
«Платёж обрабатывается».

Переменные окружения для эквайринга:
- `TBANK_TERMINAL_KEY` / `TBANK_TERMINAL_PASSWORD` — production;
- `TEST_TERMINAL_KEY` / `TEST_TERMINAL_PASSWORD` — тестовый fallback;
- `TBANK_API_URL` — опционально, по умолчанию `https://securepay.tinkoff.ru/v2`;
- `SUPABASE_SERVICE_ROLE_KEY` — нужен только backend API для платежей и webhook.

Итоговые лимиты в UI считаются как бесплатный пакет + активные строки
`user_entitlements` с `expires_at > now()`. Расходы лимитов считаются в сторе и
сохраняются в `users` через `/api/db/quota`. При merge анонимного пользователя в
авторизованный аккаунт берётся **большее** usage-значение, чтобы сменой устройства
нельзя было сбросить лимиты; `bonus_claimed` остаётся для пользователей, которым
раньше был выдан временный бонус.

## 8.3. Аналитика (Yandex Metrika)

Счётчик Метрики подключён в [`src/app/layout.tsx`](src/app/layout.tsx) через
`next/script` со стратегией `afterInteractive`. Counter ID — `109742095`, Webvisor,
clickmap, `trackLinks`, `accurateTrackBounce` включены. `noscript`-fallback тоже
добавлен.

Единая точка отправки целей — [`src/lib/analytics.ts`](src/lib/analytics.ts).
`trackGoal()` вызывает `ym(counterId, "reachGoal", goal, params)`, не падает при
отсутствии `window.ym`, выкидывает пустые параметры и обрезает длинные строки до
160 символов. В аналитику не отправляется текст резюме, текст вакансии или письмо.

Цели:

| Goal ID | Когда срабатывает | Приоритет |
|---|---|---|
| `resume_analyze_success` | резюме успешно разобрано ИИ | ключевая |
| `vacancy_feed_loaded` | лента вакансий успешно загрузилась | диагностическая |
| `response_created` | пользователь свайпнул вакансию вправо | ключевая |
| `cover_letter_success` | ИИ успешно сгенерировал письмо | ключевая |
| `hh_apply_click` | пользователь нажал переход к отклику на hh.ru | ключевая |
| `paywall_open` | открыт paywall | монетизация |
| `subscription_cta_click` | нажата CTA-кнопка покупки пакета | монетизация |
| `payment_plan_select` | пользователь выбрал пакет в paywall | монетизация |
| `payment_buy_click` | пользователь нажал «Купить пакет» | монетизация, ключевая |
| `payment_auth_required` | покупка заблокирована, потому что пользователь не авторизован | монетизация |
| `payment_create_start` | начался запрос `/api/billing/create-payment` | монетизация/диагностика |
| `payment_create_success` | backend создал заказ и получил `paymentUrl` от T-Bank | монетизация/диагностика |
| `payment_create_error` | не удалось создать платёжную ссылку | монетизация/диагностика |
| `payment_redirect_to_bank` | пользователь отправлен на страницу оплаты T-Bank | монетизация, ключевая |
| `payment_return_success` | пользователь вернулся с `payment=success` | монетизация |
| `payment_return_fail` | пользователь вернулся с `payment=fail` | монетизация |
| `payment_success` | подтверждённый платёж активировал пакет лимитов | монетизация |
| `payment_fail` | банк вернул пользователя с ошибкой или заказ завершился неуспешно | монетизация |
| `payment_processing` | после всех попыток статус всё ещё не финальный | монетизация/диагностика |
| `payment_check_error` | не удалось проверить статус заказа после возврата | монетизация/диагностика |
| `limit_dialog_open` | открыт диалог исчерпанного лимита | монетизация |
| `vacancy_feed_error` | hh.ru/сервер не загрузил вакансии | диагностика |
| `cover_letter_error` | генерация письма завершилась ошибкой | диагностика |
| `auth_start` | пользователь нажал кнопку входа через любой провайдер | авторизация |
| `auth_success` | после OAuth реально появилась app/Supabase-сессия | авторизация, ключевая |
| `auth_error` | OAuth вернул ошибку или после success не появилась сессия | авторизация |
| `auth_sign_out` | пользователь вышел из аккаунта | авторизация |
| `auth_google_start` | старт входа через Google | авторизация/provider |
| `auth_google_success` | успешный вход через Google | авторизация/provider |
| `auth_google_error` | ошибка входа через Google | авторизация/provider |
| `auth_yandex_start` | старт входа через Яндекс | авторизация/provider |
| `auth_yandex_success` | успешный вход через Яндекс | авторизация/provider |
| `auth_yandex_error` | ошибка входа через Яндекс | авторизация/provider |
| `auth_hh_start` | старт входа через hh.ru | авторизация/provider |
| `auth_hh_success` | успешный вход через hh.ru | авторизация/provider |
| `auth_hh_error` | ошибка входа через hh.ru | авторизация/provider |

Авторизационные события отправляются из клиентских компонентов, потому что
Yandex Metrika доступна только в браузере:
- старт входа — из `AuthButtons` и auth-dialog внутри `PaywallDialog`;
- success/error — из `AuthButtons` после возврата на `/profile?auth=...`;
- success считается только после повторного запроса `/api/auth/session`, когда
  сессия реально появилась в сторе. Если OAuth вернул `success`, но session endpoint
  отдал `null`, отправляется `auth_error` со `stage=session_missing`.

Параметры авторизации:
- `provider`: `google`, `yandex`, `hh`;
- `source`: `profile` или `paywall_auth_dialog`;
- `stage`: `callback`, `provider_redirect`, `session_missing`;
- `has_email`: есть ли email в профиле после успешной авторизации;
- `error_message`: короткая безопасная ошибка, без токенов, code, cookie и secret.

Параметры оплаты:
- `plan_id`: `starter` или `max`;
- `price`: цена пакета в рублях;
- `source`: источник открытия paywall (`feed-header`, `feed-refill`, `limit-dialog`
  и т.п.);
- `order_id`: внутренний `billing_orders.id`;
- `payment_id`: `PaymentId` T-Bank;
- `status`: финальный или промежуточный статус заказа;
- `stage`: этап ошибки (`bank_return`, `status_check`);
- `status_code`: HTTP-статус при ошибке создания платежа;
- `error_message`: короткая безопасная ошибка без ключей, токенов и raw-payload банка.

---

## 9. Логика расчёта % соответствия (центральная)

Хук: [`src/lib/hooks/use-match-scores.ts`](src/lib/hooks/use-match-scores.ts).

Задача: посчитать % для верха колоды, **экономя токены ИИ**.

- **Окно** `WINDOW = 18`: оцениваем только ближайшие 18 неоценённых карточек.
- **Батч** `BATCH_SIZE = 10`: за один запрос отправляем до 10 вакансий → 1 ответ-массив
  (это и максимум `/api/match`).
- **Параллельно** `MAX_CONCURRENT = 3`: до 3 батчей в полёте одновременно, чтобы
  скоринг не отставал от быстрого свайпера. На старте окно прогревается за 1–2 волны
  запросов. (Раньше было `WINDOW=12`, `BATCH_SIZE=6` и строго один батч за раз.)
- **Резерв квоты:** in-flight карточки списываются с квоты только при успехе, поэтому
  перед запуском новых батчей доступный бюджет считается как `analysesLeft − inFlight.size`
  — иначе параллельные батчи могли бы суммарно перерасходовать лимит.
- **`attempted`-множество** на каждый `resumeContext`: вакансию пытаемся оценить
  **не более одного раза** — иначе при `ok=false` был бы бесконечный цикл запросов.
- **`running`-счётчик** в `stateRef` ограничивает число параллельных батчей; результат
  батча, пришедший после смены резюме, отбрасывается (`ctx !== ctxAtLaunch`).
- Результаты кладутся в `store.matches` (persist), повторно не считаются.
- В скоринг идёт **`snippet`** (короткий тизер), а не полное описание — экономия
  токенов и запросов.
- Хук возвращает `loadingIds` — для спиннера в кольце текущей карточки.

При смене резюме `matches` очищается, окно/`attempted`/`running` сбрасываются, всё
считается заново под новое резюме.

> ⚠️ Потолок остаётся за квотой: на free `analyses = 100` ([plans.ts](src/lib/plans.ts)),
> поэтому максимум 100 вакансий на резюме получат %. Параллельность ускоряет выдачу
> этих оценок, но не снимает потолок — дальше показывается баннер `outOfQuota`
> (раздел 9.1). Параметры скоринга — единственное, что нужно крутить для баланса
> «скорость ↔ расход ИИ».

Цвет и подпись кольца — [`match-style.ts`](src/lib/match-style.ts): ≥85 🔥 «Отличное»,
≥70 ✨ «Хорошее», ≥50 👍 «Среднее», ≥30 🤔 «Слабое», иначе ❌ «Низкое».

---

## 9.1. Подбор и подгрузка ленты («скользящий запас подходящих»)

Чистая логика: [`src/lib/deck-supply.ts`](src/lib/deck-supply.ts) (без React и сети,
покрыта юнит-тестами [`deck-supply.test.ts`](src/lib/deck-supply.test.ts)).
Проводка в React — на главной [`src/app/page.tsx`](src/app/page.tsx).

### Проблема, которую это решает
Лента сортируется по убыванию % совместимости ([`page.tsx`](src/app/page.tsx),
`sortedItems`), поэтому хорошие карточки уходят вперёд, а слабые скапливаются
«хвостом». Раньше новая страница hh.ru подгружалась только при `deckItems.length <= 6`,
то есть пользователь сначала вычёрпывал хорошие, потом домучивал хвост слабых/
неоценённых карточек, и лишь затем приезжали свежие. Плюс окно скоринга (`WINDOW`,
раздел 9) оценивает не весь буфер — часть карточек могла показываться без %.

### Ключевой принцип (и почему именно так)
Запросы к hh.ru **бесплатны**, а ИИ-скоринг **платный и ограничен квотой анализов**
(`FREE_LIMITS.analyses = 100`, см. [`plans.ts`](src/lib/plans.ts), раздел 8.2).
Поэтому: **тянем hh-страницы проактивно, но скоринг тратим строго чуть впереди
свайпов и только пока есть квота.** Перед пользователем держим небольшой запас уже
**оценённых годных** карточек; так как сортировка глобальна по всему буферу, свежие
хорошие карточки со следующей страницы встают выше слабых с предыдущей — и «хвост
мусора» откладывается до момента, когда годные реально закончились.

### Тюнинг (константы в [`deck-supply.ts`](src/lib/deck-supply.ts))
| Константа | Знач. | Смысл |
|---|---|---|
| `USABLE_SCORE` | `50` | порог «годной» карточки (= тир «👍 Среднее» в `match-style.ts`) |
| `READY_MIN` | `5` | если годных впереди меньше — тянем следующую страницу |
| `BACKLOG_CAP` | `14` | не тянуть ещё, пока столько карточек ждут скоринга (даём ему догнать) |
| `AUTO_PAGE_BUDGET` | `2` | сколько страниц подтянуть «вслепую» без новых годных, прежде чем спросить пользователя |

### Три чистые функции
- **`countSupply(items, matches)`** → `{ usableReady, scored, unscored }` — считает
  запас по статусу скоринга. `score == null` → `unscored`; `score >= USABLE_SCORE`
  → ещё и `usableReady`. (Важно: `score === 0` считается оценённой, а не «без оценки».)
- **`decidePrefetch(input)`** → `{ fetch, consumeBudget, exhaustBudget }`. Два
  независимых триггера догрузки (выходим в idle, если `!hasNextPage` или уже грузим):
  - **safety-refill:** `deckLength <= 6` — не дать колоде опустеть; бесплатно, бюджет не тратит.
  - **usable-refill (blind):** `canScoreMore && usableReady < READY_MIN && unscored < BACKLOG_CAP`
    при `budgetUsed < AUTO_PAGE_BUDGET` — тянем свежую партию и тратим бюджет.
  - если годных мало, но бюджет исчерпан → `exhaustBudget=true` (передаём управление пользователю).
- **`pickRefillVariant(input)`** → `"loadMore" | "outOfQuota" | "exhausted" | null` —
  какой CTA показать над колодой. Только когда верхняя (после сортировки) карточка
  слабая **и** мы в покое (не идёт fetch/скоринг — анти-мерцание):
  - `!hasNextPage` → **`exhausted`** (hh.ru исчерпан по фильтрам / упёрлись в cap 2000);
  - `!canScoreMore` → **`outOfQuota`** (квота анализов кончилась — не сможем оценить новые страницы → Pro);
  - `autoExhausted` → **`loadMore`** (инвентарь есть, но авто-поиск выдохся — спрашиваем пользователя).

### Проводка в [`page.tsx`](src/app/page.tsx)
- `counts = useMemo(countSupply(deckItems, matches))` — `deckItems` в API-порядке
  (тот же, что в `useMatchScores`), чтобы сортировка не влияла на выбор оцениваемых.
- `autoBudgetRef` (ref) — счётчик «слепых» догрузок; `autoExhausted` (state) — флаг
  для баннера. `prevUsableRef` сбрасывает бюджет/флаг, **как только запас годных
  вырос** (значит подбор работает). Бюджет/флаг также сбрасываются при смене фильтров
  и по кнопке «Загрузить ещё».
- **prefetch-эффект** зовёт `decidePrefetch(...)`: при `fetch` → `fetchNextPage()` (и
  `autoBudgetRef++`, если `consumeBudget`); при `exhaustBudget` → `setAutoExhausted(true)`.
  `setAutoExhausted` **не** в депах эффекта, поэтому петли нет: повторно эффект
  гоняется только при изменении наблюдаемого состояния (буфер/счётчики/флаги загрузки).
- **`refillVariant`** через `pickRefillVariant(...)` рендерит `<DeckRefillBanner>` над
  колодой. Баннер не заменяет колоду — слабые карточки остаются свайпабельными.
- Статус-строка показывает «· подгружаем ещё…» (`isFetchingNextPage`) и «· оцениваем
  совместимость…» (`loadingIds.size > 0`).

### Баннер [`deck-refill-banner.tsx`](src/components/swipe/deck-refill-banner.tsx)
Презентационный, три варианта: `loadMore` (кнопка догрузки `onLoadMore`),
`outOfQuota` (→ `openPaywall`), `exhausted` (переиспользует `FiltersSheet` +
«Начать заново» `resetSwipes`). Подпись «ниже ещё N менее подходящих» — из `weakRemaining`.

### Краевые случаи
- **Анти-мерцание:** пока идёт fetch или скоринг (`settling`), баннер скрыт.
- **Квота исчерпана:** скоринг встаёт сам (`analysesLeft <= 0` в `use-match-scores`),
  показывается `outOfQuota`; слабые/неоценённые карточки остаются свайпабельными.
- **Защита от лавины догрузок:** `BACKLOG_CAP` не даёт тянуть страницы быстрее, чем
  скоринг их обрабатывает; `AUTO_PAGE_BUDGET` ограничивает «слепой» поиск.
- **Стоимость не растёт:** механизм меняет *когда* и *что* грузим/оцениваем, но
  суммарный расход ИИ по-прежнему упирается в те же 100 анализов на резюме.

---

## 10. Сопроводительные письма

Логика: [`src/lib/cover-letter.ts`](src/lib/cover-letter.ts).

Два сценария, общий механизм:
- **При свайпе вправо** → `generateCoverLetter(vacancyId)`: берёт `liked[id]`,
  передаёт на сервер уже загруженную карточку вакансии; если полного описания нет,
  сервер дотягивает его по id и пишет письмо.
- **Своя вакансия** → `generateCustomLetter(id)`: берёт `customLetters[id]`,
  передаёт вставленный текст как описание.

Промпт письма строго использует два источника: блок вакансии и резюме. Правила:
не придумывать факты, не использовать данные вне резюме, plain text без markdown,
3–5 предложений, без обращения, названия компании, названия вакансии и фраз вроде
«готов обсудить». В реальном использовании в `${vacancyBlock}` попадает конкретная
вакансия из карточки отклика/вставленный текст своей вакансии, а в `${resume}` —
актуальное резюме из личного кабинета (`buildResumeContext`).

Нюанс — **модульный `inFlight: Set`**: статус `loading` хранится в persist, поэтому
после перезагрузки «зависший» `loading` не блокирует повтор. Реально выполняющиеся
генерации отслеживает именно `inFlight` (а не persisted-статус). `isGeneratingCoverLetter(id)`
отличает «реально грузится» от «осталось `loading` с прошлой сессии» → во втором
случае карточка показывает кнопку «Повторить».

Статусы письма: `idle → loading → done | error`. В карточке: копирование в буфер,
«Переписать», для лайков — ещё «Откликнуться на hh.ru».

---

## 11. Загрузка резюме (PDF/DOCX)

Серверное извлечение: [`src/lib/resume-extract.ts`](src/lib/resume-extract.ts),
роут `/api/extract-resume`.

- **PDF** → `unpdf` (`getDocumentProxy` + `extractText`), serverless-сборка pdf.js.
- **DOCX** → `mammoth` (`extractRawText`).
- Обе библиотеки грузятся **динамическим импортом** (только когда нужны) и вынесены
  в `serverExternalPackages` в `next.config.ts`, чтобы Next их не бандлил.
- Лимит файла — **8 МБ**. Если текста почти нет (скан без текстового слоя) →
  понятная ошибка с предложением вставить текст вручную.

Поток на клиенте (`resume-form.tsx`): drag-drop/выбор файла → `/api/extract-resume`
→ текст попадает в textarea → **автоматически** запускается `/api/parse-resume`
→ профиль сохраняется → лента перестраивается под профессию.

### Санитизация HTML (описание вакансии)
В [`vacancy-detail-dialog.tsx`](src/components/vacancy/vacancy-detail-dialog.tsx)
полное `description` с hh.ru рендерится через **DOMPurify** (на клиенте) с белым
списком тегов (`p, ul, li, strong, …`). Стили — класс `.vacancy-html` в `globals.css`.

---

## 12. Нюансы Base UI (частые грабли)

shadcn-стиль **`base-nova`** генерирует компоненты на **Base UI**, а не Radix. Отличия
от привычного shadcn:

1. **Нет `asChild`.** Вместо него — проп **`render`**:
   ```tsx
   // ❌ Radix-стиль
   <Button asChild><Link href="/">…</Link></Button>
   // ✅ Base UI
   <Button render={<Link href="/" />}>…</Button>
   <SheetTrigger render={<Button … />}>…</SheetTrigger>
   ```
2. **Кнопка-ссылка** (`render` с `<a>`/`<Link>`) требует **`nativeButton={false}`**,
   иначе Base UI пишет в консоль предупреждение про неродной `<button>`.
3. **Tooltip** использует проп `delay`, а не `delayDuration`.
4. **Select** для отображения подписи выбранного значения требует проп **`items`**
   (`{value,label}[]`), иначе показывает «сырой» value. Поэтому для города с 14k
   записей сделан отдельный **combobox** (Popover + cmdk, ручная фильтрация, рендер
   топ-50) — см. [`area-combobox.tsx`](src/components/filters/area-combobox.tsx).
5. `onValueChange` у Select может отдавать `string | null` — приводим к строке.

---

## 13. Дизайн-система и тема

- **Токены** в [`globals.css`](src/app/globals.css) в формате **oklch**. Фирменный
  primary — фиолетовый (`oklch(0.55 0.235 285)`); для лайка/нопа — emerald/rose.
- **Тёмная тема** через `next-themes` (`attribute="class"`), переключатель — в Кабинете.
  `<html suppressHydrationWarning>` обязателен.
- **Кастомные утилиты** (в `@layer utilities`): `app-aurora` (фоновое свечение),
  `text-gradient-brand` / `bg-gradient-brand`, `shadow-card`, `hide-scrollbar`,
  `text-balance`, `.vacancy-html`.
- **Шрифт** Geist с подключённой кириллицей (`subsets: ["latin","cyrillic"]`).
- **Контейнер** приложения — `max-w-2xl`, мобильный-first; нижняя навигация —
  плавающий «pill», `position: fixed`, по центру контейнера.

---

## 14. Ключевые компоненты

- **`swipe-deck.tsx`** — сердце ленты. Внутри `TopCard` (Framer Motion `drag="x"`):
  `useMotionValue(x)` → `rotate` и прозрачность штампов «Откликнуться»/«Мимо».
  Порог свайпа — смещение > 110px или скорость > 600. Программный свайп
  (кнопки/стрелки ←→) идёт через `useImperativeHandle().swipe(dir)`. Стек из 3 карт;
  фоновые — `pointer-events-none` и `tabIndex=-1` (не кликаются/не таб-фокусятся).
- **`match-ring.tsx`** — кольцо % на чистом SVG (`stroke-dasharray`/`offset`),
  спиннер при загрузке, цвет из `matchStyle`.
- **`filters-sheet.tsx`** — нижний Sheet; черновик фильтров применяется по кнопке
  (ключ запроса React Query меняется → рефетч). Профессия подставляется из резюме.
- **`vacancy-detail-dialog.tsx`** — модалка; детали грузятся лениво (React Query,
  `enabled: open`), описание санитайзится DOMPurify, показываются `key_skills` и
  ИИ-плюсы/минусы.
- **`liked-card.tsx` / `custom-letter-card.tsx`** — карточки откликов; письмо с
  состояниями, копирование, «Переписать». У лайков — кнопка hh.ru, у своих — бейдж
  «Своя вакансия».

---

## 15. Маршруты данных (поток)

```
Резюме (текст/файл)
  └─ /api/extract-resume (если файл) ─→ текст
       └─ /api/parse-resume ─(ИИ)→ { title, skills, seniority, experienceId }
            └─ store.setProfile ─→ filters.text = profession

Главная
  └─ useVacancies(filters) ─→ /api/vacancies ─(hh.ru, app-token)→ items[] (страницы по 30)
       ├─ deckItems = items − seen (API-порядок) ─→ sortedItems (по убыванию %)
       ├─ useMatchScores(top 12, батчи по 6) ─→ /api/match ─(ИИ)→ store.matches
       └─ deck-supply: countSupply → decidePrefetch → fetchNextPage / banner (раздел 9.1)
            держим запас оценённых годных карточек; CTA, когда годные кончились

Свайп вправо
  └─ store.like(v) + generateCoverLetter(id)
       └─ /api/cover-letter (дотягивает описание по id) ─(ИИ)→ store.liked[id].coverLetter

Своя вакансия
  └─ addCustomLetter + generateCustomLetter(id)
       └─ /api/cover-letter (description напрямую) ─(ИИ)→ store.customLetters[id]

Авторизация
  ├─ /api/auth/google
  │    └─ Supabase OAuth provider ─→ /auth/callback?code=...
  │         └─ exchangeCodeForSession ─→ Supabase cookie-session + /api/db/merge
  └─ /api/auth/yandex
       └─ Yandex OAuth2 + PKCE ─→ /api/auth/yandex/callback?code=...
            └─ token + userinfo ─→ signed app-session cookie + /api/db/merge

Лимиты и paywall
  └─ consumeResponses/consumeAnalyses/consumeResumeParse
       └─ /api/db/quota ─→ users.responses_used / analyses_used / resumes_used / bonus_claimed

Персистенс (параллельно мутациям)
  старт приложения ─(store-bootstrap)→ GET /api/db/state ─→ store
  любая мутация store.*  ─(db-sync)→ POST/PUT /api/db/* ─→ Supabase
```

---

## 16. Запуск, сборка, проверка

```bash
npm install        # зависимости
npm run dev        # дев-сервер → http://localhost:3000
npm run build      # production-сборка (включает проверку типов)
npm start          # запуск собранного
npm run lint       # ESLint
npx tsc --noEmit   # только проверка типов
node --test src/lib/deck-supply.test.ts   # юнит-тесты логики ленты (Node 24, TS «из коробки»)
```

`.claude/launch.json` описывает дев-сервер для интегрированного превью.

> Тестовый файл использует `.ts`-импорты для нативного раннера Node 24, поэтому в
> `tsconfig.json` включён `allowImportingTsExtensions: true` (безопасно при `noEmit`).

---

## 17. Важные нюансы для разработки (чек-лист)

1. **Base UI ≠ Radix** — `render` вместо `asChild`, `nativeButton={false}` для
   кнопок-ссылок, `items` у Select, `delay` у Tooltip (раздел 12).
2. **hh.ru требует app-токен** — без него `403` с дата-центра. Токен кэшируется в
   Supabase (`app_tokens`); не запрашивать часто («refresh too early»).
3. **Экономия токенов ИИ** (Mistral/AITunnel, платный тариф) — поэтому % считается
   батчами/лениво/с кэшем, а каждая вакансия оценивается максимум один раз.
4. **Бесплатная модель без `response_format`** — JSON парсим защитно (`extractJson`).
5. **Пагинация hh.ru** — `page * per_page ≤ 2000`.
6. **`/areas` весит 2.8 МБ** — `no-store` + кэш плоского списка в памяти.
7. **SSR-гидратация** — гейтить UI на `store.hydrated`, чтобы не было mismatch;
   `localStorage` доступен только в браузере.
8. **Данные — в Supabase** (Postgres), не в localStorage. В браузере остаётся только
   анонимный `userId`; при входе используется authenticated app user id. Доступ к
   БД — только через серверные `/api/db/*` (раздел 8.1).
9. **Auth:** Google — встроенный Supabase provider через `@supabase/ssr`,
   `proxy.ts`, `getAll/setAll` cookies и verified `auth.getUser()`. Яндекс и
   **hh.ru** — direct OAuth2 + PKCE через свой `/callback` и signed app-session
   cookie; не возвращать их обратно на Supabase custom provider. hh.ru — **только
   вход** (резюме не тянем: hh.ru закрыл API резюме 15.12.2025, раздел 5).
10. **OAuth redirect origin:** production callback строится из `NEXT_PUBLIC_SITE_URL`,
    а не из `request.origin`, чтобы за proxy/Vercel не получить `localhost`.
11. **Метрика:** события отправлять только через `trackGoal()`, без текста резюме,
    вакансии и письма в параметрах.
12. **Лимиты:** любые расходы откликов/анализов/разборов резюме синхронизировать
    через `/api/db/quota`; merge аккаунтов не должен сбрасывать usage.
13. **Ключи только на сервере** — никогда не дёргать hh.ru/AITunnel из браузера
    напрямую.
14. **HTML с hh.ru санитайзить** (DOMPurify), сниппеты чистить от `<highlighttext>`.
15. **Next 16:** в route-хендлерах `params` — это `Promise` (`await params`).
16. **Подгрузка ленты — «скользящий запас подходящих»** (раздел 9.1): hh-страницы
    тянем проактивно (бесплатно), скоринг — чуть впереди свайпов и в рамках квоты;
    решающая логика в чистом [`deck-supply.ts`](src/lib/deck-supply.ts) (есть тесты).
    Менять пороги (`USABLE_SCORE/READY_MIN/BACKLOG_CAP/AUTO_PAGE_BUDGET`) там же.

---

## 18. Возможные доработки

- Ужесточить RLS-политики под финальную модель гостевого/авторизованного доступа;
  заодно научить `resolveRequestUserId` доверять app-session-cookie (сейчас для
  app-session-юзеров Яндекса/hh.ru `/api/db/*` берут `userId` от клиента).
- Стриминг сопроводительного письма (token-by-token).
- Реальный отклик на hh.ru через соискательский OAuth (`POST /negotiations`).
- Реальные платежи вместо временного бонуса +50 откликов.
- Больше фильтров (профroles, индустрии, метро), сохранённые поиски.
- Кэш оценок с TTL и инвалидация по версии резюме.
```

## 19. SEO и метаданные

Базовые SEO-сущности уже настроены и проверены на отдаче робота (контент рендерится
на сервере — `GuestHome` попадает в сырой HTML до выполнения JS):

- **`src/app/layout.tsx`** — общие `metadata` (title/description, `metadataBase =
  https://jobswiper.ru`, canonical, Open Graph, Twitter, `robots.index`) + `viewport`.
  Здесь же подключена Яндекс.Метрика (счётчик в `src/lib/analytics.ts`).
- **`src/app/page.tsx`** — переопределяет title/description/`openGraph`/`twitter` под
  главную и отдаёт JSON-LD (`WebApplication` + `WebSite` + `FAQPage` из
  `src/components/landing/seo-content.ts`).
- **`src/app/legal/**/page.tsx`** — у каждой юр-страницы свой `alternates.canonical`.
- **`src/app/robots.ts`** и **`src/app/sitemap.ts`** — генерируют `/robots.txt` и
  `/sitemap.xml` (список публичных маршрутов; приватные `/profile`, `/liked` закрыты и
  помечены `robots.index:false`).

> ⚠️ **Единый формат URL.** Канонические ссылки и sitemap должны совпадать. Корень —
> без завершающего слеша (`https://jobswiper.ru`), поэтому в `sitemap.ts` для `/`
> отдаётся `SITE_URL` без приписывания `/`. `lastModified` в sitemap — **фиксированная
> дата** (`new Date("2026-06-11")`), а не `new Date()`: «всегда свежий» sitemap
> вызывает недоверие краулеров. Поднимать дату при заметном изменении контента.
>
> `viewport` в `layout.tsx` без `maximumScale` — масштабирование не блокируем (a11y).

### Картинка для соц-шеринга (Open Graph / Twitter)

Картинка превью (та, что видна при репосте ссылки в Telegram/VK/X — на самой странице
не отображается) задаётся **файловой конвенцией Next**, а НЕ через `metadata.openGraph.images`:

- `src/app/opengraph-image.png` + `src/app/twitter-image.png` (1200×630) и
  `*.alt.txt` рядом. Next сам добавляет `og:image`/`twitter:image` с
  `width`/`height`/`type`/`alt` на все страницы.
- Файлы генерируются скриптом **`scripts/gen-og-image.cjs`** (sharp рисует SVG-карточку
  на основе логотипа из `public/jobswiper-logo-icon.svg`). Перезапускать при смене
  бренда/слогана: `node scripts/gen-og-image.cjs`, затем скопировать в `twitter-image.png`.

> ⚠️ Не задавать `openGraph.images`/`twitter.images` в `metadata` ссылкой на SVG —
> соцсети не рендерят SVG-превью. Раньше так и было (`/jobswiper-logo-icon.svg`), из-за
> чего `og:image` фактически отсутствовал. Файловая конвенция переживает даже
> переопределение `openGraph` в `page.tsx` (проверено через `curl` на `/` и `/legal`).

### Иконки и PWA-манифест

- **`src/app/favicon.ico`** + **`src/app/icon.svg`** — фавикон (Next линкует сам).
- **`src/app/apple-icon.png`** (180×180) — Next добавляет `<link rel="apple-touch-icon">`
  (иконка для «на экран Домой» в iOS). Полноценная заливка брендовым градиентом, без
  внутреннего скругления — iOS маскирует сам.
- **`src/app/manifest.ts`** → `/manifest.webmanifest` (Next линкует `<link rel="manifest">`).
  Ссылается на **`public/icon-192.png`** и **`public/icon-512.png`** (512 — `maskable`).
- Все PNG-иконки генерируются скриптом **`scripts/gen-icons.cjs`** из того же глифа
  логотипа: `node scripts/gen-icons.cjs`. `theme_color` манифеста (`#7c3aed`) совпадает
  с `viewport.themeColor` в `layout.tsx`.

## 20. Программные SEO-посадочные `/vakansii/*`

Программно генерируемые посадочные под запросы «вакансии {профессия}» — основной
драйвер органики (раньше в индексе была только главная + юр-страницы). Каждая
страница серверно отрендерена (контент в сыром HTML), показывает **живые вакансии
с hh.ru** + уникальную посчитанную статистику, поэтому это не «дорвеи», а настоящий
агрегат. Реализованы Фазы 0–2; комбо «профессия+город» (`/vakansii/{prof}/{city}`) —
будущая Фаза 3.

### Из чего состоит

- **`src/lib/seo/catalog.ts`** — курируемый каталог (~26 профессий). Для каждой:
  `slug` (латиница), `nominative`/`genitive` (грамматика для «Вакансии {genitive}»),
  `category`, `query` и уникальный `intro`. `query` — это либо `professionalRole`
  (id из `GET /professional_roles`), либо `text` (там, где у hh.ru нет отдельной
  роли: Frontend/Backend/Python — все попадают в одну роль 96, поэтому ищем текстом;
  UX/UI — тоже текстом).
- **`src/lib/seo/landing-data.ts`** — `getProfessionLanding()` тянет выборку из HH
  (кеш `revalidate: 21600`, 6 ч) и считает статистику: `found`, вилку/медиану
  зарплат (только RUR), долю удалёнки, топ-работодателей и топ-города. Плюс
  `buildProfessionFaq()` — **FAQ, собранный из данных** (числа на каждой странице
  свои → страницы реально уникальны). `INDEX_THRESHOLD = 20`: ниже — страница
  рендерится, но `robots: noindex` (защита от тонких страниц).
- **`src/app/vakansii/[profession]/page.tsx`** — серверный компонент, `revalidate`
  + `generateStaticParams` (по одной странице на профессию) + **`dynamicParams =
  false`** (неизвестный slug → 404; так число страниц ограничено каталогом).
  `generateMetadata` строит title/description/canonical и `noindex` ниже порога.
  JSON-LD: `BreadcrumbList` + `CollectionPage`/`ItemList` + `FAQPage` (НЕ
  `JobPosting` — мы витрина-агрегатор, а не первоисточник вакансии).
- **`src/app/vakansii/page.tsx`** — хаб-каталог всех профессий (статический),
  цель ссылки из футера и узел перелинковки.
- **`src/components/vakansii/`** — `vacancy-row.tsx` (карточка вакансии, ссылка на
  hh.ru с `rel="nofollow"`) и `landing-faq.tsx` (FAQ на нативном `<details>`,
  ноль client-JS).

### Доработки общего кода

- `VacancySearchParams` + `buildSearchQuery` ([hh/types.ts], [hh/client.ts]) —
  добавлен `professional_role`.
- `searchVacancies(params, { revalidate })` — кешируемый режим. Без опции (живое
  приложение) остаётся `cache: "no-store"`; с `revalidate` — `next.revalidate`,
  чтобы посадочные могли статически генерироваться/ISR-иться. Анонимный
  `/vacancies` отдаёт 403 — поиск работает только с app-токеном (см. [hh/token.ts]).
- [sitemap.ts] перечисляет хаб + все профессии; [legal-footer.tsx] — ссылка
  «Вакансии по профессиям» (по требованию: точки входа только в футере, без нового
  визуала на главной/существующих страницах).

> ⚠️ **Антидорвей.** Качество держится на: (1) живых данных + статистике на каждой
> странице, (2) пороге индексации ≥20 вакансий, (3) курируемом каталоге под
> product-fit (офис/диджитал, не линейный персонал). Расширять каталог — по
> реальным данным GSC/Метрики (цели `response_created`, `payment_success`), а не «на глаз».

> **Грамматика:** новые профессии добавлять с корректным `genitive` («Вакансии
> маркетолога», не «маркетолог»). Английские термины (Data Scientist) не склоняем.
