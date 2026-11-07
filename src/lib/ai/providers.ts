import "server-only";
import type { ZodType } from "zod";

/**
 * Free-tier AI provider chain. Every provider speaks the OpenAI-compatible
 * chat-completions API. Providers are tried in order; if one is missing a key,
 * rate-limited, errors, times out, or returns invalid JSON, the next one runs.
 * If none succeed the caller falls back to the clearly labelled demo analyzer.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  keyEnv: string;
  modelEnv: string;
  defaultModel: string;
  extraHeaders?: Record<string, string>;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    extraHeaders: { "X-Title": "Infinity ZERO" },
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    keyEnv: "CEREBRAS_API_KEY",
    modelEnv: "CEREBRAS_MODEL",
    defaultModel: "llama-3.3-70b",
  },
];

/** Providers with a key set, in AI_PROVIDER_ORDER (comma list of ids) or default order. */
export function configuredProviders(): (ProviderConfig & { model: string })[] {
  const order = (process.env.AI_PROVIDER_ORDER || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const sorted = order.length
    ? [...PROVIDERS].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
    : PROVIDERS;
  return sorted
    .filter((p) => Boolean(process.env[p.keyEnv]))
    .map((p) => ({ ...p, model: process.env[p.modelEnv] || p.defaultModel }));
}

export interface ChainAttempt {
  provider: string;
  ok: boolean;
  error?: string;
}

export interface ChainResult<T> {
  data: T | null;
  provider?: string;
  model?: string;
  attempts: ChainAttempt[];
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Response was not valid JSON");
  }
}

export async function runJSONChain<T>(opts: {
  system: string;
  user: string;
  schema: ZodType<T>;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<ChainResult<T>> {
  const attempts: ChainAttempt[] = [];
  for (const p of configuredProviders()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 25000);
    try {
      const res = await fetch(p.baseUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env[p.keyEnv]}`,
          ...p.extraHeaders,
        },
        body: JSON.stringify({
          model: p.model,
          temperature: 0.2,
          max_tokens: opts.maxTokens ?? 2500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
        }),
      });
      if (!res.ok) {
        const reason = res.status === 429 ? "rate limited" : `HTTP ${res.status}`;
        attempts.push({ provider: p.name, ok: false, error: reason });
        continue;
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        attempts.push({ provider: p.name, ok: false, error: "empty response" });
        continue;
      }
      const parsed = opts.schema.safeParse(extractJSON(content));
      if (!parsed.success) {
        attempts.push({ provider: p.name, ok: false, error: "response failed schema validation" });
        continue;
      }
      attempts.push({ provider: p.name, ok: true });
      return { data: parsed.data, provider: p.name, model: p.model, attempts };
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "AbortError" ? "timed out" : e.message) : "unknown error";
      attempts.push({ provider: p.name, ok: false, error: msg });
    } finally {
      clearTimeout(timer);
    }
  }
  return { data: null, attempts };
}
