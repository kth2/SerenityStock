// Optional BYOK (bring-your-own-key) AI research for tickers and themes
// outside the curated knowledge base.
//
// Design contract:
// - The user's API endpoint, key, and model are configured in the UI and live
//   ONLY in this browser's localStorage. Calls go directly from the browser to
//   the configured provider. Nothing is committed, proxied, or logged.
// - Two wire protocols cover practically every provider:
//     "gemini"  → Google Generative Language API (free tier, browser-friendly)
//     "openai"  → OpenAI-compatible /chat/completions (OpenRouter, Groq,
//                 OpenAI, DeepSeek, Mistral, local Ollama/LM Studio, …)
// - The LLM is prompted with the bundled SKILL.md + evidence ladder and asked
//   for qualitative research plus 0-5 factor/penalty RATINGS as strict JSON.
//   The bottleneck score itself is always computed locally by scorecard.ts,
//   so the methodology math stays canonical no matter which model runs.
// - No live search grounding → every output is labeled AI research /
//   unverified and keeps the skill's next-verification-steps discipline.

import skillMd from "../../../skill/SKILL.md?raw";
import evidenceLadder from "../../../skill/references/evidence-ladder.md?raw";
import type {
  EvidenceItem,
  SerenityAnalysis,
  ThemeAnalysis,
  TickerAggregate,
} from "@/types";
import { buildAiInfraChain } from "./knowledge";
import { FACTOR_WEIGHTS, PENALTY_LABELS, scoreCard } from "./scorecard";

/* ----------------------------------------------------------- config ------ */

export type AiProtocol = "gemini" | "openai";

export interface AiConfig {
  protocol: AiProtocol;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Per-run options: output language and an optional live-price context block. */
export interface AiRunOptions {
  /** When "zh", the model is told to write all prose fields in Chinese. */
  lang?: "en" | "zh";
  /** Formatted live-price text to append to the prompt (see livedata.ts). */
  live?: string;
}

export interface AiPreset {
  id: string;
  label: string;
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  keyHint: string;
}

export const AI_PRESETS: AiPreset[] = [
  {
    id: "gemini",
    label: "Google Gemini (free tier)",
    protocol: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-flash-lite-latest",
    keyHint: "Free key from aistudio.google.com → Get API key",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.5-flash-lite",
    keyHint: "Key from openrouter.ai/keys (has free models)",
  },
  {
    id: "groq",
    label: "Groq (free tier)",
    protocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyHint: "Free key from console.groq.com",
  },
  {
    id: "openai",
    label: "OpenAI",
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyHint: "Key from platform.openai.com (paid)",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    protocol: "openai",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    keyHint: "No key needed; start Ollama with OLLAMA_ORIGINS set",
  },
  {
    id: "custom",
    label: "Custom endpoint…",
    protocol: "openai",
    baseUrl: "",
    model: "",
    keyHint: "Any OpenAI-compatible or Gemini-compatible endpoint",
  },
];

const CONFIG_KEY = "serenity.aiConfig.v2";
const LEGACY_KEY = "serenity.aiConfig.v1";
const KEYCHAIN_KEY = "serenity.aiKeys.v1";

const normUrl = (u: string) => u.trim().replace(/\/+$/, "").toLowerCase();

/** Per-endpoint API keys: each API URL remembers its own key. */
export function loadKeychain(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEYCHAIN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getKeyForUrl(baseUrl: string): string {
  if (!baseUrl.trim()) return "";
  return loadKeychain()[normUrl(baseUrl)] ?? "";
}

export function rememberKey(baseUrl: string, apiKey: string) {
  if (!baseUrl.trim()) return;
  try {
    const chain = loadKeychain();
    const k = normUrl(baseUrl);
    if (apiKey.trim()) chain[k] = apiKey.trim();
    else delete chain[k];
    localStorage.setItem(KEYCHAIN_KEY, JSON.stringify(chain));
  } catch {
    /* storage blocked */
  }
}

export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const p = JSON.parse(raw) as AiConfig;
      if (p.baseUrl && p.model) return p;
    }
    // Migrate the earlier Gemini-only config shape.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const p = JSON.parse(legacy) as { apiKey?: string; model?: string };
      if (p.apiKey) {
        const migrated: AiConfig = {
          protocol: "gemini",
          baseUrl: AI_PRESETS[0].baseUrl,
          apiKey: p.apiKey,
          model: p.model || AI_PRESETS[0].model,
        };
        saveAiConfig(migrated);
        return migrated;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAiConfig(config: AiConfig | null) {
  try {
    if (config?.baseUrl && config.model) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      // Keep the per-endpoint keychain in sync so switching providers later
      // recalls the right key for each API URL.
      rememberKey(config.baseUrl, config.apiKey);
    } else {
      localStorage.removeItem(CONFIG_KEY);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Ready to make calls? Local endpoints may legitimately have no key. */
export function aiConfigured(config: AiConfig | null): config is AiConfig {
  return Boolean(config && config.baseUrl && config.model);
}

/* ----------------------------------------------------------- client ------ */

const FACTOR_KEYS = Object.keys(FACTOR_WEIGHTS);
const PENALTY_KEYS = Object.keys(PENALTY_LABELS);
const LAYER_NAMES = [
  "Downstream demand", "System integrators", "Modules & subsystems",
  "Chips & devices", "Process & packaging", "Equipment & testing",
  "Materials & consumables", "Physical infrastructure",
];

function systemPrompt(): string {
  return [
    "You are an investment research agent running the Serenity Skill — a",
    "supply-chain bottleneck research methodology. Follow it exactly.",
    "",
    "=== SKILL.md ===",
    skillMd,
    "",
    "=== references/evidence-ladder.md ===",
    evidenceLadder,
    "",
    "Constraints for this run:",
    "- You have NO live tools. Answer from your knowledge, and grade every",
    "  evidence item honestly on the ladder (primary/media/analysis/social/rumor).",
    "  Anything you cannot anchor to a rememberable public source must be",
    "  marked strength 'rumor' or omitted. Never invent filings, contracts,",
    "  customers, prices, or market caps.",
    "- Ratings are integers 0-5 (0 = absent, 5 = very strong), calibrated per",
    "  the bottleneck scorecard. Do NOT compute a total score — the app does.",
    "- Research support only; no buy/sell language.",
    "- Respond with STRICT JSON only, matching the schema in the user message.",
    "  No markdown fences, no commentary outside the JSON.",
  ].join("\n");
}

export class AiError extends Error {}

function friendlyHttpError(status: number, detail: string, config: AiConfig): AiError {
  if (status === 401 || (status === 400 && /api key/i.test(detail)))
    return new AiError("Invalid or missing API key — check it in AI settings.");
  if (status === 404)
    return new AiError(`Model or endpoint not found (model "${config.model}") — check AI settings.`);
  if (status === 429)
    return new AiError("Rate limit hit on your provider's tier — wait a bit and try again.");
  return new AiError(`AI provider error: ${detail || `HTTP ${status}`}`);
}

async function post(url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal) {
  try {
    return await fetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new AiError(
      "Could not reach the AI endpoint — check the URL, your connection, and that the provider allows browser (CORS) access.",
    );
  }
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof body.error === "string") return body.error;
    return body.error?.message ?? body.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function callGemini(config: AiConfig, user: string, signal?: AbortSignal): Promise<string> {
  const base = config.baseUrl.replace(/\/+$/, "");
  const url = `${base}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const res = await post(
    url,
    {},
    {
      system_instruction: { parts: [{ text: systemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    },
    signal,
  );
  if (!res.ok) throw friendlyHttpError(res.status, await errorDetail(res), config);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

async function callOpenAi(config: AiConfig, user: string, signal?: AbortSignal): Promise<string> {
  const base = config.baseUrl.replace(/\/+$/, "");
  const url = `${base}/chat/completions`;
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const bodyBase = {
    model: config.model,
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: user },
    ],
  };

  // Try JSON mode first; some compatible providers reject response_format,
  // so retry once without it on a 400.
  let res = await post(url, headers, { ...bodyBase, response_format: { type: "json_object" } }, signal);
  if (res.status === 400) {
    const detail = await errorDetail(res);
    if (/response_format|json_object/i.test(detail)) {
      res = await post(url, headers, bodyBase, signal);
    } else {
      throw friendlyHttpError(400, detail, config);
    }
  }
  if (!res.ok) throw friendlyHttpError(res.status, await errorDetail(res), config);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callModel(config: AiConfig, user: string, signal?: AbortSignal): Promise<unknown> {
  const text =
    config.protocol === "gemini"
      ? await callGemini(config, user, signal)
      : await callOpenAi(config, user, signal);
  if (!text) throw new AiError("Empty response from the model.");
  // Strip markdown fences defensively; find the outermost JSON object.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start)
    throw new AiError("Model returned no JSON — try again or a larger model.");
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AiError("Model returned malformed JSON — try again or a larger model.");
  }
}

/** Cheap connectivity test for the settings panel. */
export async function testAiConnection(config: AiConfig): Promise<void> {
  const result = (await callModel(
    config,
    'Reply with STRICT JSON exactly: {"ok": true}',
  )) as { ok?: unknown };
  if (result?.ok !== true) throw new AiError("Endpoint responded, but not with the expected JSON.");
}

/* ------------------------------------------------------- sanitizers ------ */

const asStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v.trim() : fallback;
const asStrList = (v: unknown, max = 8): string[] =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, max)
    : [];
const clampInt = (v: unknown, lo: number, hi: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : 0;
};
function ratings(v: unknown, keys: string[]): Record<string, number> {
  const src = (v ?? {}) as Record<string, unknown>;
  return Object.fromEntries(keys.map((k) => [k, clampInt(src[k], 0, 5)]));
}
const STRENGTHS = new Set(["primary", "media", "analysis", "social", "rumor"]);
function evidence(v: unknown): EvidenceItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      const strength = asStr(o.strength).toLowerCase();
      return {
        claim: asStr(o.claim),
        source: asStr(o.source),
        strength: (STRENGTHS.has(strength) ? strength : "rumor") as EvidenceItem["strength"],
      };
    })
    .filter((e) => e.claim)
    .slice(0, 6);
}

/** Build the optional prompt suffix (live-price context + language directive). */
function runSuffix(opts?: AiRunOptions): string {
  const parts: string[] = [];
  if (opts?.live) parts.push("", opts.live);
  if (opts?.lang === "zh") {
    parts.push(
      "",
      "IMPORTANT: Write every human-readable string field (names, sentences,",
      "rationales, notes, evidence claims, checks) in Simplified Chinese (简体中文).",
      "Keep ticker symbols, layer keys, and the JSON structure/keys unchanged.",
    );
  }
  return parts.length ? "\n" + parts.join("\n") : "";
}

/* --------------------------------------------------------- ticker -------- */

export async function aiAnalyzeTicker(
  config: AiConfig,
  ticker: string,
  agg?: TickerAggregate,
  signal?: AbortSignal,
  opts?: AiRunOptions,
): Promise<SerenityAnalysis> {
  const mentionCtx = agg
    ? `Tracked @aleabitoreddit mentions (social-tier signal only): ${agg.count} mentions, ` +
      `avg sentiment ${agg.avgSentiment} (${agg.sentimentLabel}).`
    : "No tracked social mentions for this ticker.";

  const user = [
    `Single-company challenge: $${ticker}. ${mentionCtx}`,
    "",
    "Return STRICT JSON with exactly these fields:",
    JSON.stringify({
      companyName:
        "string (official company name; if you do not recognize this ticker with confidence, set companyName to 'UNKNOWN')",
      whatItConstrains: "string — one-sentence answer to 'what exactly does this company constrain?'",
      chainPosition: "string — plain-language value-chain position",
      layer: `one of: ${LAYER_NAMES.join(" | ")}`,
      scarceLayers: ["subset of the same layer names that are scarce in this company's chain"],
      factors: Object.fromEntries(FACTOR_KEYS.map((k) => [k, "integer 0-5"])),
      factorNotes: { any_factor_key: "short note (only where a note adds signal)" },
      penalties: Object.fromEntries(PENALTY_KEYS.map((k) => [k, "integer 0-5"])),
      marketMayMiss: "string — what the market may not see clearly",
      evidence: [
        {
          claim: "string",
          source: "string — exact place to verify",
          strength: "primary|media|analysis|social|rumor",
        },
      ],
      weakeners: ["3-4 situations that would prove the idea weak or wrong"],
      nextChecks: ["3-4 concrete verification steps (filings, metrics, sources)"],
    }),
  ].join("\n") + runSuffix(opts);

  const raw = (await callModel(config, user, signal)) as Record<string, unknown>;

  const companyName = asStr(raw.companyName, ticker);
  if (companyName === "UNKNOWN") {
    throw new AiError(
      `The model does not recognize $${ticker} with confidence — no analysis is better than an invented one.`,
    );
  }

  const layer = LAYER_NAMES.includes(asStr(raw.layer)) ? asStr(raw.layer) : "Modules & subsystems";
  const scarceLayers = asStrList(raw.scarceLayers).filter((l) => LAYER_NAMES.includes(l));
  const factorNotes = Object.fromEntries(
    Object.entries((raw.factorNotes ?? {}) as Record<string, unknown>)
      .filter(([k, v]) => FACTOR_KEYS.includes(k) && typeof v === "string")
      .map(([k, v]) => [k, (v as string).trim()]),
  );

  const sc = scoreCard(
    ratings(raw.factors, FACTOR_KEYS),
    ratings(raw.penalties, PENALTY_KEYS),
    factorNotes,
  );

  return {
    ticker,
    companyName,
    generatedAt: new Date().toISOString(),
    mode: "ai",
    ai: { provider: config.protocol, model: config.model },
    whatItConstrains: asStr(raw.whatItConstrains, "Not established."),
    chainPosition: asStr(raw.chainPosition, "Chain position unverified."),
    chain: buildAiInfraChain(layer, scarceLayers),
    scarceLayers,
    ...sc,
    marketMayMiss: asStr(raw.marketMayMiss, "—"),
    evidence: evidence(raw.evidence),
    weakeners: asStrList(raw.weakeners),
    nextChecks: asStrList(raw.nextChecks),
  };
}

/* ---------------------------------------------------------- theme -------- */

export async function aiAnalyzeTheme(
  config: AiConfig,
  query: string,
  signal?: AbortSignal,
  opts?: AiRunOptions,
): Promise<ThemeAnalysis> {
  const user = [
    `Theme scan: "${query}". Rank the supply-chain layers before companies.`,
    "",
    "Return STRICT JSON with exactly these fields:",
    JSON.stringify({
      title: "string — short theme title",
      systemChange: "string — the technical/economic change and binding physical constraint",
      layers: [{ name: "string", rationale: "string", scarcity: "integer 0-3 (3 = tightest)" }],
      candidates: [
        {
          ticker: "string (public listing; omit private companies)",
          name: "string",
          role: "controls the scarce layer | supplies the scarce layer | benefits from the trend | weak control | mainly a story",
          whyRanked: "string",
          factors: Object.fromEntries(FACTOR_KEYS.map((k) => [k, "integer 0-5"])),
          penalties: Object.fromEntries(PENALTY_KEYS.map((k) => [k, "integer 0-5"])),
        },
      ],
      popularButLower: [{ name: "string — a popular/obvious area ranked lower", why: "string" }],
      evidencePaths: ["where the evidence lives (filings, orders, queues…)"],
      risks: ["what could prove the theme wrong"],
      nextChecks: ["concrete next research moves"],
    }),
    "",
    "4-6 layers, 3-6 candidates, at least one popularButLower entry.",
  ].join("\n") + runSuffix(opts);

  const raw = (await callModel(config, user, signal)) as Record<string, unknown>;

  const layers = (Array.isArray(raw.layers) ? raw.layers : [])
    .map((l) => {
      const o = (l ?? {}) as Record<string, unknown>;
      return {
        name: asStr(o.name),
        rationale: asStr(o.rationale),
        scarcity: clampInt(o.scarcity, 0, 3) as 0 | 1 | 2 | 3,
      };
    })
    .filter((l) => l.name)
    .slice(0, 8)
    .sort((a, b) => b.scarcity - a.scarcity);

  const priorities = (Array.isArray(raw.candidates) ? raw.candidates : [])
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      const sc = scoreCard(ratings(o.factors, FACTOR_KEYS), ratings(o.penalties, PENALTY_KEYS));
      return {
        ticker: asStr(o.ticker).replace(/^\$/, "").toUpperCase(),
        name: asStr(o.name),
        role: asStr(o.role, "unclassified"),
        whyRanked: asStr(o.whyRanked),
        score: sc.finalScore,
        verdict: sc.verdict,
      };
    })
    .filter((p) => p.ticker)
    .slice(0, 8)
    .sort((a, b) => b.score - a.score);

  const popularButLower = (Array.isArray(raw.popularButLower) ? raw.popularButLower : [])
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return { name: asStr(o.name), why: asStr(o.why) };
    })
    .filter((p) => p.name)
    .slice(0, 4);

  if (layers.length === 0)
    throw new AiError("Model returned no usable layer ranking — try again.");

  return {
    kind: "theme",
    query,
    title: asStr(raw.title, `Theme scan: ${query}`),
    generatedAt: new Date().toISOString(),
    isInitialPass: true,
    ai: { provider: config.protocol, model: config.model },
    systemChange: asStr(raw.systemChange, "—"),
    layers,
    priorities,
    popularButLower,
    evidencePaths: asStrList(raw.evidencePaths),
    risks: asStrList(raw.risks),
    nextChecks: asStrList(raw.nextChecks),
    note: "Generated by an AI model from its own knowledge, without live sources — every claim is unverified until checked against the listed evidence paths.",
  };
}
