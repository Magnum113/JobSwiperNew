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

Авторизация через Google и Яндекс реализована на Supabase Auth (`@supabase/ssr`,
PKCE, cookie-сессия). Google подключён как встроенный провайдер Supabase, Яндекс —
как custom OAuth provider (`custom:yandex`).

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
| База данных | **Supabase** (Postgres) + `@supabase/supabase-js` + `@supabase/ssr` | хранение данных и Auth через Google/Яндекс |
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
HH_CLIENT_ID=...               # OAuth-приложение hh.ru
HH_CLIENT_SECRET=...           # секрет приложения hh.ru
SUPABASE_URL=...               # URL проекта Supabase
SUPABASE_PUBLISHABLE_KEY=...   # publishable-ключ (используется только серверно)
NEXT_PUBLIC_SITE_URL=https://jobswiper.ru  # production URL для OAuth callback
SUPABASE_YANDEX_PROVIDER_ID=custom:yandex  # опционально; id custom provider в Supabase
```

Для OAuth через Supabase:
- в Supabase Auth включён Google Provider с Client ID/Secret;
- Яндекс подключён как **Custom Auth Provider** с provider id `custom:yandex`;
- в OAuth-приложениях Google/Яндекс redirect URI указывает на Supabase callback:
  `https://<project-ref>.supabase.co/auth/v1/callback`;
- в Supabase Auth Redirect URLs добавлены app callbacks:
  `http://localhost:3000/auth/callback` для dev и `https://jobswiper.ru/auth/callback`
  для production.

`/api/auth/google` и `/api/auth/yandex` строят `redirectTo` из
`NEXT_PUBLIC_SITE_URL` / `SITE_URL` / `APP_URL` / Vercel URL, а только затем из
request origin. Это важно за reverse proxy: иначе OAuth может получить
`http://localhost:3000` и Supabase вернёт code на локальный URL вместо
production-домена. `/auth/callback` обменивает `code` на cookie-сессию и возвращает
пользователя на `next`, сохраняя query `auth=success|error` и `provider=google|yandex`.
`AuthCodeBridge` дополнительно подхватывает `?code=...` на клиенте, если внешний
редирект неожиданно пришёл не на `/auth/callback`.

Yandex Custom Provider:
- `Issuer URL`: `https://oauth.yandex.ru`;
- `Authorization URL`: `https://oauth.yandex.ru/authorize`;
- `Token URL`: `https://oauth.yandex.ru/token`;
- `Userinfo URL`: `https://login.yandex.ru/info`;
- `Scopes`: `login:info, login:email` (опционально `login:avatar`);
- `Allow users without email`: лучше включить для Яндекса. Яндекс отдаёт email как
  `default_email`/`emails`, а не как стандартное поле `email`; приложение достаёт
  эти данные из `identities[].identity_data` в `/api/auth/session`.

App-токен hh.ru кэшируется в таблице Supabase **`app_tokens`** (строка
`id = 'hh'`). См. раздел 5.

В **localStorage** хранится только анонимный `userId` устройства (ключ
`jobswiper-user-id`). После входа текущая cookie-сессия Supabase задаёт настоящий
`userId` (`auth.users.id`), а анонимные данные устройства мержатся в аккаунт.

---

## 4. Структура проекта

```
src/
├── app/
│   ├── layout.tsx            # корневой layout: шрифты, Providers, контейнер, нижняя навигация
│   ├── providers.tsx         # ThemeProvider + QueryClientProvider + Toaster
│   ├── globals.css           # токены темы (oklch) + кастомные утилиты
│   ├── page.tsx              # ГЛАВНАЯ — лента-свайпер
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
│   ├── paywall/               # Pro/paywall, лимит-диалог, временный gift +50 откликов
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

### Соискательский OAuth hh.ru (исследовано, пока не реализовано)
Текущий hh-токен — **application token** для серверного поиска вакансий. Он не
даёт доступ к резюме пользователя и не позволяет откликаться от его имени.

Для импорта резюме hh.ru нужен отдельный пользовательский OAuth:
- `GET https://hh.ru/oauth/authorize` с `response_type=code`, `client_id`,
  `redirect_uri`, `state` и желательно PKCE (`code_challenge`, `S256`);
- `POST https://api.hh.ru/token` с `grant_type=authorization_code` для обмена
  кода на `access_token`/`refresh_token`;
- `GET https://api.hh.ru/me` для проверки токена и получения `resumes_url`;
- затем `GET /resumes/mine` и `GET /resumes/{resume_id}` для получения резюме.

Архитектурно это лучше делать как «Подключить hh.ru» в личном кабинете, а не как
замену Supabase Auth: Supabase остаётся основной авторизацией пользователя, а
hh.ru OAuth хранится отдельной связкой токенов, привязанной к `auth.users.id`.
Refresh token у hh.ru одноразовый, поэтому его надо обновлять только после
истечения access token и сразу перезаписывать в БД.

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
| `/api/auth/yandex` | GET | `next` query | редирект на Яндекс OAuth через Supabase custom provider |
| `/auth/callback` | GET | `code`, `next`, `provider` query | обмен code на cookie-сессию, редирект обратно |
| `/api/auth/session` | GET | — | `{ user }` по verified `auth.getUser()` |
| `/api/auth/sign-out` | POST | — | выход из Supabase-сессии |
| `/api/db/quota` | PUT | `{ quota, bonusClaimed }` | сохранить usage-лимиты и флаг бонуса |

Нюансы:
- **`/api/match`** ограничивает батч 10 вакансиями, клампит `score` в 0–100,
  возвращает результат для каждой запрошенной вакансии в том же порядке (`ok=false`,
  если модель что-то пропустила).
- **`/api/cover-letter`** универсален: если передан `vacancy.id` без `description`,
  он сам дотягивает полное описание через `getVacancy(id)`; если передан
  `description` напрямую (своя вакансия) — использует его.
- **`/api/parse-resume`** валидирует `experienceId` по белому списку и обрезает поля.
- **`/api/auth/yandex`** нормализует `SUPABASE_YANDEX_PROVIDER_ID`: `yandex`
  превращается в `custom:yandex`, пустое значение тоже даёт `custom:yandex`.

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
Supabase-сессия, bootstrap использует `auth.users.id`; если пользователь впервые
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
- бесплатный лимит: 10 откликов, 30 анализов вакансий, 3 разбора резюме;
- временный бонус из paywall: +50 откликов один раз (`bonus_claimed`);
- тарифы UI: «Неделя» 99 ₽ и «Месяц» 299 ₽.

Пока оплата не подключена, paywall не создаёт платёж, а выдаёт одноразовый бонус.
Расходы считаются в сторе и сохраняются в `users` через `/api/db/quota`. При merge
анонимного пользователя в авторизованный аккаунт берётся **большее** usage-значение,
чтобы сменой устройства нельзя было сбросить лимиты; `bonus_claimed` становится
`true`, если бонус был выдан хотя бы на одном из аккаунтов.

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
| `subscription_cta_click` | нажата CTA-кнопка тарифа/бонуса | монетизация |
| `limit_dialog_open` | открыт диалог исчерпанного лимита | монетизация |
| `vacancy_feed_error` | hh.ru/сервер не загрузил вакансии | диагностика |
| `cover_letter_error` | генерация письма завершилась ошибкой | диагностика |

---

## 9. Логика расчёта % соответствия (центральная)

Хук: [`src/lib/hooks/use-match-scores.ts`](src/lib/hooks/use-match-scores.ts).

Задача: посчитать % для верха колоды, **экономя токены ИИ**.

- **Окно** `WINDOW = 12`: оцениваем только ближайшие 12 неоценённых карточек.
- **Батч** `BATCH_SIZE = 6`: за один запрос отправляем до 6 вакансий → 1 ответ-массив.
- **По одному батчу за раз** (`inFlight.size > 0 → выходим`) — чтобы не спамить.
- **`attempted`-множество** на каждый `resumeContext`: вакансию пытаемся оценить
  **не более одного раза** — иначе при `ok=false` был бы бесконечный цикл запросов.
- Результаты кладутся в `store.matches` (persist), повторно не считаются.
- В скоринг идёт **`snippet`** (короткий тизер), а не полное описание — экономия
  токенов и запросов.
- Хук возвращает `loadingIds` — для спиннера в кольце текущей карточки.

При смене резюме `matches` очищается, окно/`attempted` сбрасываются, всё считается
заново под новое резюме.

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
неоценённых карточек, и лишь затем приезжали свежие. Плюс окно скоринга (`WINDOW=12`)
оценивает не весь буфер — часть карточек показывалась вообще без %.

### Ключевой принцип (и почему именно так)
Запросы к hh.ru **бесплатны**, а ИИ-скоринг **платный и ограничен квотой анализов**
(`FREE_LIMITS.analyses = 30`, см. [`plans.ts`](src/lib/plans.ts), раздел 8.2).
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
  суммарный расход ИИ по-прежнему упирается в те же 30 анализов на резюме.

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
  └─ /api/auth/google или /api/auth/yandex
       └─ Supabase OAuth provider ─→ /auth/callback?code=...
            └─ exchangeCodeForSession ─→ cookie-session + /api/db/merge

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
   анонимный `userId`; при входе используется Supabase Auth user id. Доступ к БД —
   только через серверные `/api/db/*` (раздел 8.1).
9. **Supabase Auth:** Google — встроенный провайдер, Яндекс — custom provider
   `custom:yandex`; использовать `@supabase/ssr`, `proxy.ts`, `getAll/setAll`
   cookies и verified `auth.getUser()`; не использовать deprecated auth-helpers.
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

- Ужесточить RLS-политики под финальную модель гостевого/авторизованного доступа.
- Подключить hh.ru OAuth соискателя: импорт резюме из `/resumes/mine`, хранение
  access/refresh token, refresh-flow.
- Стриминг сопроводительного письма (token-by-token).
- Реальный отклик на hh.ru через соискательский OAuth (`POST /negotiations`).
- Реальные платежи вместо временного бонуса +50 откликов.
- Больше фильтров (профroles, индустрии, метро), сохранённые поиски.
- Кэш оценок с TTL и инвалидация по версии резюме.
```
