import "server-only";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// gpt-oss-120b:free is the primary; the rest are free fallbacks OpenRouter
// will try (in order) if the primary errors or is rate-limited.
export const FREE_MODELS = [
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "z-ai/glm-4.5-air:free",
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  models?: string[];
  signal?: AbortSignal;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the OpenRouter chat completions endpoint and returns the assistant text.
 * Handles the free-tier quirks: model fallback array, 429/503 retry with backoff,
 * and the case where OpenRouter returns HTTP 200 with an `error` body.
 */
export async function chatCompletion(opts: ChatOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY не настроен на сервере", 500);
  }

  const body = JSON.stringify({
    models: opts.models ?? FREE_MODELS,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 800,
  });

  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://jobswiper.local",
          "X-Title": "JobSwiper",
        },
        body,
        signal: opts.signal,
        cache: "no-store",
      });

      // Rate limited / provider unavailable — back off and retry.
      if (res.status === 429 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 800 * 2 ** attempt + Math.random() * 300;
        lastErr = new OpenRouterError("Сервис ИИ перегружен, повтор...", res.status);
        if (attempt < maxAttempts - 1) {
          await sleep(Math.min(wait, 4000));
          continue;
        }
        throw lastErr;
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json?.error?.message ?? `OpenRouter ответил ${res.status}`;
        throw new OpenRouterError(msg, res.status);
      }
      // OpenRouter can return 200 with an error body.
      if (json?.error) {
        throw new OpenRouterError(
          json.error.message ?? "Ошибка ИИ-провайдера",
          json.error.code ?? 502,
        );
      }

      const content: string | undefined = json?.choices?.[0]?.message?.content;
      if (!content) {
        throw new OpenRouterError("Пустой ответ от модели", 502);
      }
      return content;
    } catch (err) {
      lastErr = err;
      // Network blips: retry; explicit OpenRouterError (non-429): rethrow.
      if (err instanceof OpenRouterError) throw err;
      if (attempt < maxAttempts - 1) {
        await sleep(600 * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new OpenRouterError("Не удалось получить ответ ИИ", 502);
}

/**
 * Defensively extract a JSON value from an LLM response that may be wrapped in
 * markdown fences or surrounded by prose. Returns null if nothing parses.
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;

  // 1. Try direct parse.
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // 2. Strip ```json ... ``` fences.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // 3. Grab the first balanced {...} or [...] block.
  const start = trimmed.search(/[[{]/);
  if (start !== -1) {
    const open = trimmed[start];
    const close = open === "{" ? "}" : "]";
    const end = trimmed.lastIndexOf(close);
    if (end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // continue
      }
    }
  }
  return null;
}
