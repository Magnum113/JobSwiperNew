import type { ChatMessage } from "./openrouter";

export function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max) + "…";
}

/* ----------------------------- Resume parsing ----------------------------- */

export function buildResumeParseMessages(resumeText: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "Ты — карьерный ассистент. Анализируешь резюме и извлекаешь структурированные данные. " +
        "Отвечай ТОЛЬКО валидным минифицированным JSON-объектом, без markdown, без пояснений и без обрамляющего текста.",
    },
    {
      role: "user",
      content:
        `Резюме кандидата:\n"""${truncate(resumeText, 6000)}"""\n\n` +
        "Извлеки данные и верни строго такой JSON:\n" +
        `{"title":"<основная профессия для поиска вакансий, коротко, как в заголовке вакансии, например 'Frontend-разработчик' или 'Менеджер по продажам'>",` +
        `"skills":[<до 15 ключевых навыков строками>],` +
        `"seniority":"<один из: Стажёр, Junior, Middle, Senior, Lead>",` +
        `"summary":"<одно ёмкое предложение о кандидате на русском>",` +
        `"experienceId":"<один из: noExperience, between1And3, between3And6, moreThan6>"}`,
    },
  ];
}

/* ------------------------------ Batch matching ---------------------------- */

export interface MatchVacancyInput {
  id: string;
  name: string;
  company: string;
  info: string; // snippet or short description
  experience?: string;
}

export function buildMatchMessages(
  resumeContext: string,
  vacancies: MatchVacancyInput[],
): ChatMessage[] {
  const list = vacancies.map((v) => ({
    id: v.id,
    name: v.name,
    company: v.company,
    experience: v.experience ?? "",
    info: truncate(v.info, 600),
  }));

  return [
    {
      role: "system",
      content:
        "Ты — опытный технический рекрутер. Оцениваешь, насколько резюме кандидата соответствует вакансии. " +
        "Учитывай совпадение навыков, уровня и роли, релевантность опыта и требований. " +
        "Отвечай ТОЛЬКО валидным минифицированным JSON-массивом, без markdown и без пояснений.",
    },
    {
      role: "user",
      content:
        `РЕЗЮМЕ КАНДИДАТА:\n"""${truncate(resumeContext, 4000)}"""\n\n` +
        `ВАКАНСИИ (JSON):\n${JSON.stringify(list)}\n\n` +
        "Для КАЖДОЙ вакансии оцени соответствие резюме числом от 0 до 100. " +
        "Верни массив строго в таком формате, сохраняя те же id:\n" +
        `[{"id":"<id>","score":<целое 0-100>,"strengths":[<1-3 сильные стороны кандидата под эту вакансию, кратко>],` +
        `"gaps":[<0-3 чего не хватает, кратко>],"summary":"<одно предложение-вывод по-русски>"}]\n` +
        "Только JSON-массив, никакого другого текста.",
    },
  ];
}

/* ----------------------------- Cover letter ------------------------------- */

export interface CoverLetterVacancyInput {
  name: string;
  company: string;
  description: string;
}

export function buildCoverLetterMessages(
  resumeContext: string,
  vacancy: CoverLetterVacancyInput,
): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "Ты — сильный карьерный консультант. Пишешь убедительные, конкретные сопроводительные письма на русском языке от первого лица. " +
        "Пишешь живо и по делу, без канцелярита и клише.",
    },
    {
      role: "user",
      content:
        "Напиши сопроводительное письмо для отклика на вакансию на hh.ru.\n\n" +
        `РЕЗЮМЕ КАНДИДАТА:\n"""${truncate(resumeContext, 4000)}"""\n\n` +
        `ВАКАНСИЯ:\nДолжность: ${vacancy.name}\nКомпания: ${vacancy.company}\n` +
        `Описание: """${truncate(vacancy.description, 4000)}"""\n\n` +
        "Требования к письму:\n" +
        "— на русском языке, от первого лица;\n" +
        "— 150–220 слов, 3–4 коротких абзаца;\n" +
        "— начни со 'Здравствуйте!' (имя адресата неизвестно);\n" +
        "— свяжи конкретный опыт и навыки из резюме с требованиями вакансии;\n" +
        "— не выдумывай факты, которых нет в резюме;\n" +
        "— заверши вежливым призывом к действию;\n" +
        "— без markdown и заголовков, верни ТОЛЬКО текст письма.",
    },
  ];
}
