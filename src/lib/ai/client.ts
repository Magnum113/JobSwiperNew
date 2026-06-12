import "server-only";

// AITunnel exposes an OpenAI-compatible chat/completions endpoint backed by
// Mistral. We keep this thin fetch wrapper (instead of the OpenAI SDK) for the
// retry/backoff + defensive JSON handling the app relies on.
const AI_URL = "https://api.aitunnel.ru/v1/chat/completions";

// Mistral model served by AITunnel (~128k context). Override with AI_MODEL.
// Small 3.2 (24B) вместо nemo (12B): заметно лучше следует правилам матчинга
// («только факты из резюме») при марже тарифов ~79–83% (см. PRICING.md).
export const DEFAULT_MODEL =
  process.env.AI_MODEL ?? "mistral-small-3.2-24b-instruct";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  signal?: AbortSignal;
}

export class AIError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AIError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the AITunnel (Mistral) chat completions endpoint and returns the
 * assistant text. Retries 429/503 with backoff and tolerates the case where the
 * provider returns HTTP 200 with an `error` body.
 */
export async function chatCompletion(opts: ChatOptions): Promise<string> {
  const apiKey = process.env.AITUNNEL_API_KEY;
  if (!apiKey) {
    throw new AIError("AITUNNEL_API_KEY не настроен на сервере", 500);
  }

  const body = JSON.stringify({
    model: opts.model ?? DEFAULT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 800,
  });

  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
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
        lastErr = new AIError("Сервис ИИ перегружен, повтор...", res.status);
        if (attempt < maxAttempts - 1) {
          await sleep(Math.min(wait, 4000));
          continue;
        }
        throw lastErr;
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json?.error?.message ?? `AITunnel ответил ${res.status}`;
        throw new AIError(msg, res.status);
      }
      // The endpoint can return 200 with an error body.
      if (json?.error) {
        throw new AIError(
          json.error.message ?? "Ошибка ИИ-провайдера",
          json.error.code ?? 502,
        );
      }

      const content: string | undefined = json?.choices?.[0]?.message?.content;
      if (!content) {
        throw new AIError("Пустой ответ от модели", 502);
      }
      return content;
    } catch (err) {
      lastErr = err;
      // Network blips: retry; explicit AIError (non-429): rethrow.
      if (err instanceof AIError) throw err;
      if (attempt < maxAttempts - 1) {
        await sleep(600 * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new AIError("Не удалось получить ответ ИИ", 502);
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
